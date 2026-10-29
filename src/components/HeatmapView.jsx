import React, { useState } from 'react';
import {
  Lock,
  Eye,
  Users,
  MessageSquare,
  CheckCircle,
  Clock,
  MapPin,
  Plus,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  Calendar,
  CalendarCheck2,
  ExternalLink,
  Star,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { calculateHeatmap, timeToMinutes } from '../services/schedulerAlgorithm';
import { useI18n } from '../services/i18n';
import Avatar from './Avatar';
import EventStatusBadge from './EventStatusBadge';

export default function HeatmapView({
  event,
  currentUser,
  isOrganizer,
  onAddSuggestion,
  onVoteSuggestion,
  onConfirmSlot,
  onAddLocationSuggestion,
  onVoteLocation,
  onSelectOfficialLocation,
  onToggleAllowLocationSuggestions,
  onOpenAuth,
  onNavigateTab,
  onOpenParticipants,
  onUpdateStatus
}) {
  const { t, lang } = useI18n();
  const [selectedDate, setSelectedDate] = useState(event.dates[0] || '');
  const [hoveredSlot, setHoveredSlot] = useState(null);

  // Estados dos modais integrados
  const [isTimeSugModalOpen, setIsTimeSugModalOpen] = useState(false);
  const [newSugDate, setNewSugDate] = useState(event.dates[0] || '');
  const [newSugStart, setNewSugStart] = useState('15:00');
  const [newSugEnd, setNewSugEnd] = useState('18:00');
  const [newSugTitle, setNewSugTitle] = useState('');

  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [newLocTitle, setNewLocTitle] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocNotes, setNewLocNotes] = useState('');

  const isRestricted = event.privacy === 'private' && !isOrganizer;

  const LOCALE_BY_LANG = {
    pt: 'pt-BR',
    en: 'en-US',
    es: 'es-ES',
    it: 'it-IT',
    fr: 'fr-FR'
  };

  const formatDateFriendly = (dateStr) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString(LOCALE_BY_LANG[lang] || 'pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const handleCreateTimeSuggestion = (e) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (!newSugDate || !newSugStart || !newSugEnd) return;
    if (timeToMinutes(newSugStart) >= timeToMinutes(newSugEnd)) {
      alert('O horário de início deve ser anterior ao de término.');
      return;
    }

    const suggestionObj = {
      id: `sug-${Date.now()}`,
      date: newSugDate,
      startTime: newSugStart,
      endTime: newSugEnd,
      title: newSugTitle.trim() || 'Sugestão de Horário',
      creator: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar
      },
      createdAt: new Date().toISOString(),
      votes: {
        [currentUser.id]: 'available'
      }
    };

    if (onAddSuggestion) onAddSuggestion(suggestionObj);
    setIsTimeSugModalOpen(false);
    setNewSugTitle('');
  };

  const handleCreateLocationSuggestion = (e) => {
    e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (!newLocTitle.trim()) return;

    const locationObj = {
      id: `loc-${Date.now()}`,
      title: newLocTitle.trim(),
      address: newLocAddress.trim(),
      notes: newLocNotes.trim(),
      creator: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar
      },
      createdAt: new Date().toISOString(),
      votes: {
        [currentUser.id]: 'approve'
      }
    };

    if (onAddLocationSuggestion) onAddLocationSuggestion(locationObj);
    setIsLocModalOpen(false);
    setNewLocTitle('');
    setNewLocAddress('');
    setNewLocNotes('');
  };

  if (isRestricted) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '3.5rem 1.5rem',
        background: '#fffbeb',
        border: '1px solid #fef08a',
        borderRadius: 'var(--radius-md)'
      }}>
        <div style={{
          width: 50,
          height: 50,
          background: '#fef3c7',
          color: '#b45309',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1rem auto'
        }}>
          <Lock size={24} />
        </div>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#92400e', marginBottom: '0.5rem' }}>
          Visibilidade Confidencial Ativada
        </h3>
        <p style={{ fontSize: '0.9rem', color: '#78350f', maxWidth: 460, margin: '0 auto 1.5rem auto' }}>
          O organizador optou por manter as disponibilidades e sugestões individuais visíveis apenas para ele.
          Suas respostas foram salvas e continuam sendo processadas pelo algoritmo de sugestão inteligente!
        </p>
        <div style={{ fontSize: '0.8rem', color: '#b45309', fontStyle: 'italic' }}>
          (Se você for o organizador, alterne para o usuário organizador no topo para ver os dados completos)
        </div>
      </div>
    );
  }

  const heatmapSlots = calculateHeatmap(event, selectedDate);
  const customSuggestions = event.customSuggestions || [];
  const locationSuggestions = event.locationSuggestions || [];
  const allowLocationSuggestions = event.allowLocationSuggestions ?? true;

  // Reúne todas as sugestões dos participantes
  const participantSuggestions = [];
  event.participants.forEach(p => {
    if (p.suggestions && p.suggestions.length) {
      p.suggestions.forEach(text => {
        if (text.trim()) {
          participantSuggestions.push({
            name: p.name,
            avatar: p.avatar,
            text
          });
        }
      });
    }
  });

  return (
    <div className="heatmap-view-section" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0, width: '100%', boxSizing: 'border-box' }}>
      {/* 1. HERO / DASHBOARD DE RESUMO DO EVENTO */}
      <div style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
        border: '1px solid #bbf7d0',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {/* Top Header: Título no canto esquerdo e Badge de Status no canto oposto */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '0.35rem'
        }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <Users size={24} color="var(--primary)" />
            {t('heroTitle')}
          </h2>

          <div style={{ flexShrink: 0 }}>
            <EventStatusBadge
              status={event.status || 'voting'}
              size="md"
              align="right"
              isOrganizer={isOrganizer}
              onStatusChange={onUpdateStatus}
            />
          </div>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.15rem' }}>
          {t('heroSubtitle')}
        </p>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {onNavigateTab && (
            <button
              className="btn-primary"
              onClick={() => onNavigateTab('voting')}
              style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
            >
              <CalendarCheck2 size={16} />
              {t('tabMyAvailability')}
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={() => setIsTimeSugModalOpen(true)}
            style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
          >
            <Clock size={16} />
            {t('suggestTimeBtn')}
          </button>
          {allowLocationSuggestions && (
            <button
              className="btn-secondary"
              onClick={() => setIsLocModalOpen(true)}
              style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }}
            >
              <MapPin size={16} />
              {t('btnSuggestLocation')}
            </button>
          )}
        </div>

        {/* Métricas Rápidas */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
          gap: '0.85rem',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                {t('metricParticipants')}
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)', marginTop: 2 }}>
                {event.participants.length} {t('metricParticipantsSub')}
              </div>
            </div>
            {onOpenParticipants && (
              <button
                type="button"
                onClick={onOpenParticipants}
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  background: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                {isOrganizer ? `${t('manageParticipants')} →` : `${t('viewParticipants')} →`}
              </button>
            )}
          </div>

          <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {t('metricTimeSuggestions')}
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary)', marginTop: 2 }}>
              {customSuggestions.length} {t('metricTimeSuggestionsSub')}
            </div>
          </div>

          <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              {t('metricLocations')}
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669', marginTop: 2 }}>
              {locationSuggestions.length} {t('metricLocationsSub')}
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUGESTÕES DE DIAS & HORÁRIOS DOS PARTICIPANTES */}
      <div style={{
        background: 'white',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={20} color="var(--primary)" />
              {t('timeSuggestionsTitle')} ({customSuggestions.length})
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {t('timeSuggestionsSub')}
            </p>
          </div>

          <button
            className="btn-primary"
            onClick={() => setIsTimeSugModalOpen(true)}
            style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
          >
            <Plus size={16} />
            {t('suggestTimeBtn')}
          </button>
        </div>

        {customSuggestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
            <Clock size={36} style={{ opacity: 0.35, margin: '0 auto 0.5rem auto' }} />
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t('noTimeSuggestions')}</div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {t('noTimeSuggestionsSub')}
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '1rem',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {customSuggestions.map(sug => {
              const votes = sug.votes || {};
              const availableVoters = event.participants.filter(p => votes[p.id] === 'available');
              const unavailableVoters = event.participants.filter(p => votes[p.id] === 'unavailable');
              const myVote = votes[currentUser?.id];

              return (
                <div
                  key={sug.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.15rem',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {formatDateFriendly(sug.date)} • {sug.startTime} – {sug.endTime}
                      </span>
                      {sug.creator && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Avatar
                            src={sug.creator.avatar}
                            name={sug.creator.name}
                            size={20}
                          />
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {sug.creator.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {sug.title && (
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                        "{sug.title}"
                      </div>
                    )}

                    {/* Votos dos Participantes */}
                    <div style={{ fontSize: '0.78rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={14} color="#16a34a" />
                        {t('availableCount')} ({availableVoters.length}):
                        <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>
                          {availableVoters.length > 0 ? availableVoters.map(p => p.name).join(', ') : t('noneYet')}
                        </span>
                      </div>
                      {unavailableVoters.length > 0 && (
                        <div style={{ color: '#991b1b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <XCircle size={14} color="#dc2626" />
                          {t('unavailableCount')} ({unavailableVoters.length}):
                          <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>
                            {unavailableVoters.map(p => p.name).join(', ') }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ações de Voto */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => onVoteSuggestion && onVoteSuggestion(sug.id, 'available')}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          border: `1.5px solid ${myVote === 'available' ? '#16a34a' : 'var(--border-color)'}`,
                          background: myVote === 'available' ? '#dcfce7' : 'white',
                          color: myVote === 'available' ? '#166534' : 'var(--text-main)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Check size={13} /> {t('btnAvailable')}
                      </button>

                      <button
                        type="button"
                        onClick={() => onVoteSuggestion && onVoteSuggestion(sug.id, 'unavailable')}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          border: `1.5px solid ${myVote === 'unavailable' ? '#dc2626' : 'var(--border-color)'}`,
                          background: myVote === 'unavailable' ? '#fee2e2' : 'white',
                          color: myVote === 'unavailable' ? '#991b1b' : 'var(--text-main)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <X size={13} /> {t('btnUnavailable')}
                      </button>
                    </div>

                    {isOrganizer && onConfirmSlot && (
                      <button
                        type="button"
                        onClick={() => onConfirmSlot({
                          date: sug.date,
                          startTime: sug.startTime,
                          endTime: sug.endTime,
                          fullAttendees: availableVoters
                        })}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          background: '#ecfdf5',
                          border: '1px solid #10b981',
                          color: '#047857',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                        title={t('btnConfirmSlot')}
                      >
                        <Star size={13} /> {t('btnConfirmSlot')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. SUGESTÕES & VOTAÇÃO DE LOCAIS */}
      <div style={{
        background: 'white',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={20} color="#059669" />
              {t('locationsTitle')} ({locationSuggestions.length})
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {t('locationsSub')}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {isOrganizer && onToggleAllowLocationSuggestions && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onToggleAllowLocationSuggestions(!allowLocationSuggestions)}
                style={{ fontSize: '0.78rem', padding: '0.45rem 0.75rem' }}
              >
                {allowLocationSuggestions ? t('btnCloseLocationVoting') : t('btnReopenLocationVoting')}
              </button>
            )}

            {allowLocationSuggestions && (
              <button
                className="btn-primary"
                onClick={() => setIsLocModalOpen(true)}
                style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}
              >
                <Plus size={16} />
                {t('btnSuggestLocation')}
              </button>
            )}
          </div>
        </div>

        {locationSuggestions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: '#f8fafc', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
            <MapPin size={36} style={{ opacity: 0.35, margin: '0 auto 0.5rem auto' }} />
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t('noLocations')}</div>
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {t('noLocationsSub')}
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: '1rem',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {locationSuggestions.map(loc => {
              const votes = loc.votes || {};
              const approves = Object.values(votes).filter(v => v === 'approve').length;
              const rejects = Object.values(votes).filter(v => v === 'reject').length;
              const myVote = votes[currentUser?.id];

              return (
                <div
                  key={loc.id}
                  style={{
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.15rem',
                    background: '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: 4 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {loc.title}
                      </div>
                      <div style={{ display: 'flex', gap: 6, fontSize: '0.75rem', fontWeight: 800 }}>
                        <span style={{ color: '#059669', background: '#ecfdf5', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                          👍 {approves}
                        </span>
                        {rejects > 0 && (
                          <span style={{ color: '#dc2626', background: '#fee2e2', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                            👎 {rejects}
                          </span>
                        )}
                      </div>
                    </div>

                    {loc.address && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={13} color="var(--primary)" />
                        <span>{loc.address}</span>
                      </div>
                    )}

                    {loc.notes && (
                      <div style={{ fontSize: '0.825rem', color: 'var(--text-main)', background: '#f8fafc', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
                        "{loc.notes}"
                      </div>
                    )}

                    {loc.creator && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: '0.75rem' }}>
                        <Avatar
                          src={loc.creator.avatar}
                          name={loc.creator.name}
                          size={18}
                        />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                          {t('suggestedBy')} {loc.creator.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Votação de Aprovar/Reprovar e Escolher como Oficial */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        onClick={() => onVoteLocation && onVoteLocation(loc.id, 'approve')}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          border: `1.5px solid ${myVote === 'approve' ? '#059669' : 'var(--border-color)'}`,
                          background: myVote === 'approve' ? '#ecfdf5' : 'white',
                          color: myVote === 'approve' ? '#065f46' : 'var(--text-main)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <ThumbsUp size={13} /> {t('btnApprove')}
                      </button>

                      <button
                        type="button"
                        onClick={() => onVoteLocation && onVoteLocation(loc.id, 'reject')}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          border: `1.5px solid ${myVote === 'reject' ? '#dc2626' : 'var(--border-color)'}`,
                          background: myVote === 'reject' ? '#fee2e2' : 'white',
                          color: myVote === 'reject' ? '#991b1b' : 'var(--text-main)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <ThumbsDown size={13} /> {t('btnReject')}
                      </button>
                    </div>

                    {isOrganizer && onSelectOfficialLocation && (
                      <button
                        type="button"
                        onClick={() => onSelectOfficialLocation(loc.title, loc.address)}
                        style={{
                          padding: '0.35rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          background: '#fef3c7',
                          border: '1px solid #f59e0b',
                          color: '#92400e',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                        title={t('btnSetOfficial')}
                      >
                        <Star size={13} /> {t('btnSetOfficial')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. MAPA DE CALOR CONSOLIDADO (HEATMAP) */}
      <div style={{
        background: 'white',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={20} color="var(--primary)" />
              {t('heatmapTitle')}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {t('heatmapSub')}
            </p>
          </div>

          {/* Tabs de Datas do Evento */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {event.dates.map(dateStr => (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${selectedDate === dateStr ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: selectedDate === dateStr ? 'var(--primary)' : 'white',
                  color: selectedDate === dateStr ? 'white' : 'var(--text-main)',
                  cursor: 'pointer'
                }}
              >
                {formatDateFriendly(dateStr)}
              </button>
            ))}
          </div>
        </div>

        {/* Grade de Calor */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 120px), 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          {heatmapSlots.map(slot => {
            let bg = '#f8fafc';
            let border = '#e2e8f0';
            let textColor = '#64748b';

            if (slot.availableCount > 0) {
              const ratio = slot.availableCount / event.participants.length;
              if (ratio >= 0.8) {
                bg = '#dcfce7';
                border = '#86efac';
                textColor = '#166534';
              } else if (ratio >= 0.5) {
                bg = '#ecfdf5';
                border = '#a7f3d0';
                textColor = '#065f46';
              } else {
                bg = '#f0fdf4';
                border = '#bbf7d0';
                textColor = '#166534';
              }
            } else if (slot.unavailableCount === event.participants.length) {
              bg = '#fee2e2';
              border = '#fecaca';
              textColor = '#991b1b';
            }

            return (
              <div
                key={slot.time}
                style={{
                  background: bg,
                  border: `1.5px solid ${border}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.75rem 0.5rem',
                  textAlign: 'center',
                  position: 'relative',
                  cursor: 'default',
                  transition: 'transform 0.1s ease'
                }}
                onMouseEnter={() => setHoveredSlot(slot)}
                onMouseLeave={() => setHoveredSlot(null)}
              >
                <div style={{ fontSize: '1rem', fontWeight: 800, color: textColor }}>
                  {slot.time}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: textColor, marginTop: 2 }}>
                  {slot.availableCount} {t('freeOf')} {event.participants.length} {t('freeWord')}
                </div>

                {/* Tooltip ao passar o mouse */}
                {hoveredSlot?.time === slot.time && (
                  <div style={{
                    position: 'absolute',
                    bottom: '105%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#0f172a',
                    color: 'white',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                    zIndex: 30,
                    boxShadow: 'var(--shadow-xl)',
                    pointerEvents: 'none'
                  }}>
                    <div style={{ fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: 3, marginBottom: 4 }}>
                      {slot.time} • {formatDateFriendly(selectedDate)}
                    </div>
                    {slot.availableNames.length > 0 && (
                      <div style={{ color: '#4ade80' }}>
                        ✓ {t('tooltipFree')} ({slot.availableNames.length}): {slot.availableNames.join(', ')}
                      </div>
                    )}
                    {slot.maybeNames.length > 0 && (
                      <div style={{ color: '#fbbf24' }}>
                        ~ {t('tooltipMaybe')} ({slot.maybeNames.length}): {slot.maybeNames.join(', ')}
                      </div>
                    )}
                    {slot.unavailableNames.length > 0 && (
                      <div style={{ color: '#f87171' }}>
                        ✗ {t('tooltipBusy')} ({slot.unavailableNames.length}): {slot.unavailableNames.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. OBSERVAÇÕES E COMENTÁRIOS DOS PARTICIPANTES */}
      <div style={{
        background: 'white',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <MessageSquare size={18} color="var(--primary)" />
          {t('notesTitle')} ({participantSuggestions.length})
        </h3>

        {participantSuggestions.length === 0 ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
            {t('noNotes')}
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
            gap: '0.75rem',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {participantSuggestions.map((item, idx) => (
              <div 
                key={idx}
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem',
                  display: 'flex',
                  gap: '0.65rem'
                }}
              >
                <Avatar 
                  src={item.avatar} 
                  name={item.name} 
                  size={32} 
                />
                <div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    "{item.text}"
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL PARA PROPOR NOVO DIA & HORÁRIO */}
      {isTimeSugModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Proposta Coletiva
                </div>
                <h3 className="modal-title">Sugerir Dia & Horário</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsTimeSugModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateTimeSuggestion}>
              <div className="form-group">
                <label className="form-label">Data Sugerida</label>
                <input
                  type="date"
                  className="form-input"
                  value={newSugDate}
                  onChange={(e) => setNewSugDate(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div>
                  <label className="form-label">Hora Inicial</label>
                  <input
                    type="time"
                    className="form-input"
                    value={newSugStart}
                    onChange={(e) => setNewSugStart(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Hora Final</label>
                  <input
                    type="time"
                    className="form-input"
                    value={newSugEnd}
                    onChange={(e) => setNewSugEnd(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Motivo ou Título da Sugestão</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: 'Sábado à tarde depois do almoço', 'Quarta à noite'..."
                  value={newSugTitle}
                  onChange={(e) => setNewSugTitle(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsTimeSugModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Cadastrar Sugestão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA PROPOR NOVO LOCAL */}
      {isLocModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                  Proposta de Espaço
                </div>
                <h3 className="modal-title">Sugerir Local para o Evento</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsLocModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateLocationSuggestion}>
              <div className="form-group">
                <label className="form-label">Nome do Local ou Espaço</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: 'Restaurante Pirajá', 'Parque Ibirapuera', 'Sala de Reuniões Coworking'..."
                  value={newLocTitle}
                  onChange={(e) => setNewLocTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Endereço ou Bairro (opcional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: 'Rua Fradique Coutinho, 124 - Pinheiros'..."
                  value={newLocAddress}
                  onChange={(e) => setNewLocAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Observações sobre o local</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Ex: 'Tem mesas grandes ao ar livre, bom custo-benefício e estacionamento fácil'..."
                  value={newLocNotes}
                  onChange={(e) => setNewLocNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsLocModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ background: '#059669' }}
                >
                  Cadastrar Local
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
