import React, { useState, useEffect, useRef } from 'react';
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
  RotateCcw,
  ChevronDown,
  Check,
  Pencil,
  Trash2
} from 'lucide-react';
import Navbar from './components/Navbar';
import SmartSuggestions from './components/SmartSuggestions';
import CalendarAvailabilityView from './components/CalendarAvailabilityView';
import HeatmapView from './components/HeatmapView';
import ConfirmedBanner from './components/ConfirmedBanner';
import EventCreatorModal from './components/EventCreatorModal';
import EditEventModal from './components/EditEventModal';
import MyEventsModal from './components/MyEventsModal';
import ShareModal from './components/ShareModal';
import AuthModal from './components/AuthModal';
import LocationSuggestionsView from './components/LocationSuggestionsView';
import ParticipantsModal from './components/ParticipantsModal';
import Avatar from './components/Avatar';
import ProfileAvatarModal from './components/ProfileAvatarModal';
import EventStatusBadge from './components/EventStatusBadge';
import OnboardingTour from './components/OnboardingTour';
import AdSenseBanner from './components/AdSenseBanner';
import {
  fetchEvents,
  subscribeToEventsRealtime,
  createEventInDb,
  joinEventInDb,
  removeParticipantFromDb,
  saveAvailabilityInDb,
  updateEventFieldsInDb,
  deleteEventFromDb,
  addTimeSuggestionInDb,
  voteTimeSuggestionInDb,
  removeTimeSuggestionInDb,
  addLocationSuggestionInDb,
  voteLocationInDb,
  removeLocationSuggestionInDb,
  createDemoEventForUser
} from './services/storage';
import {
  getCurrentSession,
  subscribeToAuth,
  logoutUser,
  updateUserAvatar
} from './services/auth';
import { useI18n } from './services/i18n';

