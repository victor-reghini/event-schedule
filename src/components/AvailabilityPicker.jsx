import React, { useState } from 'react';
import { Check, X, HelpCircle, Save, Sparkles, MessageSquare } from 'lucide-react';
import { minutesToTime, timeToMinutes } from '../services/schedulerAlgorithm';

export default function AvailabilityPicker({
  event,
  currentUser,
  onSaveAvailability
}) {
  const [selectedDate, setSelectedDate] = useState(event.dates[0] || '');
  
  // Encontra ou inicializa o participante atual no evento
  const participantData = event.participants.find(p => p.id === currentUser.id) || {
    availabilities: {},
    suggestions: []
  };

  const [currentAvailabilities, setCurrentAvailabilities] = useState({
    ...participantData.availabilities
  });

  const [suggestionNote, setSuggestionNote] = useState(
    (participantData.suggestions && participantData.suggestions[0]) || ''
  );

  const [hasSaved, setHasSaved] = useState(false);

  // Gera a lista de horários do evento para o dia
  const generateSlots = () => {
    const { start = '09:00', end = '22:00', step = 60 } = event.timeRange || {};
    const startMins = timeToMinutes(start);
    const endMins = timeToMinutes(end);
    const slots = [];

    for (let m = startMins; m < endMins; m += step) {
      slots.push(minutesToTime(m));
    }
    return slots;
  };

  const daySlots = generateSlots();

  // Alterna o status do slot ao clicar:
  // neutral -> available -> maybe -> unavailable -> neutral
  const toggleSlotStatus = (timeStr) => {
    const key = `${selectedDate}_${timeStr}`;
    const current = currentAvailabilities[key] || 'neutral';

    let next = 'available';
    if (current === 'neutral') next = 'available';
    else if (current === 'available') next = 'maybe';
    else if (current === 'maybe') next = 'unavailable';
    else if (current === 'unavailable') next = 'neutral';

    setCurrentAvailabilities(prev => ({
      ...prev,
      [key]: next
    }));
    setHasSaved(false);
  };

  // Preenchimentos rápidos
  const handleQuickFill = (type) => {
    const updated = { ...currentAvailabilities };
    daySlots.forEach(timeStr => {
      const key = `${selectedDate}_${timeStr}`;
      const mins = timeToMinutes(timeStr);

      if (type === 'all-free') {
        updated[key] = 'available';
      } else if (type === 'afternoon') {
        // 13:00 às 18:00
        if (mins >= 13 * 60 && mins < 18 * 60) {
          updated[key] = 'available';
        }
      } else if (type === 'evening') {
        // 18:00 às 22:00
        if (mins >= 18 * 60) {
          updated[key] = 'available';
        }
      } else if (type === 'clear') {
        delete updated[key];
      }
    });

    setCurrentAvailabilities(updated);
    setHasSaved(false);
  };

  const handleSave = () => {
    onSaveAvailability({
      userId: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      avatar: currentUser.avatar,
      availabilities: currentAvailabilities,
      suggestions: suggestionNote ? [suggestionNote] : []
    });
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 3000);
  };

  const formatDateTab = (dateStr) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return {
        weekday: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        day: date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      };
    } catch {
      return { weekday: 'Dia', day: dateStr };
    }
  };

  return (
    <div className="availability-picker-panel">
      <div className="availability-step-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            Marcar Minha Disponibilidade
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Clique sobre os horários para alternar entre <strong>Disponível</strong>, <strong>Talvez</strong> ou <strong>Indisponível</strong>.
          </p>
        </div>

        <div className="legend-group">
          <div className="legend-item">
            <span className="legend-dot available"></span>
            <span>Disponível</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot maybe"></span>
            <span>Talvez</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot unavailable"></span>
            <span>Indisponível</span>
          </div>
        </div>
      </div>

      {/* Tabs com os Dias do Evento */}
      <div className="date-selector-row">
        {event.dates.map(dateStr => {
          const info = formatDateTab(dateStr);
          const isActive = selectedDate === dateStr;
          return (
            <button
              key={dateStr}
              className={`date-tab ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedDate(dateStr)}
            >
              <div className="date-tab-weekday">{info.weekday}</div>
              <div className="date-tab-day">{info.day}</div>
            </button>
          );
        })}
      </div>

      {/* Barra de Ações Rápidas */}
      <div className="quick-fill-bar">
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
          Preencher rápido neste dia:
        </span>
        <button className="quick-btn" onClick={() => handleQuickFill('all-free')}>
          Livre o dia todo
        </button>
        <button className="quick-btn" onClick={() => handleQuickFill('afternoon')}>
          Tarde (13h - 18h)
        </button>
        <button className="quick-btn" onClick={() => handleQuickFill('evening')}>
          Noite (18h+)
        </button>
        <button className="quick-btn" onClick={() => handleQuickFill('clear')}>
          Limpar dia
        </button>
      </div>

      {/* Grid de Horários em Estilo Calendly */}
      <div className="time-slots-grid">
        {daySlots.map(timeStr => {
          const key = `${selectedDate}_${timeStr}`;
          const status = currentAvailabilities[key] || 'neutral';

          let statusLabel = 'Clique p/ marcar';
          if (status === 'available') statusLabel = 'Disponível ✓';
          if (status === 'maybe') statusLabel = 'Talvez ~';
          if (status === 'unavailable') statusLabel = 'Ocupado ✗';

          return (
            <button
              key={timeStr}
              className={`slot-btn status-${status}`}
              onClick={() => toggleSlotStatus(timeStr)}
            >
              <span>{timeStr}</span>
              <span className="slot-status-label">{statusLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Sugestões de novos dias/horários e comentários */}
      <div className="participant-notes-box">
        <label htmlFor="notes">
          <MessageSquare size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
          Alguma sugestão de outro dia, horário ou preferência?
        </label>
        <textarea
          id="notes"
          placeholder="Ex: 'Prefiro sábado à noite', 'Se for domingo só consigo até as 17h', 'Sugiro também a próxima sexta'..."
          value={suggestionNote}
          onChange={(e) => {
            setSuggestionNote(e.target.value);
            setHasSaved(false);
          }}
        />
      </div>

      {/* Botão de Salvar Disponibilidade */}
      <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem' }}>
        {hasSaved && (
          <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Check size={16} /> Respostas salvas com sucesso!
          </span>
        )}
        <button 
          className="btn-primary"
          onClick={handleSave}
          style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}
        >
          <Save size={18} />
          Salvar Minha Disponibilidade
        </button>
      </div>
    </div>
  );
}
