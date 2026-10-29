import React from 'react';
import { Sparkles, Calendar, Clock, CheckCircle2, AlertCircle, XCircle, Check, Award, MapPin } from 'lucide-react';
import { calculateBestSlots } from '../services/schedulerAlgorithm';
import confetti from 'canvas-confetti';
import { useI18n } from '../services/i18n';

export default function SmartSuggestions({
  event,
  isOrganizer,
  onConfirmSlot
}) {
  const { t, lang } = useI18n();
  const suggestions = calculateBestSlots(event, 5);

  const LOCALE_BY_LANG = {
    pt: 'pt-BR',
    en: 'en-US',
    es: 'es-ES',
    it: 'it-IT',
    fr: 'fr-FR'
  };

  const formatDateLabel = (dateStr) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString(LOCALE_BY_LANG[lang] || 'pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
      });
    } catch {
      return dateStr;
    }
  };

  const handleSelectSlot = (slot) => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    onConfirmSlot(slot);
  };

  if (!suggestions.length) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
        <Calendar size={48} style={{ opacity: 0.4, margin: '0 auto 1rem auto' }} />
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Ainda não há votos suficientes
        </h3>
        <p style={{ fontSize: '0.9rem', maxWidth: 440, margin: '0 auto' }}>
          Assim que os convidados começarem a marcar seus horários disponíveis, o algoritmo irá sugerir automaticamente as melhores combinações!
        </p>
      </div>
    );
  }

  return (
    <div className="smart-suggestions-section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={22} color="var(--primary)" />
            Sugestões Inteligentes do Algoritmo
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Calculado com base na duração de <strong>{Math.floor(event.duration / 60)}h{event.duration % 60 ? `${event.duration % 60}m` : ''}</strong> e disponibilidade de todos os {event.participants.length} participantes.
          </p>
        </div>
        <div style={{ fontSize: '0.8rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
          {suggestions.length} opções ranqueadas
        </div>
      </div>

      <div className="suggestions-grid">
        {suggestions.map((slot, index) => {
          const isWinner = event.confirmedSlot && 
            event.confirmedSlot.date === slot.date && 
            event.confirmedSlot.startTime === slot.startTime;

          return (
            <div 
              key={slot.id} 
              className={`suggestion-card ${isWinner ? 'is-winner' : ''}`}
            >
              {index === 0 && !isWinner && (
                <div style={{
                  position: 'absolute',
                  top: -10,
                  right: 18,
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.4)'
                }}>
                  <Award size={13} />
                  OPÇÃO Nº 1 (MAIOR ADESÃO)
                </div>
              )}

              <div className="suggestion-header">
                <div className="suggestion-datetime">
                  <div className="date-badge">
                    {formatDateLabel(slot.date)}
                  </div>
                  <div className="time-range">
                    {slot.startTime} às {slot.endTime}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                    ({Math.floor(slot.durationMinutes / 60)}h)
                  </div>
                </div>

                <div className={`suggestion-badge badge-${slot.badgeType}`}>
                  {slot.matchBadge} • {slot.score}% Quórum
                </div>
              </div>

              {/* Detalhes de Participação (Integral vs Parcial) */}
              <div className="attendance-breakdown">
                {/* Integrais */}
                <div className="breakdown-row">
                  <span style={{ fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={15} />
                    {slot.fullAttendees.length} Integrais:
                  </span>
                  {slot.fullAttendees.length > 0 ? (
                    slot.fullAttendees.map(p => (
                      <span key={p.id} className="pill-attendee pill-full">
                        {p.name}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>Nenhum participante 100% livre</span>
                  )}
                </div>

                {/* Parciais */}
                {slot.partialAttendees.length > 0 && (
                  <div className="breakdown-row">
                    <span style={{ fontWeight: 700, color: '#92400e', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={15} />
                      {slot.partialAttendees.length} Parciais:
                    </span>
                    {slot.partialAttendees.map(p => (
                      <span key={p.id} className="pill-attendee pill-partial" title={`${p.availableMinutes} min disponíveis`}>
                        {p.name} ({p.partialWindow})
                      </span>
                    ))}
                  </div>
                )}

                {/* Indisponíveis */}
                {slot.unavailableAttendees.length > 0 && (
                  <div className="breakdown-row">
                    <span style={{ fontWeight: 600, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <XCircle size={15} />
                      {slot.unavailableAttendees.length} Ausentes:
                    </span>
                    {slot.unavailableAttendees.map(p => (
                      <span key={p.id} className="pill-attendee pill-missing">
                        {p.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Botão de Definição pelo Organizador */}
              <div className="suggestion-actions">
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Total presente: <strong>{slot.attendeeCount} de {slot.totalParticipants} pessoas</strong> ({slot.fullAttendees.length} durante todo o evento)
                </div>

                {isWinner ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontWeight: 800, fontSize: '0.9rem' }}>
                    <Check size={18} />
                    HORÁRIO OFICIALMENTE CONFIRMADO!
                  </div>
                ) : isOrganizer ? (
                  <button 
                    className="btn-choose-slot"
                    onClick={() => handleSelectSlot(slot)}
                  >
                    <Check size={16} />
                    Definir este horário para o evento
                  </button>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
                    Aguardando confirmação do organizador
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
