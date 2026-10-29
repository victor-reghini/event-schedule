import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  Lock,
  Globe,
  Share2,
  Sparkles,
  Users,
  CheckCircle2,
  CalendarCheck2,
  CalendarRange,
  MessageSquare,
  X,
  CheckCheck,
  XCircle,
  RotateCcw
} from 'lucide-react';
import Navbar from './components/Navbar';
import SmartSuggestions from './components/SmartSuggestions';
import CalendarAvailabilityView from './components/CalendarAvailabilityView';
import HeatmapView from './components/HeatmapView';
import ConfirmedBanner from './components/ConfirmedBanner';
import EventCreatorModal from './components/EventCreatorModal';
import MyEventsModal from './components/MyEventsModal';
import ShareModal from './components/ShareModal';
import AuthModal from './components/AuthModal';
import LocationSuggestionsView from './components/LocationSuggestionsView';
import ParticipantsModal from './components/ParticipantsModal';
import Avatar from './components/Avatar';
import ProfileAvatarModal from './components/ProfileAvatarModal';
import EventStatusBadge from './components/EventStatusBadge';
import {
  getStoredEvents,
  saveStoredEvents
} from './services/storage';
import {
  getCurrentSession,
  logoutUser,
  updateUserAvatar
} from './services/auth';
import { useI18n } from './services/i18n';

