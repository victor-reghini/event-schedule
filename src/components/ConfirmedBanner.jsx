import React from 'react';
import { Calendar, Download, ExternalLink, CheckCircle2, RotateCcw, Share2, Sparkles } from 'lucide-react';
import { downloadIcsFile, getGoogleCalendarUrl, getOutlookCalendarUrl } from '../services/calendarExport';
import { useI18n } from '../services/i18n';

export default function ConfirmedBanner({
  event,
  isOrganizer,
  onReopenVoting,
  onShare,
  onCompleteEvent,
  onCancelEvent
}) {
  const { t, lang } = useI18n();
  const slot = event.confirmedSlot;
  if (!slot) return null;

  const LOCALE_BY_LANG = {
    pt: 'pt-BR',
    en: 'en-US',
    es: 'es-ES',
    it: 'it-IT',
    fr: 'fr-FR'
  };

  const formatDate = (dateStr) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString(LOCALE_BY_LANG[lang] || 'pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      border: '2px solid #86efac',
      borderRadius: 'var(--radius-lg)',
      padding: '1.75rem',
      marginBottom: '2rem',
      boxShadow: 'var(--shadow-md)'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#15803d',
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.78rem',
            fontWeight: 800,
            marginBottom: '0.65rem'
          }}>
            <CheckCircle2 size={14} />
            EVENTO CONFIRMADO PELO ORGANIZADOR
          </div>

          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#14532d', marginBottom: '0.35rem' }}>
            {formatDate(slot.date)}
          </h3>

          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#166534' }}>
            Das {slot.startTime} às {slot.endTime} • {Math.floor(slot.durationMinutes / 60)} horas de duração
          </div>
          <div style={{ fontSize: '0.85rem', color: '#15803d', marginTop: 4 }}>
            Local: <strong>{event.locationDetails || 'Presencial'}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className="btn-secondary"
            onClick={onShare}
            style={{ background: 'white' }}
          >
            <Share2 size={16} />
            Compartilhar
          </button>

          {isOrganizer && (
            <>
              <button 
                className="btn-secondary"
                onClick={onReopenVoting}
                title="Permite que os participantes votem novamente ou escolha outro horário"
                style={{ background: 'white', color: '#64748b' }}
              >
                <RotateCcw size={15} />
                {t('actionReopenVoting')}
              </button>

              {onCompleteEvent && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onCompleteEvent}
                  title={t('actionMarkCompleted')}
                  style={{ background: 'white', color: '#475569' }}
                >
                  🏁 {t('actionMarkCompleted')}
                </button>
              )}

              {onCancelEvent && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onCancelEvent}
                  title={t('actionCancelEvent')}
                  style={{ background: 'white', color: '#be123c' }}
                >
                  🚫 {t('actionCancelEvent')}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Botões de Integração com Agendas */}
      <div style={{
        marginTop: '1.5rem',
        paddingTop: '1.25rem',
        borderTop: '1px solid #bbf7d0'
      }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#14532d', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={16} />
          Adicione à sua agenda para não esquecer do compromisso:
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {/* Google Calendar */}
          <a
            href={getGoogleCalendarUrl(event, slot)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              background: '#ffffff',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-md)',
              color: '#1e3a8a',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google" style={{ width: 18, height: 18 }} />
            <span>Google Agenda</span>
            <ExternalLink size={13} style={{ color: '#94a3b8' }} />
          </a>

          {/* Microsoft Outlook */}
          <a
            href={getOutlookCalendarUrl(event, slot)}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              background: '#ffffff',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-md)',
              color: '#0369a1',
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg" alt="Outlook" style={{ width: 18, height: 18 }} />
            <span>Outlook Agenda</span>
            <ExternalLink size={13} style={{ color: '#94a3b8' }} />
          </a>

          {/* Apple Calendar (.ics) */}
          <button
            onClick={() => downloadIcsFile(event, slot)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              background: '#ffffff',
              border: '1px solid #bbf7d0',
              borderRadius: 'var(--radius-md)',
              color: '#0f172a',
              fontWeight: 700,
              fontSize: '0.85rem',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <img src="https://upload.wikimedia.org/wikipedia/commons/3/31/Apple_logo_white.svg" alt="Apple" style={{ width: 16, height: 16, filter: 'invert(1)' }} />
            <span>Apple Calendar (.ics)</span>
            <Download size={14} style={{ color: '#64748b' }} />
          </button>
        </div>

        {/* Em Breve: Sincronização Automática em 2 Vias */}
        <div style={{
          marginTop: '1rem',
          fontSize: '0.78rem',
          color: '#15803d',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <Sparkles size={14} />
          <span><strong>Próxima fase de integração:</strong> Conexão OAuth 2.0 direta para criar eventos e sincronizar conflitos em tempo real via Google API, Microsoft Graph e CalDAV Apple.</span>
        </div>
      </div>
    </div>
  );
}
