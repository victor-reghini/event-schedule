import React, { useState } from 'react';
import { X, Sparkles, MapPin, Video, Lock, Globe, Calendar, Clock, Plus, Trash2, CalendarRange, CheckSquare } from 'lucide-react';
import { EVENT_PRESETS, DURATION_OPTIONS } from '../services/templates';

// Gera lista de datas YYYY-MM-DD entre duas datas (inclusive)
function generateDateRangeList(startDateStr, endDateStr) {
  const result = [];
  let curr = new Date(startDateStr + 'T00:00:00');
  const end = new Date(endDateStr + 'T00:00:00');

  while (curr <= end) {
    result.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return result;
}

export default function EventCreatorModal({
  currentUser,
  onClose,
  onCreateEvent
}) {
  const [selectedPreset, setSelectedPreset] = useState(EVENT_PRESETS[0]);
  const [title, setTitle] = useState(EVENT_PRESETS[0].title);
  const [description, setDescription] = useState(EVENT_PRESETS[0].description);
  const [duration, setDuration] = useState(EVENT_PRESETS[0].duration);
  const [locationType, setLocationType] = useState(EVENT_PRESETS[0].locationType);
  const [locationDetails, setLocationDetails] = useState(EVENT_PRESETS[0].defaultLocation || '');
  const [privacy, setPrivacy] = useState('public'); // 'public' | 'private'
  const [allowLocationSuggestions, setAllowLocationSuggestions] = useState(true);

  // Modo de definição de datas: 'range' (período contínuo) ou 'specific' (dias específicos)
  const [dateMode, setDateMode] = useState('range');

  const today = new Date();
  const defaultStartDate = new Date(today);
  defaultStartDate.setDate(today.getDate() + 3);
  const defaultEndDate = new Date(today);
  defaultEndDate.setDate(today.getDate() + 7);

  const [rangeStart, setRangeStart] = useState(defaultStartDate.toISOString().split('T')[0]);
  const [rangeEnd, setRangeEnd] = useState(defaultEndDate.toISOString().split('T')[0]);

  // Lista de dias específicos
  const [specificDates, setSpecificDates] = useState([
    defaultStartDate.toISOString().split('T')[0],
    defaultEndDate.toISOString().split('T')[0]
  ]);
  const [newDateInput, setNewDateInput] = useState('');

  // Sugestão de horário ideal
  const [suggestedStartTime, setSuggestedStartTime] = useState('14:00');
  const [suggestedEndTime, setSuggestedEndTime] = useState('18:00');

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    setTitle(preset.title);
    setDescription(preset.description);
    setDuration(preset.duration);
    setLocationType(preset.locationType);
    setLocationDetails(preset.defaultLocation);
  };

  const handleAddSpecificDate = () => {
    if (newDateInput && !specificDates.includes(newDateInput)) {
      setSpecificDates([...specificDates, newDateInput].sort());
      setNewDateInput('');
    }
  };

  const handleRemoveSpecificDate = (dateToRemove) => {
    if (specificDates.length > 1) {
      setSpecificDates(specificDates.filter(d => d !== dateToRemove));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalDates = [];
    if (dateMode === 'range') {
      if (rangeStart > rangeEnd) {
        alert('A data de início do período deve ser anterior ou igual à data de término.');
        return;
      }
      finalDates = generateDateRangeList(rangeStart, rangeEnd);
    } else {
      finalDates = specificDates;
    }

    if (!finalDates.length) {
      alert('Selecione ao menos um dia para o evento.');
      return;
    }

    const newEvent = {
      id: `evt-${Date.now()}`,
      title,
      type: selectedPreset.id,
      emoji: selectedPreset.emoji,
      description,
      organizer: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatar: currentUser.avatar
      },
      locationType,
      locationDetails,
      allowLocationSuggestions,
      locationSuggestions: [],
      duration: Number(duration),
      dateMode,
      dateRange: dateMode === 'range' ? { start: rangeStart, end: rangeEnd } : null,
      suggestedTimeWindow: { start: suggestedStartTime, end: suggestedEndTime },
      dates: finalDates,
      timeRange: { start: '08:00', end: '23:00', step: 60 },
      privacy,
      status: 'voting',
      confirmedSlot: null,
      participants: [
        {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          avatar: currentUser.avatar,
          availabilities: {},
          suggestions: []
        }
      ],
      createdAt: new Date().toISOString()
    };

    onCreateEvent(newEvent);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
              Novo Agendamento
            </div>
            <h2 className="modal-title">Criar Evento ou Reunião</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Presets Rápidos */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={16} color="var(--primary)" />
              Sugestões Rápidas de Eventos:
            </label>
            <div className="presets-grid">
              {EVENT_PRESETS.map(preset => {
                const isActive = selectedPreset.id === preset.id;
                return (
                  <div
                    key={preset.id}
                    className={`preset-chip ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectPreset(preset)}
                  >
                    <div className="preset-emoji">{preset.emoji}</div>
                    <div className="preset-title">{preset.title}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Nome do Evento */}
          <div className="form-group">
            <label className="form-label">Nome do Evento</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reencontro da Galera, Reunião de Equipe..."
              required
            />
          </div>

          {/* Duração & Localização */}
          <div className="modal-grid-2col">
            <div>
              <label className="form-label">
                <Clock size={15} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />
                Duração Esperada
              </label>
              <select
                className="form-input"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                {DURATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Formato</label>
              <select
                className="form-input"
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
              >
                <option value="presencial">📍 Presencial</option>
                <option value="online">💻 Online (Videoconferência)</option>
              </select>
            </div>
          </div>

          {/* Detalhes do Local */}
          <div className="form-group">
            <label className="form-label">
              {locationType === 'presencial' ? 'Endereço ou Local Sugerido Inicial' : 'Link da Chamada (Meet, Zoom, Teams)'}
            </label>
            <input
              type="text"
              className="form-input"
              value={locationDetails}
              onChange={(e) => setLocationDetails(e.target.value)}
              placeholder={locationType === 'presencial' ? 'Ex: Restaurante, Casa do Victor, Coworking...' : 'Ex: https://meet.google.com/xyz'}
            />
          </div>

          {/* Opção do Administrador: Abrir campo para sugestões de locais dos convidados */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.65rem 0.85rem',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.25rem'
          }}>
            <input
              type="checkbox"
              id="allowLocationSuggestions"
              checked={allowLocationSuggestions}
              onChange={(e) => setAllowLocationSuggestions(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)', flexShrink: 0 }}
            />
            <label htmlFor="allowLocationSuggestions" style={{ fontSize: '0.825rem', fontWeight: 600, color: '#166534', cursor: 'pointer', wordBreak: 'break-word' }}>
              Abrir campo de local para sugestões dos convidados (com votação para aprovar ou reprovar)
            </label>
          </div>

          {/* DEFINIÇÃO DO PERÍODO DO EVENTO (INTERVALO OU DIAS ESPECÍFICOS) */}
          <div className="form-group event-period-box">
            <label className="form-label" style={{ marginBottom: '0.65rem' }}>
              Como você deseja definir as datas sugeridas?
            </label>

            <div className="date-mode-toggle">
              <button
                type="button"
                className={`date-mode-btn ${dateMode === 'range' ? 'active' : ''}`}
                onClick={() => setDateMode('range')}
              >
                <CalendarRange size={16} />
                <span>Período Contínuo</span>
              </button>

              <button
                type="button"
                className={`date-mode-btn ${dateMode === 'specific' ? 'active' : ''}`}
                onClick={() => setDateMode('specific')}
              >
                <CheckSquare size={16} />
                <span>Dias Específicos</span>
              </button>
            </div>

            {dateMode === 'range' ? (
              <div>
                <div className="date-range-grid">
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Data de Início do Período
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Data de Término do Período
                    </label>
                    <input
                      type="date"
                      className="form-input"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {specificDates.map(dStr => (
                    <div 
                      key={dStr}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '0.35rem 0.65rem',
                        background: 'white',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}
                    >
                      <span>{dStr}</span>
                      {specificDates.length > 1 && (
                        <button 
                          type="button" 
                          onClick={() => handleRemoveSpecificDate(dStr)}
                          style={{ color: '#94a3b8', display: 'flex', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="add-date-row">
                  <input
                    type="date"
                    className="form-input"
                    value={newDateInput}
                    onChange={(e) => setNewDateInput(e.target.value)}
                  />
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={handleAddSpecificDate}
                  >
                    <Plus size={15} />
                    Adicionar Dia
                  </button>
                </div>
              </div>
            )}

            {/* Sugestão de Faixa de Horário */}
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>
                Sugestão de Horário Preferencial pelo Organizador
              </label>
              <div className="time-range-grid">
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>Das:</span>
                  <input
                    type="time"
                    className="form-input"
                    value={suggestedStartTime}
                    onChange={(e) => setSuggestedStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>Às:</span>
                  <input
                    type="time"
                    className="form-input"
                    value={suggestedEndTime}
                    onChange={(e) => setSuggestedEndTime(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#166534', background: '#ecfdf5', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
              💡 <strong>Não limitará os convidados:</strong> Este período e horários serão sugeridos a todos, mas os participantes poderão sugerir e marcar qualquer outro dia ou horário no calendário!
            </div>
          </div>

          {/* Descrição */}
          <div className="form-group">
            <label className="form-label">Descrição ou Recado para os Convidados</label>
            <textarea
              className="form-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione orientações para os participantes..."
            />
          </div>

          {/* Privacidade */}
          <div className="form-group">
            <label className="form-label">Visibilidade das Respostas e Sugestões</label>
            <div className="radio-cards-group">
              <div 
                className={`radio-card ${privacy === 'public' ? 'active' : ''}`}
                onClick={() => setPrivacy('public')}
              >
                <div className="radio-card-title">
                  <Globe size={16} color="var(--primary)" />
                  Público / Aberto
                </div>
                <div className="radio-card-desc">
                  Todos os participantes veem as disponibilidades e sugestões de todos.
                </div>
              </div>

              <div 
                className={`radio-card ${privacy === 'private' ? 'active' : ''}`}
                onClick={() => setPrivacy('private')}
              >
                <div className="radio-card-title">
                  <Lock size={16} color="#d97706" />
                  Privado / Confidencial
                </div>
                <div className="radio-card-desc">
                  Apenas você (organizador) terá acesso às respostas individuais.
                </div>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" style={{ padding: '0.65rem 1.5rem' }}>
              Criar e Gerar Link
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