export default function App() {
  const { t, lang } = useI18n();
  const [events, setEvents] = useState(() => getStoredEvents());
  const [currentUser, setCurrentUser] = useState(() => getCurrentSession());
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [currentEventId, setCurrentEventId] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventParam = urlParams.get('event');
    if (eventParam && getStoredEvents().some(e => e.id === eventParam)) {
      return eventParam;
    }
    return getStoredEvents()[0]?.id || '';
  });

  const [activeTab, setActiveTab] = useState('heatmap'); // 'heatmap' (tela principal) | 'voting' | 'suggestions' | 'locations'
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [joinConfirmation, setJoinConfirmation] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Salva no storage quando events mudar
  useEffect(() => {
    saveStoredEvents(events);
  }, [events]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    showToast('Você saiu da sua conta.');
  };

  const handleAuthSuccess = (session) => {
    setCurrentUser(session);
    setIsAuthOpen(false);
    showToast(`Bem-vindo, ${session.name}!`);
  };

  const handleSaveAvatar = (newAvatar) => {
    if (!currentUser) return;
    const updatedSession = updateUserAvatar(currentUser.id, newAvatar);
    setCurrentUser({ ...updatedSession });

    setEvents(prevEvents =>
      prevEvents.map(evt => {
        let evtModified = false;
        let updatedOrganizer = evt.organizer;
        if (evt.organizer?.id === currentUser.id) {
          updatedOrganizer = { ...evt.organizer, avatar: newAvatar };
          evtModified = true;
        }

        const updatedParticipants = (evt.participants || []).map(p => {
          if (p.id === currentUser.id) {
            evtModified = true;
            return { ...p, avatar: newAvatar };
          }
          return p;
        });

        const updatedSuggestions = (evt.customSuggestions || []).map(sug => {
          if (sug.creator?.id === currentUser.id) {
            evtModified = true;
            return { ...sug, creator: { ...sug.creator, avatar: newAvatar } };
          }
          return sug;
        });

        const updatedLocations = (evt.locationSuggestions || []).map(loc => {
          if (loc.creator?.id === currentUser.id) {
            evtModified = true;
            return { ...loc, creator: { ...loc.creator, avatar: newAvatar } };
          }
          return loc;
        });

        if (!evtModified) return evt;

        return {
          ...evt,
          organizer: updatedOrganizer,
          participants: updatedParticipants,
          customSuggestions: updatedSuggestions,
          locationSuggestions: updatedLocations
        };
      })
    );

    showToast(newAvatar ? t('profileSuccessToast') : t('profileInitialsToast'));
  };

  const currentEvent = events.find(e => e.id === currentEventId) || events[0];

  // Auto-adiciona o usuário ao acessar o link do evento
  useEffect(() => {
    if (!currentUser || !currentEvent) return;

    const isAlreadyParticipant = (currentEvent.participants || []).some(p => p.id === currentUser.id);

    if (!isAlreadyParticipant) {
      const newParticipant = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatar: currentUser.avatar,
        availabilities: {},
        customIntervals: [],
        suggestions: [],
        joinedAt: new Date().toISOString()
      };

      setEvents(prevEvents =>
        prevEvents.map(evt => {
          if (evt.id !== currentEvent.id) return evt;
          return {
            ...evt,
            participants: [...(evt.participants || []), newParticipant]
          };
        })
      );

      setJoinConfirmation({
        eventName: currentEvent.title,
        userName: currentUser.name
      });
      showToast(`✓ Você foi adicionado automaticamente ao evento "${currentEvent.title}"!`);
    }
  }, [currentEvent?.id, currentUser?.id]);

  if (!currentEvent) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando agendador...</div>;
  }

  const isOrganizer = currentUser && currentEvent.organizer?.id === currentUser.id;

  // Organizador remove participante do evento
  const handleRemoveParticipant = (participantId, participantName) => {
    if (!isOrganizer) return;

    if (participantId === currentEvent.organizer?.id) {
      alert('O organizador do evento não pode ser removido.');
      return;
    }

    const confirmed = window.confirm(`Tem certeza que deseja remover ${participantName} deste evento?`);
    if (!confirmed) return;

    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== currentEvent.id) return evt;
        return {
          ...evt,
          participants: evt.participants.filter(p => p.id !== participantId),
          customSuggestions: (evt.customSuggestions || []).map(sug => {
            const newVotes = { ...(sug.votes || {}) };
            delete newVotes[participantId];
            return { ...sug, votes: newVotes };
          }),
          locationSuggestions: (evt.locationSuggestions || []).map(loc => {
            const newVotes = { ...(loc.votes || {}) };
            delete newVotes[participantId];
            return { ...loc, votes: newVotes };
          })
        };
      })
    );

    showToast(`${participantName} foi removido do evento pelo organizador.`);
  };

  // Atualiza disponibilidade do participante logado
  const handleSaveAvailability = (updatedParticipantData) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== currentEvent.id) return evt;

        const existingIndex = evt.participants.findIndex(p => p.id === updatedParticipantData.userId);
        let updatedParticipants = [...evt.participants];

        const participantObj = {
          id: updatedParticipantData.userId,
          name: updatedParticipantData.name,
          email: updatedParticipantData.email,
          avatar: updatedParticipantData.avatar,
          availabilities: updatedParticipantData.availabilities,
          suggestions: updatedParticipantData.suggestions,
          updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
          updatedParticipants[existingIndex] = participantObj;
        } else {
          updatedParticipants.push(participantObj);
        }

        // Se o participante sugeriu datas extras fora das datas originais do organizador
        let newExtraDates = evt.extraDates || [];
        if (updatedParticipantData.extraDates && updatedParticipantData.extraDates.length) {
          updatedParticipantData.extraDates.forEach(d => {
            if (!newExtraDates.includes(d) && !evt.dates.includes(d)) {
              newExtraDates = [...newExtraDates, d];
            }
          });
        }

        return {
          ...evt,
          extraDates: newExtraDates,
          participants: updatedParticipants
        };
      })
    );

    showToast('Disponibilidade salva no estilo Google Agenda!');
    setActiveTab('heatmap');
  };

  // Organizador confirma um horário
  const handleConfirmSlot = (slot) => {
    if (!isOrganizer) {
      alert('Apenas o organizador pode confirmar o horário final do evento.');
      return;
    }

    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== currentEvent.id) return evt;
        return {
          ...evt,
          status: 'confirmed',
          confirmedSlot: slot
        };
      })
    );
    showToast(`Horário confirmado com sucesso para ${slot.date}!`);
  };

  // Organizador reabre a votação
  const handleReopenVoting = () => {
    if (!isOrganizer) return;
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== currentEvent.id) return evt;
        return {
          ...evt,
          status: 'voting',
          confirmedSlot: null
        };
      })
    );
    showToast('Votação reaberta para os participantes!');
  };

  // Organizador altera status do evento (voting, confirmed, completed, canceled)
  const handleUpdateEventStatus = (newStatus, targetEventId = currentEvent.id) => {
    const targetEvt = events.find(e => e.id === targetEventId);
    if (!targetEvt) return;
    const isTargetOrganizer = currentUser && targetEvt.organizer?.id === currentUser.id;
    if (!isTargetOrganizer) {
      alert('Apenas o organizador do evento pode alterar seu status.');
      return;
    }

    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== targetEventId) return evt;
        return {
          ...evt,
          status: newStatus
        };
      })
    );

    const labels = {
      voting: t('actionReopenVoting') + ' (Pendente)',
      confirmed: t('statusConfirmed'),
      completed: t('statusCompleted'),
      canceled: t('statusCanceled')
    };
    showToast(`✓ Status alterado para: ${labels[newStatus] || newStatus}`);
  };

  // Criação de novo evento
  const handleCreateEvent = (newEvent) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    setEvents([newEvent, ...events]);
    showToast('Novo evento criado com sucesso!');
  };

  // Adiciona nova sugestão coletiva de dia e horário
  const handleAddSuggestion = (newSug) => {
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== currentEvent.id) return evt;
        const currentList = evt.customSuggestions || [];
        return {
          ...evt,
          customSuggestions: [newSug, ...currentList]
        };
      })
    );
    showToast('Nova sugestão cadastrada para todos os participantes!');
  };

  // Vota em uma sugestão coletiva existente
  const handleVoteSuggestion = (sugId, voteType) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== currentEvent.id) return evt;
        const updatedList = (evt.customSuggestions || []).map(sug => {
          if (sug.id !== sugId) return sug;
          return {
            ...sug,
            votes: {
              ...(sug.votes || {}),
              [currentUser.id]: voteType
            }
          };
        });
        return {
          ...evt,
          customSuggestions: updatedList
        };
      })
    );

    showToast(`Voto registrado como ${voteType === 'available' ? 'Disponível ✓' : 'Indisponível ✗'}!`);
  };

  // Alterna permissão de sugestões de locais pelo organizador
  const handleToggleLocationSuggestions = (allowed) => {
    if (!isOrganizer) return;
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== currentEvent.id) return evt;
        return {
          ...evt,
          allowLocationSuggestions: allowed
        };
      })
    );
    showToast(`Votação de locais ${allowed ? 'aberta' : 'encerrada'} pelo organizador!`);
  };

  // Adiciona nova sugestão de local proposta por qualquer participante
  const handleAddLocationSuggestion = (newLocation) => {
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== currentEvent.id) return evt;
        const currentLocs = evt.locationSuggestions || [];
        return {
          ...evt,
          locationSuggestions: [newLocation, ...currentLocs]
        };
      })
    );
    showToast('Nova sugestão de local cadastrada com sucesso!');
  };

  // Vota em uma sugestão de local (aprovar / reprovar)
  const handleVoteLocation = (locationId, voteType) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== currentEvent.id) return evt;
        const updatedLocs = (evt.locationSuggestions || []).map(loc => {
          if (loc.id !== locationId) return loc;
          const currentVote = loc.votes?.[currentUser.id];
          const newVotes = { ...(loc.votes || {}) };

          if (currentVote === voteType) {
            delete newVotes[currentUser.id];
          } else {
            newVotes[currentUser.id] = voteType;
          }

          return {
            ...loc,
            votes: newVotes
          };
        });

        return {
          ...evt,
          locationSuggestions: updatedLocs
        };
      })
    );

    showToast(`Voto registrado (${voteType === 'approve' ? 'Aprovado 👍' : 'Reprovado 👎'})!`);
  };

  // Organizador seleciona um local sugerido como o oficial
  const handleSelectOfficialLocation = (title, address) => {
    if (!isOrganizer) return;

    const fullLocationStr = address ? `${title} (${address})` : title;
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== currentEvent.id) return evt;
        return {
          ...evt,
          locationDetails: fullLocationStr
        };
      })
    );
    showToast(`Local oficial atualizado para "${title}"!`);
  };

  const formatDurationText = (mins) => {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours && remainingMins) return `${hours}h ${remainingMins}min`;
    if (hours) return `${hours} hora${hours > 1 ? 's' : ''}`;
    return `${remainingMins} minutos`;
  };

  return (
    <div className="app-layout">
      {/* Navbar Superior com Autenticação Real */}
      <Navbar
        currentUser={currentUser}
        onOpenCreate={() => {
          if (!currentUser) {
            setIsAuthOpen(true);
          } else {
            setIsCreateOpen(true);
          }
        }}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenProfileAvatar={() => {
          if (!currentUser) {
            setIsAuthOpen(true);
          } else {
            setIsAvatarModalOpen(true);
          }
        }}
        eventsCount={events.length}
      />

      <main className="app-main">
        {/* Banner de Evento Confirmado */}
        {currentEvent.status === 'confirmed' && currentEvent.confirmedSlot && (
          <ConfirmedBanner
            event={currentEvent}
            isOrganizer={isOrganizer}
            onReopenVoting={handleReopenVoting}
            onShare={() => setIsShareOpen(true)}
            onCompleteEvent={() => handleUpdateEventStatus('completed')}
            onCancelEvent={() => handleUpdateEventStatus('canceled')}
          />
        )}

        {/* Banner de Evento Encerrado */}
        {currentEvent.status === 'completed' && (
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #cbd5e1',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.75rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#475569',
                flexShrink: 0
              }}>
                <CheckCheck size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#1e293b' }}>
                    {t('bannerCompletedTitle')}
                  </span>
                  <EventStatusBadge status="completed" size="sm" />
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 2 }}>
                  {t('bannerCompletedBody')}
                </div>
              </div>
            </div>

            {isOrganizer && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleUpdateEventStatus('voting')}
                style={{ background: 'white' }}
              >
                <RotateCcw size={15} />
                {t('actionReopenVoting')}
              </button>
            )}
          </div>
        )}

        {/* Banner de Evento Cancelado */}
        {currentEvent.status === 'canceled' && (
          <div style={{
            background: '#fff1f2',
            border: '1.5px solid #fecdd3',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.75rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                background: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#be123c',
                flexShrink: 0
              }}>
                <XCircle size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#9f1239' }}>
                    {t('bannerCanceledTitle')}
                  </span>
                  <EventStatusBadge status="canceled" size="sm" />
                </div>
                <div style={{ fontSize: '0.85rem', color: '#be123c', marginTop: 2 }}>
                  {t('bannerCanceledBody')}
                </div>
              </div>
            </div>

            {isOrganizer && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleUpdateEventStatus('voting')}
                style={{ background: 'white', color: '#be123c' }}
              >
                <RotateCcw size={15} />
                {t('actionReactivateEvent')}
              </button>
            )}
          </div>
        )}

        {/* Card Master em Estilo Calendly Split-View */}
        <div className="scheduler-card">
          {/* Painel Esquerdo: Identidade do Evento e Organizador */}
          <aside className="event-sidebar">
            <div className="organizer-info">
              <Avatar
                src={currentEvent.organizer?.avatar}
                name={currentEvent.organizer?.name}
                size={52}
                className="organizer-avatar"
                border="2px solid #e0f2fe"
              />
              <div>
                <div className="organizer-name">{currentEvent.organizer?.name}</div>
                <div className="organizer-role">{t('organizer')}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: '0.85rem' }}>
              <div className="event-type-chip" style={{ margin: 0 }}>
                <span>{currentEvent.emoji || '📅'}</span>
                <span>{currentEvent.type || 'Encontro'}</span>
              </div>
              <EventStatusBadge
                status={currentEvent.status || 'voting'}
                size="md"
                isOrganizer={isOrganizer}
                onStatusChange={(newStatus) => handleUpdateEventStatus(newStatus)}
              />
            </div>

            <h1 className="event-title">{currentEvent.title}</h1>

            {/* Metadados: Duração, Local e Período Sugerido */}
            <div className="meta-item">
              <Clock size={17} />
              <span>{formatDurationText(currentEvent.duration)} ({t('duration')})</span>
            </div>

            <div className="meta-item">
              {currentEvent.locationType === 'online' ? (
                <Video size={17} color="#2563eb" />
              ) : (
                <MapPin size={17} color="#dc2626" />
              )}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>{currentEvent.locationDetails || (currentEvent.locationType === 'online' ? t('online') : t('presential'))}</span>
                {currentEvent.allowLocationSuggestions && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('locations')}
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--primary)',
                      fontWeight: 700,
                      textAlign: 'left',
                      marginTop: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3
                    }}
                  >
                    💡 {currentEvent.locationSuggestions?.length || 0} {t('locationsTitle')} →
                  </button>
                )}
              </div>
            </div>

            {/* Exibição do Período Estabelecido pelo Organizador */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.65rem 0.75rem',
              marginTop: '0.5rem',
              marginBottom: '0.75rem',
              fontSize: '0.825rem'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                <CalendarRange size={15} color="var(--primary)" />
                {t('datesWindow')}:
              </div>
              {currentEvent.dateRange ? (
                <div style={{ color: 'var(--text-muted)' }}>
                  De <strong>{currentEvent.dateRange.start}</strong> a <strong>{currentEvent.dateRange.end}</strong>
                  {currentEvent.suggestedTimeWindow && (
                    <div>Horário ideal: {currentEvent.suggestedTimeWindow.start} às {currentEvent.suggestedTimeWindow.end}</div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>
                  {currentEvent.dates.length} dias específicos sugeridos
                </div>
              )}
            </div>

            <div className={`privacy-pill ${currentEvent.privacy}`}>
              {currentEvent.privacy === 'private' ? (
                <>
                  <Lock size={14} />
                  <span>{t('privacyPrivateNotice')}</span>
                </>
              ) : (
                <>
                  <Globe size={14} />
                  <span>{t('privacyPublicNotice', { defaultValue: 'Respostas públicas para todos' })}</span>
                </>
              )}
            </div>

            {currentEvent.description && (
              <p className="event-desc">{currentEvent.description}</p>
            )}

            {/* Resumo de Participantes */}
            <div className="participants-summary">
              <div className="participants-summary-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={16} />
                  {t('participants')} ({currentEvent.participants?.length || 0})
                </span>
                <button
                  onClick={() => setIsShareOpen(true)}
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--primary)',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3
                  }}
                >
                  <Share2 size={13} /> {t('invite')}
                </button>
              </div>

              <div className="avatar-stack">
                {currentEvent.participants?.slice(0, 6).map((p, idx) => (
                  <Avatar
                    key={p.id || idx}
                    src={p.avatar}
                    name={p.name}
                    size={30}
                    border="2px solid white"
                    title={`${p.name}${p.id === currentEvent.organizer?.id ? ` (${t('organizer')})` : ''}`}
                  />
                ))}
                {currentEvent.participants?.length > 6 && (
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: '#cbd5e1',
                      color: '#334155',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: -8,
                      border: '2px solid white'
                    }}
                  >
                    +{currentEvent.participants.length - 6}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsParticipantsOpen(true)}
                style={{
                  width: '100%',
                  marginTop: '0.75rem',
                  padding: '0.45rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'white',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'background 0.15s ease'
                }}
              >
                <Users size={14} color="var(--primary)" />
                {isOrganizer ? t('manageParticipants') : t('viewParticipants')} ({currentEvent.participants?.length || 0})
              </button>
            </div>
          </aside>

          {/* Painel Direito: Abas de Votação, Sugestões do Algoritmo e Visão Geral */}
          <section className="event-content">
            {/* Banner de Confirmação em Tela ao Entrar Automaticamente no Evento */}
            {joinConfirmation && (
              <div style={{
                background: '#ecfdf5',
                border: '1.5px solid #10b981',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1.25rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 size={22} color="#059669" style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#065f46' }}>
                      {t('autoJoinTitle', { eventName: joinConfirmation.eventName })}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#047857', marginTop: 1 }}>
                      {t('autoJoinBody', { userName: joinConfirmation.userName })}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setJoinConfirmation(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#059669', padding: 4 }}
                  title="Dispensar confirmação"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="view-tabs">
              <button
                className={`tab-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
                onClick={() => setActiveTab('heatmap')}
              >
                <Users size={17} />
                <span>{t('tabGroupOverview')}</span>
                {currentEvent.privacy === 'private' && (
                  <Lock size={12} color="#b45309" />
                )}
              </button>

              <button
                className={`tab-btn ${activeTab === 'voting' ? 'active' : ''}`}
                onClick={() => setActiveTab('voting')}
              >
                <CalendarCheck2 size={17} />
                <span>{t('tabMyAvailability')}</span>
              </button>

              <button
                className={`tab-btn ${activeTab === 'suggestions' ? 'active' : ''}`}
                onClick={() => setActiveTab('suggestions')}
              >
                <Sparkles size={17} />
                <span>{t('tabSmartSuggestions')}</span>
              </button>

              <button
                className={`tab-btn ${activeTab === 'locations' ? 'active' : ''}`}
                onClick={() => setActiveTab('locations')}
              >
                <MapPin size={17} />
                <span>{t('tabLocations')}</span>
                {(currentEvent.locationSuggestions?.length > 0 || currentEvent.allowLocationSuggestions) && (
                  <span className="tab-badge" style={{ background: '#ecfdf5', color: '#166534' }}>
                    {currentEvent.locationSuggestions?.length || 0}
                  </span>
                )}
              </button>
            </div>

            {/* Conteúdo da Aba Ativa */}
            {activeTab === 'heatmap' && (
              <HeatmapView
                event={currentEvent}
                currentUser={currentUser}
                isOrganizer={isOrganizer}
                onAddSuggestion={handleAddSuggestion}
                onVoteSuggestion={handleVoteSuggestion}
                onConfirmSlot={handleConfirmSlot}
                onAddLocationSuggestion={handleAddLocationSuggestion}
                onVoteLocation={handleVoteLocation}
                onSelectOfficialLocation={handleSelectOfficialLocation}
                onToggleAllowLocationSuggestions={handleToggleLocationSuggestions}
                onOpenAuth={() => setIsAuthOpen(true)}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenParticipants={() => setIsParticipantsOpen(true)}
                onUpdateStatus={handleUpdateEventStatus}
              />
            )}

            {activeTab === 'voting' && (
              currentUser ? (
                <CalendarAvailabilityView
                  event={currentEvent}
                  currentUser={currentUser}
                  onSaveAvailability={handleSaveAvailability}
                  onAddSuggestion={handleAddSuggestion}
                  onVoteSuggestion={handleVoteSuggestion}
                  onConfirmSlot={handleConfirmSlot}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 1.5rem', background: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
                  <Lock size={36} color="var(--primary)" style={{ margin: '0 auto 1rem auto' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                    {t('login')}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 1.5rem auto' }}>
                    {t('authSubtitle', { defaultValue: 'Cada participante possui suas próprias credenciais seguras para evitar impersonação ou edição indevida de dados.' })}
                  </p>
                  <button
                    className="btn-primary"
                    onClick={() => setIsAuthOpen(true)}
                    style={{ padding: '0.65rem 1.5rem' }}
                  >
                    {t('login')}
                  </button>
                </div>
              )
            )}

            {activeTab === 'suggestions' && (
              <SmartSuggestions
                event={currentEvent}
                isOrganizer={isOrganizer}
                onConfirmSlot={handleConfirmSlot}
              />
            )}

            {activeTab === 'locations' && (
              <LocationSuggestionsView
                event={currentEvent}
                currentUser={currentUser}
                isOrganizer={isOrganizer}
                onToggleAllowSuggestions={handleToggleLocationSuggestions}
                onAddLocationSuggestion={handleAddLocationSuggestion}
                onVoteLocation={handleVoteLocation}
                onSelectOfficialLocation={handleSelectOfficialLocation}
              />
            )}
          </section>
        </div>
      </main>

      {/* Modais */}
      {isAuthOpen && (
        <AuthModal
          onAuthSuccess={handleAuthSuccess}
          onClose={() => setIsAuthOpen(false)}
          canClose={true}
        />
      )}

      {isCreateOpen && currentUser && (
        <EventCreatorModal
          currentUser={currentUser}
          onClose={() => setIsCreateOpen(false)}
          onCreateEvent={handleCreateEvent}
        />
      )}

      {isHistoryOpen && (
        <MyEventsModal
          events={events}
          currentUser={currentUser || { id: 'anonymous' }}
          currentEventId={currentEvent.id}
          onSelectEvent={(id) => setCurrentEventId(id)}
          onClose={() => setIsHistoryOpen(false)}
          onUpdateEventStatus={handleUpdateEventStatus}
        />
      )}

      {isShareOpen && (
        <ShareModal
          event={currentEvent}
          onClose={() => setIsShareOpen(false)}
        />
      )}

      {isParticipantsOpen && (
        <ParticipantsModal
          event={currentEvent}
          currentUser={currentUser}
          isOrganizer={isOrganizer}
          onClose={() => setIsParticipantsOpen(false)}
          onRemoveParticipant={handleRemoveParticipant}
          onOpenShare={() => setIsShareOpen(true)}
        />
      )}

      {isAvatarModalOpen && currentUser && (
        <ProfileAvatarModal
          currentUser={currentUser}
          onClose={() => setIsAvatarModalOpen(false)}
          onSaveAvatar={handleSaveAvatar}
        />
      )}

      {/* Toast flutuante */}
      {toastMessage && (
        <div className="toast">
          <CheckCircle2 size={18} color="#4ade80" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