export default function App() {
  const { t, lang } = useI18n();
  const [events, setEvents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [currentEventId, setCurrentEventId] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('event') || '';
  });

  const [activeTab, setActiveTab] = useState('heatmap'); // 'heatmap' (tela principal) | 'voting' | 'suggestions' | 'locations'
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState('week');
  const [joinConfirmation, setJoinConfirmation] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [isMobileTabsOpen, setIsMobileTabsOpen] = useState(false);
  const mobileTabsRef = useRef(null);

  // Fecha o menu de abas mobile ao clicar fora
  useEffect(() => {
    function handleClickOutsideTabs(event) {
      if (mobileTabsRef.current && !mobileTabsRef.current.contains(event.target)) {
        setIsMobileTabsOpen(false);
      }
    }
    if (isMobileTabsOpen) {
      document.addEventListener('mousedown', handleClickOutsideTabs);
      document.addEventListener('touchstart', handleClickOutsideTabs);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideTabs);
      document.removeEventListener('touchstart', handleClickOutsideTabs);
    };
  }, [isMobileTabsOpen]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const refreshEvents = async ({ silent = false } = {}) => {
    if (!silent) setLoadError('');
    try {
      const loaded = await fetchEvents();
      setEvents(loaded);
      setCurrentEventId(prevId => {
        if (prevId && loaded.some(e => e.id === prevId)) return prevId;
        return loaded[0]?.id || '';
      });
    } catch (err) {
      if (!silent) {
        setLoadError(err.message || 'Não foi possível carregar os eventos do servidor.');
      } else {
        console.error(err);
      }
    }
  };

  // Hidrata sessão e eventos do Supabase + assina Realtime e mudanças de Auth
  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setIsLoadingInitial(true);
      const safetyTimer = setTimeout(() => {
        setIsLoadingInitial(false);
      }, 3000);

      try {
        const [sessionUser, initialEvents] = await Promise.all([
          getCurrentSession().catch(() => null),
          fetchEvents().catch(err => {
            console.error('Erro ao carregar eventos:', err);
            return [];
          })
        ]);
        if (!active) return;
        setCurrentUser(sessionUser);
        setEvents(initialEvents);
        setCurrentEventId(prevId => {
          if (prevId && initialEvents.some(e => e.id === prevId)) return prevId;
          return initialEvents[0]?.id || '';
        });
      } catch (err) {
        if (active) {
          setLoadError(err.message || 'Erro ao conectar com o Supabase.');
        }
      } finally {
        clearTimeout(safetyTimer);
        setIsLoadingInitial(false);
      }
    }

    bootstrap();

    const unsubscribeAuth = subscribeToAuth(profile => {
      if (active) setCurrentUser(profile);
    });

    const unsubscribeRealtime = subscribeToEventsRealtime(() => {
      if (active) refreshEvents({ silent: true });
    });

    return () => {
      active = false;
      unsubscribeAuth();
      unsubscribeRealtime();
    };
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    showToast('Você saiu da sua conta.');
  };

  const handleAuthSuccess = (session) => {
    setCurrentUser(session);
    setIsAuthOpen(false);
    showToast(`Bem-vindo, ${session.name}!`);
  };

  const handleSaveAvatar = async (newAvatar) => {
    if (!currentUser) return;
    const updatedSession = await updateUserAvatar(currentUser.id, newAvatar);
    const finalAvatar = updatedSession.avatar;
    setCurrentUser({ ...updatedSession });

    setEvents(prevEvents =>
      prevEvents.map(evt => {
        let evtModified = false;
        let updatedOrganizer = evt.organizer;
        if (evt.organizer?.id === currentUser.id) {
          updatedOrganizer = { ...evt.organizer, avatar: finalAvatar };
          evtModified = true;
        }

        const updatedParticipants = (evt.participants || []).map(p => {
          if (p.id === currentUser.id) {
            evtModified = true;
            return { ...p, avatar: finalAvatar };
          }
          return p;
        });

        const updatedSuggestions = (evt.customSuggestions || []).map(sug => {
          if (sug.creator?.id === currentUser.id) {
            evtModified = true;
            return { ...sug, creator: { ...sug.creator, avatar: finalAvatar } };
          }
          return sug;
        });

        const updatedLocations = (evt.locationSuggestions || []).map(loc => {
          if (loc.creator?.id === currentUser.id) {
            evtModified = true;
            return { ...loc, creator: { ...loc.creator, avatar: finalAvatar } };
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

    showToast(finalAvatar ? t('profileSuccessToast') : t('profileInitialsToast'));
  };

  const currentEvent = events.find(e => e.id === currentEventId) || events[0] || null;

  // Inicia o onboarding automaticamente no primeiro acesso ou via URL (?tour=true)
  useEffect(() => {
    if (isLoadingInitial || !currentEvent) return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tourParam = urlParams.get('tour');
      const seen = localStorage.getItem('event_schedule_onboarding_completed');

      if (tourParam === 'true' || tourParam === '1' || !seen) {
        const timer = setTimeout(() => {
          setIsTourOpen(true);
        }, 700);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('Erro ao ler status do onboarding', e);
    }
  }, [isLoadingInitial, currentEvent?.id]);

  // Auto-adiciona o usuário ao acessar o link do evento
  useEffect(() => {
    if (!currentUser || !currentEvent) return;

    const isAlreadyParticipant = (currentEvent.participants || []).some(p => p.id === currentUser.id);

    if (!isAlreadyParticipant) {
      const targetEventId = currentEvent.id;
      const targetEventTitle = currentEvent.title;
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
          if (evt.id !== targetEventId) return evt;
          if ((evt.participants || []).some(p => p.id === currentUser.id)) return evt;
          return {
            ...evt,
            participants: [...(evt.participants || []), newParticipant]
          };
        })
      );

      joinEventInDb(targetEventId, currentUser.id)
        .then(() => {
          setJoinConfirmation({
            eventName: targetEventTitle,
            userName: currentUser.name
          });
          showToast(`✓ Você foi adicionado automaticamente ao evento "${targetEventTitle}"!`);
        })
        .catch(err => {
          console.error(err);
          refreshEvents({ silent: true });
        });
    }
  }, [currentEvent?.id, currentUser?.id]);

  const isOrganizer = Boolean(currentUser && currentEvent?.organizer?.id === currentUser.id);

  // Organizador remove participante do evento
  const handleRemoveParticipant = async (participantId, participantName) => {
    if (!isOrganizer || !currentEvent) return;

    if (participantId === currentEvent.organizer?.id) {
      alert('O organizador do evento não pode ser removido.');
      return;
    }

    const confirmed = window.confirm(`Tem certeza que deseja remover ${participantName} deste evento?`);
    if (!confirmed) return;

    const targetEventId = currentEvent.id;
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== targetEventId) return evt;
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

    try {
      await removeParticipantFromDb(targetEventId, participantId);
      showToast(`${participantName} foi removido do evento pelo organizador.`);
    } catch (err) {
      showToast(err.message || 'Erro ao remover participante.');
      refreshEvents({ silent: true });
    }
  };

  // Atualiza disponibilidade do participante logado
  const handleSaveAvailability = async (updatedParticipantData) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    if (!currentEvent) return;

    const targetEventId = currentEvent.id;
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== targetEventId) return evt;

        const existingIndex = evt.participants.findIndex(p => p.id === updatedParticipantData.userId);
        const updatedParticipants = [...evt.participants];

        const participantObj = {
          id: updatedParticipantData.userId,
          name: updatedParticipantData.name,
          email: updatedParticipantData.email,
          avatar: updatedParticipantData.avatar,
          availabilities: updatedParticipantData.availabilities || {},
          customIntervals: updatedParticipantData.customIntervals || [],
          suggestions: updatedParticipantData.suggestions || [],
          updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
          updatedParticipants[existingIndex] = participantObj;
        } else {
          updatedParticipants.push(participantObj);
        }

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

    try {
      await saveAvailabilityInDb(targetEventId, updatedParticipantData);
      showToast('Disponibilidade salva com sucesso!');
      setActiveTab('heatmap');
    } catch (err) {
      showToast(err.message || 'Erro ao salvar disponibilidade.');
      refreshEvents({ silent: true });
    }
  };

  // Organizador confirma um horário
  const handleConfirmSlot = async (slot) => {
    if (!isOrganizer || !currentEvent) {
      alert('Apenas o organizador pode confirmar o horário final do evento.');
      return;
    }

    const targetEventId = currentEvent.id;
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== targetEventId) return evt;
        return {
          ...evt,
          status: 'confirmed',
          confirmedSlot: slot
        };
      })
    );

    try {
      await updateEventFieldsInDb(targetEventId, {
        status: 'confirmed',
        confirmed_slot: slot
      });
      showToast(`Horário confirmado com sucesso para ${slot.date}!`);
    } catch (err) {
      showToast(err.message || 'Erro ao confirmar horário.');
      refreshEvents({ silent: true });
    }
  };

  // Organizador reabre a votação
  const handleReopenVoting = async () => {
    if (!isOrganizer || !currentEvent) return;
    const targetEventId = currentEvent.id;
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== targetEventId) return evt;
        return {
          ...evt,
          status: 'voting',
          confirmedSlot: null
        };
      })
    );

    try {
      await updateEventFieldsInDb(targetEventId, {
        status: 'voting',
        confirmed_slot: null
      });
      showToast('Votação reaberta para os participantes!');
    } catch (err) {
      showToast(err.message || 'Erro ao reabrir votação.');
      refreshEvents({ silent: true });
    }
  };

  // Organizador altera status do evento (voting, confirmed, completed, canceled)
  const handleUpdateEventStatus = async (newStatus, targetEventId = currentEvent?.id) => {
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

    try {
      await updateEventFieldsInDb(targetEventId, { status: newStatus });
      const labels = {
        voting: t('actionReopenVoting') + ' (Pendente)',
        confirmed: t('statusConfirmed'),
        completed: t('statusCompleted'),
        canceled: t('statusCanceled')
      };
      showToast(`✓ Status alterado para: ${labels[newStatus] || newStatus}`);
    } catch (err) {
      showToast(err.message || 'Erro ao alterar status.');
      refreshEvents({ silent: true });
    }
  };

  // Criação de novo evento
  const handleCreateEvent = async (newEvent) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    setEvents(prev => [newEvent, ...prev]);
    setCurrentEventId(newEvent.id);
    setIsCreateOpen(false);

    try {
      await createEventInDb(newEvent, currentUser.id);
      await refreshEvents({ silent: true });
      showToast('Novo evento criado com sucesso!');
    } catch (err) {
      showToast(err.message || 'Erro ao criar evento.');
      refreshEvents({ silent: true });
    }
  };

  // Organizador edita dados do evento (título, duração, local, descrição)
  const handleSaveEventDetails = async (updatedFields) => {
    if (!isOrganizer || !currentEvent) return;

    const targetEventId = currentEvent.id;
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== targetEventId) return evt;
        return {
          ...evt,
          title: updatedFields.title,
          duration: updatedFields.duration,
          locationType: updatedFields.locationType,
          locationDetails: updatedFields.locationDetails,
          description: updatedFields.description
        };
      })
    );

    try {
      await updateEventFieldsInDb(targetEventId, {
        title: updatedFields.title,
        duration: updatedFields.duration,
        location_type: updatedFields.locationType,
        location_details: updatedFields.locationDetails,
        description: updatedFields.description
      });
      showToast('Dados do evento atualizados com sucesso!');
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar dados do evento.');
      refreshEvents({ silent: true });
    }
  };

  // Organizador exclui o evento
  const handleDeleteEvent = async (eventIdToDelete) => {
    const targetId = eventIdToDelete || currentEvent?.id;
    if (!targetId) return;

    const eventToDelete = events.find(e => e.id === targetId);
    if (!eventToDelete) return;
    if (eventToDelete.organizer?.id !== currentUser?.id) {
      showToast('Apenas o organizador pode excluir este evento.');
      return;
    }

    // Atualização otimista
    const remainingEvents = events.filter(e => e.id !== targetId);
    setEvents(remainingEvents);
    if (currentEventId === targetId) {
      setCurrentEventId(remainingEvents[0]?.id || '');
    }
    setIsEditEventOpen(false);

    try {
      await deleteEventFromDb(targetId);
      showToast('Evento excluído com sucesso.');
    } catch (err) {
      showToast(err.message || 'Erro ao excluir evento no banco.');
      refreshEvents({ silent: true });
    }
  };

  const handleSeedDemoEvent = async () => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    setIsSeedingDemo(true);
    try {
      const demoId = await createDemoEventForUser(currentUser);
      await refreshEvents({ silent: true });
      setCurrentEventId(demoId);
      showToast('Evento de demonstração criado com sucesso!');
    } catch (err) {
      showToast(err.message || 'Erro ao criar evento de demonstração.');
    } finally {
      setIsSeedingDemo(false);
    }
  };

  // Adiciona nova sugestão coletiva de dia e horário
  const handleAddSuggestion = async (newSug) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    if (!currentEvent) return;

    const targetEventId = currentEvent.id;
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== targetEventId) return evt;
        const currentList = evt.customSuggestions || [];
        return {
          ...evt,
          customSuggestions: [newSug, ...currentList]
        };
      })
    );

    try {
      await addTimeSuggestionInDb(targetEventId, newSug, currentUser.id);
      showToast('Nova sugestão cadastrada para todos os participantes!');
    } catch (err) {
      showToast(err.message || 'Erro ao salvar sugestão de horário.');
      refreshEvents({ silent: true });
    }
  };

  // Vota em uma sugestão coletiva existente
  const handleVoteSuggestion = async (sugId, voteType) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    if (!currentEvent) return;

    const targetEventId = currentEvent.id;
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== targetEventId) return evt;
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

    try {
      await voteTimeSuggestionInDb(sugId, currentUser.id, voteType);
      showToast(`Voto registrado como ${voteType === 'available' ? 'Disponível ✓' : 'Indisponível ✗'}!`);
    } catch (err) {
      showToast(err.message || 'Erro ao registrar voto.');
      refreshEvents({ silent: true });
    }
  };

  // Organizador remove uma sugestão de dia e horário
  const handleRemoveTimeSuggestion = async (sugId) => {
    if (!isOrganizer || !currentEvent) return;

    const targetEventId = currentEvent.id;
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== targetEventId) return evt;
        return {
          ...evt,
          customSuggestions: (evt.customSuggestions || []).filter(s => s.id !== sugId)
        };
      })
    );

    try {
      await removeTimeSuggestionInDb(sugId);
      showToast('Sugestão de horário removida com sucesso!');
    } catch (err) {
      showToast(err.message || 'Erro ao remover sugestão de horário.');
      refreshEvents({ silent: true });
    }
  };

  // Alterna permissão de sugestões de locais pelo organizador
  const handleToggleLocationSuggestions = async (allowed) => {
    if (!isOrganizer || !currentEvent) return;
    const targetEventId = currentEvent.id;
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== targetEventId) return evt;
        return {
          ...evt,
          allowLocationSuggestions: allowed
        };
      })
    );

    try {
      await updateEventFieldsInDb(targetEventId, {
        allow_location_suggestions: allowed
      });
      showToast(`Votação de locais ${allowed ? 'aberta' : 'encerrada'} pelo organizador!`);
    } catch (err) {
      showToast(err.message || 'Erro ao alterar permissão de locais.');
      refreshEvents({ silent: true });
    }
  };

  // Adiciona nova sugestão de local proposta por qualquer participante
  const handleAddLocationSuggestion = async (newLocation) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    if (!currentEvent) return;

    const targetEventId = currentEvent.id;
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== targetEventId) return evt;
        const currentLocs = evt.locationSuggestions || [];
        return {
          ...evt,
          locationSuggestions: [newLocation, ...currentLocs]
        };
      })
    );

    try {
      await addLocationSuggestionInDb(targetEventId, newLocation, currentUser.id);
      showToast('Nova sugestão de local cadastrada com sucesso!');
    } catch (err) {
      showToast(err.message || 'Erro ao salvar sugestão de local.');
      refreshEvents({ silent: true });
    }
  };

  // Vota em uma sugestão de local (aprovar / reprovar)
  const handleVoteLocation = async (locationId, voteType) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    if (!currentEvent) return;

    const targetEventId = currentEvent.id;
    const targetLoc = (currentEvent.locationSuggestions || []).find(l => l.id === locationId);
    const shouldRemoveVote = targetLoc?.votes?.[currentUser.id] === voteType;

    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== targetEventId) return evt;
        const updatedLocs = (evt.locationSuggestions || []).map(loc => {
          if (loc.id !== locationId) return loc;
          const newVotes = { ...(loc.votes || {}) };
          if (shouldRemoveVote) {
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

    try {
      await voteLocationInDb(locationId, currentUser.id, voteType, shouldRemoveVote);
      showToast(
        shouldRemoveVote
          ? 'Voto removido.'
          : `Voto registrado (${voteType === 'approve' ? 'Aprovado 👍' : 'Reprovado 👎'})!`
      );
    } catch (err) {
      showToast(err.message || 'Erro ao votar no local.');
      refreshEvents({ silent: true });
    }
  };

  // Organizador seleciona um local sugerido como o oficial
  const handleSelectOfficialLocation = async (title, address) => {
    if (!isOrganizer || !currentEvent) return;

    const targetEventId = currentEvent.id;
    const fullLocationStr = address ? `${title} (${address})` : title;
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== targetEventId) return evt;
        return {
          ...evt,
          locationDetails: fullLocationStr
        };
      })
    );

    try {
      await updateEventFieldsInDb(targetEventId, {
        location_details: fullLocationStr
      });
      showToast(`Local oficial atualizado para "${title}"!`);
    } catch (err) {
      showToast(err.message || 'Erro ao definir local oficial.');
      refreshEvents({ silent: true });
    }
  };

  // Organizador remove uma sugestão de local
  const handleRemoveLocationSuggestion = async (locationId) => {
    if (!isOrganizer || !currentEvent) return;

    const targetEventId = currentEvent.id;
    setEvents(prevEvents =>
      prevEvents.map(evt => {
        if (evt.id !== targetEventId) return evt;
        return {
          ...evt,
          locationSuggestions: (evt.locationSuggestions || []).filter(l => l.id !== locationId)
        };
      })
    );

    try {
      await removeLocationSuggestionInDb(locationId);
      showToast('Sugestão de local removida com sucesso!');
    } catch (err) {
      showToast(err.message || 'Erro ao remover sugestão de local.');
      refreshEvents({ silent: true });
    }
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
        onStartTour={() => setIsTourOpen(true)}
      />

      <main className="app-main">
        {isLoadingInitial ? (
          <div style={{
            background: 'white',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <Clock size={32} color="var(--primary)" style={{ margin: '0 auto 0.75rem auto' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Sincronizando eventos...
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Conectando ao banco de dados para carregar disponibilidades e votações.
            </p>
          </div>
        ) : loadError ? (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: 'var(--radius-lg)',
            padding: '2.5rem 1.5rem',
            textAlign: 'center'
          }}>
            <XCircle size={32} color="#b91c1c" style={{ margin: '0 auto 0.75rem auto' }} />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#991b1b' }}>
              Falha ao carregar os dados
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#b91c1c', marginTop: 6, marginBottom: '1.25rem' }}>
              {loadError}
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => refreshEvents()}
              style={{ padding: '0.65rem 1.35rem' }}
            >
              <RotateCcw size={16} />
              <span>Tentar novamente</span>
            </button>
          </div>
        ) : !currentEvent ? (
          <div style={{
            background: 'white',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '3.5rem 1.5rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-sm)',
            maxWidth: 620,
            margin: '1.5rem auto'
          }}>
            <Calendar size={38} color="var(--primary)" style={{ margin: '0 auto 0.85rem auto' }} />
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Nenhum evento cadastrado ainda
            </h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', marginTop: 8, marginBottom: '1.5rem' }}>
              {currentUser
                ? 'Crie o primeiro evento da sua agenda ou gere um evento de demonstração para testar a votação em grupo.'
                : 'Entre na sua conta ou crie um cadastro rápido para organizar seu primeiro evento coletivo.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  if (!currentUser) {
                    setIsAuthOpen(true);
                  } else {
                    setIsCreateOpen(true);
                  }
                }}
                style={{ padding: '0.7rem 1.4rem' }}
              >
                <CalendarCheck2 size={18} />
                <span>{currentUser ? 'Criar Primeiro Evento' : 'Entrar e Criar Evento'}</span>
              </button>
              {currentUser && (
                <button
                  type="button"
                  disabled={isSeedingDemo}
                  className="btn-secondary"
                  onClick={handleSeedDemoEvent}
                  style={{ padding: '0.7rem 1.25rem' }}
                >
                  <span>{isSeedingDemo ? 'Criando exemplo...' : 'Gerar Evento de Exemplo'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
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
          <aside className="event-sidebar" data-tour="event-sidebar">
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

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h1 className="event-title" style={{ margin: 0, flex: 1 }}>{currentEvent.title}</h1>
              {isOrganizer && (
                <button
                  type="button"
                  onClick={() => setIsEditEventOpen(true)}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--text-main)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                  title={t('editEvent')}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                >
                  <Pencil size={13} color="var(--primary)" />
                  <span>{t('editEvent')}</span>
                </button>
              )}
            </div>

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

            {/* Definição Unificada das Abas (Menu Dropdown no Mobile e Abas no Desktop) */}
            {(() => {
              const tabsConfig = [
                {
                  id: 'heatmap',
                  label: t('tabGroupOverview'),
                  icon: Users,
                  badge: currentEvent.privacy === 'private' ? (
                    <Lock size={12} color="#b45309" />
                  ) : null,
                  tourAttr: 'tab-heatmap'
                },
                {
                  id: 'voting',
                  label: t('tabMyAvailability'),
                  icon: CalendarCheck2,
                  badge: null,
                  tourAttr: 'tab-voting'
                },
                {
                  id: 'suggestions',
                  label: t('tabSmartSuggestions'),
                  icon: Sparkles,
                  badge: null,
                  tourAttr: 'tab-suggestions'
                },
                {
                  id: 'locations',
                  label: t('tabLocations'),
                  icon: MapPin,
                  badge: (currentEvent.locationSuggestions?.length > 0 || currentEvent.allowLocationSuggestions) ? (
                    <span className="tab-badge" style={{ background: '#ecfdf5', color: '#166534' }}>
                      {currentEvent.locationSuggestions?.length || 0}
                    </span>
                  ) : null,
                  tourAttr: 'tab-locations'
                }
              ];

              const currentTabObj = tabsConfig.find(tab => tab.id === activeTab) || tabsConfig[0];
              const CurrentTabIcon = currentTabObj.icon;

              return (
                <>
                  {/* Menu Dropdown de Abas para Mobile */}
                  <div
                    className="mobile-tab-menu-container"
                    ref={mobileTabsRef}
                    data-tour="view-tabs"
                  >
                    <button
                      type="button"
                      className="mobile-tab-menu-trigger"
                      onClick={() => setIsMobileTabsOpen(prev => !prev)}
                      aria-expanded={isMobileTabsOpen}
                      aria-haspopup="listbox"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <CurrentTabIcon size={18} color="var(--primary)" />
                        <span>{currentTabObj.label}</span>
                        {currentTabObj.badge}
                      </div>
                      <ChevronDown
                        size={18}
                        color="var(--text-muted)"
                        style={{
                          transform: isMobileTabsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease'
                        }}
                      />
                    </button>

                    {isMobileTabsOpen && (
                      <div className="mobile-tab-menu-dropdown" role="listbox">
                        {tabsConfig.map(tab => {
                          const TabIcon = tab.icon;
                          const isActive = activeTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              type="button"
                              role="option"
                              aria-selected={isActive}
                              data-tour={tab.tourAttr}
                              className={`mobile-tab-menu-item ${isActive ? 'active' : ''}`}
                              onClick={() => {
                                setActiveTab(tab.id);
                                setIsMobileTabsOpen(false);
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <TabIcon size={17} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
                                <span>{tab.label}</span>
                                {tab.badge}
                              </div>
                              {isActive && <Check size={16} color="var(--primary)" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Abas Horizontais Tradicionais para Desktop */}
                  <div className="view-tabs desktop-view-tabs" data-tour="view-tabs">
                    {tabsConfig.map(tab => {
                      const TabIcon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          className={`tab-btn ${isActive ? 'active' : ''}`}
                          onClick={() => setActiveTab(tab.id)}
                          data-tour={tab.tourAttr}
                        >
                          <TabIcon size={17} />
                          <span>{tab.label}</span>
                          {tab.badge}
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            {/* Conteúdo da Aba Ativa */}
            {activeTab === 'heatmap' && (
              <HeatmapView
                event={currentEvent}
                currentUser={currentUser}
                isOrganizer={isOrganizer}
                onAddSuggestion={handleAddSuggestion}
                onVoteSuggestion={handleVoteSuggestion}
                onConfirmSlot={handleConfirmSlot}
                onRemoveTimeSuggestion={handleRemoveTimeSuggestion}
                onAddLocationSuggestion={handleAddLocationSuggestion}
                onVoteLocation={handleVoteLocation}
                onSelectOfficialLocation={handleSelectOfficialLocation}
                onRemoveLocationSuggestion={handleRemoveLocationSuggestion}
                onToggleAllowLocationSuggestions={handleToggleLocationSuggestions}
                onOpenAuth={() => setIsAuthOpen(true)}
              />
            )}

            {activeTab === 'voting' && (
              currentUser ? (
                <CalendarAvailabilityView
                  event={currentEvent}
                  currentUser={currentUser}
                  isOrganizer={isOrganizer}
                  onSaveAvailability={handleSaveAvailability}
                  onAddSuggestion={handleAddSuggestion}
                  onVoteSuggestion={handleVoteSuggestion}
                  onConfirmSlot={handleConfirmSlot}
                  onRemoveTimeSuggestion={handleRemoveTimeSuggestion}
                  controlledViewMode={calendarViewMode}
                  onViewModeChange={setCalendarViewMode}
                />
              ) : (
                <div data-tour="calendar-availability-container" style={{ textAlign: 'center', padding: '4rem 1.5rem', background: '#f8fafc', borderRadius: 'var(--radius-md)' }}>
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
                onRemoveLocationSuggestion={handleRemoveLocationSuggestion}
              />
            )}
          </section>
        </div>
          </>
        )}
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

      {isEditEventOpen && currentEvent && isOrganizer && (
        <EditEventModal
          event={currentEvent}
          onSave={handleSaveEventDetails}
          onDelete={handleDeleteEvent}
          onClose={() => setIsEditEventOpen(false)}
        />
      )}

      {isHistoryOpen && (
        <MyEventsModal
          events={events}
          currentUser={currentUser || { id: 'anonymous' }}
          currentEventId={currentEvent?.id || ''}
          onSelectEvent={(id) => setCurrentEventId(id)}
          onClose={() => setIsHistoryOpen(false)}
          onUpdateEventStatus={handleUpdateEventStatus}
          onDeleteEvent={handleDeleteEvent}
          onEditEvent={(evt) => {
            setCurrentEventId(evt.id);
            setIsEditEventOpen(true);
            setIsHistoryOpen(false);
          }}
        />
      )}

      {isShareOpen && currentEvent && (
        <ShareModal
          event={currentEvent}
          onClose={() => setIsShareOpen(false)}
        />
      )}

      {isParticipantsOpen && currentEvent && (
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

      {/* Onboarding Tour Interativo */}
      <OnboardingTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        activeTab={activeTab}
        onSetTab={setActiveTab}
        calendarViewMode={calendarViewMode}
        onSetCalendarViewMode={setCalendarViewMode}
      />
    </div>
  );
}
