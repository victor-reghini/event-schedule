import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Trash2,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Save,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Bookmark
} from 'lucide-react';
import { timeToMinutes, minutesToTime } from '../services/schedulerAlgorithm';
import { useI18n } from '../services/i18n';
import Avatar from './Avatar';
import {
  DAY_NAMES,
  roundTo15,
  getDayOfWeekFromDateStr,
  getUserSavedRoutines,
  upsertUserSavedRoutine,
  removeUserSavedRoutine,
  applyRoutinesToDates,
  buildAvailabilitiesMap
} from '../services/userAvailability';

const START_HOUR = 8;
const END_HOUR = 22;
const HOUR_HEIGHT = 60; // 60px por hora = 1px por minuto (15m = 15px)

// Reconstrói intervalos mesclados a partir de um mapa de disponibilidades avulsas
export function deriveIntervalsFromAvailabilities(availMap) {
  if (!availMap || Object.keys(availMap).length === 0) return [];

  const byDate = {};
  for (const [key, status] of Object.entries(availMap)) {
    if (!status || status === 'neutral') continue;
    const parts = key.split('_');
    if (parts.length < 2) continue;
    const dateStr = parts[0];
    const timeStr = parts[1];
    if (!byDate[dateStr]) byDate[dateStr] = [];
    byDate[dateStr].push({
      timeStr,
      minutes: timeToMinutes(timeStr),
      status
    });
  }

  const result = [];
  for (const [dateStr, items] of Object.entries(byDate)) {
    items.sort((a, b) => a.minutes - b.minutes);

    let current = null;
    for (const item of items) {
      const step = item.minutes % 60 !== 0 ? 15 : 60;
      const endM = item.minutes + step;

      if (!current) {
        current = {
          id: `derived-${dateStr}-${item.minutes}`,
          dateStr,
          startM: item.minutes,
          endM,
          status: item.status
        };
      } else if (current.status === item.status && item.minutes <= current.endM) {
        current.endM = Math.max(current.endM, endM);
      } else {
        result.push({
          id: current.id,
          dateStr: current.dateStr,
          startTime: minutesToTime(current.startM),
          endTime: minutesToTime(current.endM),
          status: current.status
        });
        current = {
          id: `derived-${dateStr}-${item.minutes}`,
          dateStr,
          startM: item.minutes,
          endM,
          status: item.status
        };
      }
    }
    if (current) {
      result.push({
        id: current.id,
        dateStr: current.dateStr,
        startTime: minutesToTime(current.startM),
        endTime: minutesToTime(current.endM),
        status: current.status
      });
    }
  }

  return result;
}

export default function CalendarAvailabilityView({
  event,
  currentUser,
  isOrganizer: propIsOrganizer,
  onSaveAvailability,
  onAddSuggestion,
  onVoteSuggestion,
  onConfirmSlot,
  onRemoveTimeSuggestion,
  controlledViewMode,
  onViewModeChange
}) {
  const { t, daysOfWeek, monthNames, lang } = useI18n();
  const isOrganizer = propIsOrganizer ?? (currentUser && event.organizer?.id === currentUser.id);

  // Encontra participante atual
  const participantData = event.participants.find(p => p.id === currentUser?.id) || {
    availabilities: {},
    customIntervals: [],
    suggestions: []
  };

  const [availabilities, setAvailabilities] = useState({ ...participantData.availabilities });
  const [customIntervals, setCustomIntervals] = useState(() => {
    if (participantData.customIntervals && participantData.customIntervals.length > 0) {
      return participantData.customIntervals;
    }
    return deriveIntervalsFromAvailabilities(participantData.availabilities);
  });

  const [suggestionNote, setSuggestionNote] = useState(
    (participantData.suggestions && participantData.suggestions[0]) || ''
  );
  const [hasSaved, setHasSaved] = useState(false);

  // Sincroniza estado caso o usuário ou participante mude
  useEffect(() => {
    const pData = event.participants.find(p => p.id === currentUser?.id) || {
      availabilities: {},
      customIntervals: [],
      suggestions: []
    };
    setAvailabilities({ ...pData.availabilities });
    if (pData.customIntervals && pData.customIntervals.length > 0) {
      setCustomIntervals(pData.customIntervals);
    } else {
      setCustomIntervals(deriveIntervalsFromAvailabilities(pData.availabilities));
    }
    setSuggestionNote((pData.suggestions && pData.suggestions[0]) || '');
  }, [currentUser?.id, event.participants]);

  // Modo de visualização: 'month' | 'week' | 'day' | 'suggestions'
  const [internalViewMode, setInternalViewMode] = useState('week');
  const viewMode = controlledViewMode !== undefined ? controlledViewMode : internalViewMode;
  const setViewMode = (mode) => {
    setInternalViewMode(mode);
    if (onViewModeChange) onViewModeChange(mode);
  };

  // Data atual de navegação
  const initialDateStr = event.dates[0] || new Date().toISOString().split('T')[0];
  const [navDate, setNavDate] = useState(() => {
    const [y, m, d] = initialDateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  });

  // Estado para drag-to-select com precisão de 15 minutos
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null); // { dateStr, minutes }
  const [dragCurrent, setDragCurrent] = useState(null); // { dateStr, minutes }

  // Diálogo para cadastro ou edição de horário
  const [timeDialog, setTimeDialog] = useState(null);

  // Rotinas salvas no perfil do usuário
  const [userRoutines, setUserRoutines] = useState(() => {
    return currentUser?.id ? getUserSavedRoutines(currentUser.id) : [];
  });
  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [showRoutinePrompt, setShowRoutinePrompt] = useState(true);

  // Formulário para cadastrar rotina no perfil dentro do modal de rotinas
  const [newRoutineForm, setNewRoutineForm] = useState({
    title: '',
    status: 'unavailable',
    daysOfWeek: [2], // terça por padrão (ex: aulas nas terças à noite)
    startTime: '19:00',
    endTime: '22:00'
  });

  // Recarrega rotinas salvas quando currentUser mudar
  useEffect(() => {
    if (currentUser?.id) {
      setUserRoutines(getUserSavedRoutines(currentUser.id));
    } else {
      setUserRoutines([]);
    }
  }, [currentUser?.id]);

  // Formulário para criar nova sugestão coletiva
  const [isCreatingSuggestion, setIsCreatingSuggestion] = useState(false);
  const [newSugDate, setNewSugDate] = useState(initialDateStr);
  const [newSugStart, setNewSugStart] = useState('15:30');
  const [newSugEnd, setNewSugEnd] = useState('18:30');
  const [newSugTitle, setNewSugTitle] = useState('');

  // Horas para a grade lateral (08:00 às 22:00)
  const hours = [];
  for (let h = START_HOUR; h <= END_HOUR; h++) {
    hours.push(h);
  }

  const toDateStr = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handlePrev = () => {
    const next = new Date(navDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setNavDate(next);
  };

  const handleNext = () => {
    const next = new Date(navDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setNavDate(next);
  };

  const handleToday = () => {
    setNavDate(new Date());
  };

  // Abrir modal para editar bloco existente (Requirement 1)
  const handleEditInterval = (item) => {
    const dayOfWeek = getDayOfWeekFromDateStr(item.dateStr);
    const recDays = item.recurrenceDays && item.recurrenceDays.length ? item.recurrenceDays : [dayOfWeek];

    setTimeDialog({
      id: item.id,
      dateStr: item.dateStr,
      startTime: item.startTime,
      endTime: item.endTime,
      status: item.status || 'available',
      title: item.title || '',
      isRecurring: Boolean(item.isRecurring || item.recurrenceRuleId),
      recurrenceRuleId: item.recurrenceRuleId || null,
      recurrenceDays: recDays,
      saveToProfile: item.saveToProfile !== false,
      editScope: 'all', // 'all' (todas as ocorrências) | 'single' (apenas esta data)
      isEditing: true
    });
  };

  // Salva no modal (edição ou novo bloco) com suporte a recorrência e perfil (Requirements 1, 2, 3)
  const handleSaveIntervalModal = async () => {
    if (!timeDialog) return;
    const {
      id,
      dateStr,
      startTime,
      endTime,
      status,
      title = '',
      isRecurring = false,
      recurrenceRuleId = null,
      recurrenceDays = [],
      saveToProfile = false,
      editScope = 'all',
      isEditing = false
    } = timeDialog;

    const startM = timeToMinutes(startTime);
    const endM = timeToMinutes(endTime);

    if (startM >= endM) {
      alert('O horário de início deve ser anterior ao horário de término.');
      return;
    }

    const currentDow = getDayOfWeekFromDateStr(dateStr);
    const activeRecDays = isRecurring && recurrenceDays.length ? recurrenceDays : [currentDow];
    const ruleId = recurrenceRuleId || (isRecurring ? `rule-${Date.now()}-${Math.random().toString(36).substr(2, 4)}` : null);

    // Se marcado para salvar no perfil do usuário (Requirement 3)
    if (saveToProfile && currentUser?.id) {
      const routineObj = {
        id: ruleId || `routine-${Date.now()}`,
        title: title.trim() || (status === 'available' ? 'Livre' : 'Ocupado'),
        status,
        startTime,
        endTime,
        daysOfWeek: activeRecDays
      };
      const updatedRoutines = await upsertUserSavedRoutine(currentUser.id, routineObj);
      setUserRoutines(updatedRoutines);
    }

    let updatedList = [...customIntervals];

    if (isEditing) {
      // Edição de bloco existente
      if (isRecurring && ruleId && editScope === 'all') {
        const filtered = updatedList.filter(i => i.recurrenceRuleId !== ruleId && i.id !== id);
        const eventDatesPool = Array.from(new Set([
          ...(event.dates || []),
          ...(event.extraDates || []),
          dateStr
        ]));

        const newOccurrences = [];
        eventDatesPool.forEach(d => {
          const dow = getDayOfWeekFromDateStr(d);
          if (activeRecDays.includes(dow)) {
            newOccurrences.push({
              id: `int-${ruleId}-${d}`,
              recurrenceRuleId: ruleId,
              dateStr: d,
              startTime,
              endTime,
              status,
              title: title.trim(),
              isRecurring: true,
              recurrenceDays: activeRecDays,
              saveToProfile: Boolean(saveToProfile)
            });
          }
        });

        updatedList = [...filtered, ...newOccurrences];
      } else {
        // Altera apenas esta ocorrência
        updatedList = updatedList.map(item => {
          if (item.id === id) {
            return {
              ...item,
              dateStr,
              startTime,
              endTime,
              status,
              title: title.trim(),
              isRecurring: editScope === 'single' ? false : Boolean(isRecurring),
              recurrenceRuleId: editScope === 'single' ? null : ruleId,
              recurrenceDays: activeRecDays,
              saveToProfile: Boolean(saveToProfile)
            };
          }
          return item;
        });
      }
    } else {
      // Novo bloco
      if (isRecurring) {
        const eventDatesPool = Array.from(new Set([
          ...(event.dates || []),
          ...(event.extraDates || []),
          dateStr
        ]));

        const newOccurrences = [];
        eventDatesPool.forEach(d => {
          const dow = getDayOfWeekFromDateStr(d);
          if (activeRecDays.includes(dow)) {
            newOccurrences.push({
              id: `int-${ruleId}-${d}-${Math.random().toString(36).substr(2, 4)}`,
              recurrenceRuleId: ruleId,
              dateStr: d,
              startTime,
              endTime,
              status,
              title: title.trim(),
              isRecurring: true,
              recurrenceDays: activeRecDays,
              saveToProfile: Boolean(saveToProfile)
            });
          }
        });

        if (!newOccurrences.some(i => i.dateStr === dateStr)) {
          newOccurrences.push({
            id: `int-${ruleId}-${dateStr}`,
            recurrenceRuleId: ruleId,
            dateStr,
            startTime,
            endTime,
            status,
            title: title.trim(),
            isRecurring: true,
            recurrenceDays: activeRecDays,
            saveToProfile: Boolean(saveToProfile)
          });
        }

        updatedList = [...updatedList, ...newOccurrences];
      } else {
        updatedList.push({
          id: `int-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          dateStr,
          startTime,
          endTime,
          status,
          title: title.trim(),
          isRecurring: false,
          saveToProfile: Boolean(saveToProfile)
        });
      }
    }

    const updatedAvail = buildAvailabilitiesMap(updatedList);
    setCustomIntervals(updatedList);
    setAvailabilities(updatedAvail);
    setHasSaved(false);
    setTimeDialog(null);
  };

  // Exclui bloco pelo modal
  const handleDeleteFromModal = () => {
    if (!timeDialog || !timeDialog.id) return;
    const { id, recurrenceRuleId, isRecurring, editScope } = timeDialog;

    let updatedList;
    if (isRecurring && recurrenceRuleId && editScope === 'all') {
      updatedList = customIntervals.filter(i => i.recurrenceRuleId !== recurrenceRuleId && i.id !== id);
    } else {
      updatedList = customIntervals.filter(i => i.id !== id);
    }

    const updatedAvail = buildAvailabilitiesMap(updatedList);
    setCustomIntervals(updatedList);
    setAvailabilities(updatedAvail);
    setHasSaved(false);
    setTimeDialog(null);
  };

  // Remove intervalo cadastrado pelo botão 'x' rápido
  const handleRemoveInterval = (idToRemove) => {
    const item = customIntervals.find(i => i.id === idToRemove);
    if (!item) return;

    let updated;
    if (item.isRecurring && item.recurrenceRuleId) {
      const confirmAll = window.confirm(
        'Este bloco é recorrente. Deseja remover TODAS as ocorrências deste horário?\n\nOK: Remover todas as ocorrências\nCancelar: Remover apenas este dia'
      );
      if (confirmAll) {
        updated = customIntervals.filter(i => i.recurrenceRuleId !== item.recurrenceRuleId && i.id !== idToRemove);
      } else {
        updated = customIntervals.filter(i => i.id !== idToRemove);
      }
    } else {
      updated = customIntervals.filter(i => i.id !== idToRemove);
    }

    const updatedAvail = buildAvailabilitiesMap(updated);
    setCustomIntervals(updated);
    setAvailabilities(updatedAvail);
    setHasSaved(false);
  };

  // Aplica todas as rotinas salvas do perfil às datas deste evento (Requirement 3)
  const handleApplySavedRoutinesToEvent = () => {
    if (!userRoutines.length) {
      alert('Você ainda não possui rotinas salvas no seu perfil.');
      return;
    }

    const eventDatesPool = Array.from(new Set([
      ...(event.dates || []),
      ...(event.extraDates || [])
    ]));

    if (!eventDatesPool.length) {
      eventDatesPool.push(toDateStr(navDate));
    }

    const { newIntervals, addedCount } = applyRoutinesToDates(
      userRoutines,
      eventDatesPool,
      customIntervals
    );

    if (addedCount === 0) {
      alert('Todas as suas rotinas salvas já estão aplicadas às datas deste evento.');
      return;
    }

    const updatedAvail = buildAvailabilitiesMap(newIntervals);
    setCustomIntervals(newIntervals);
    setAvailabilities(updatedAvail);
    setHasSaved(false);
    setShowRoutinePrompt(false);
    setIsRoutineModalOpen(false);
  };

  // Criação de nova rotina pelo modal de gerenciamento de rotinas
  const handleCreateRoutineSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser?.id) return;
    if (!newRoutineForm.daysOfWeek.length) {
      alert('Selecione pelo menos um dia da semana para a rotina.');
      return;
    }
    if (timeToMinutes(newRoutineForm.startTime) >= timeToMinutes(newRoutineForm.endTime)) {
      alert('O horário de início deve ser anterior ao de término.');
      return;
    }

    const routineObj = {
      id: `routine-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newRoutineForm.title.trim() || (newRoutineForm.status === 'available' ? 'Livre' : 'Ocupado'),
      status: newRoutineForm.status,
      daysOfWeek: newRoutineForm.daysOfWeek,
      startTime: newRoutineForm.startTime,
      endTime: newRoutineForm.endTime
    };

    const updated = await upsertUserSavedRoutine(currentUser.id, routineObj);
    setUserRoutines(updated);
    setNewRoutineForm({
      title: '',
      status: 'unavailable',
      daysOfWeek: [2],
      startTime: '19:00',
      endTime: '22:00'
    });
  };

  // Remoção de uma rotina do perfil
  const handleRemoveRoutine = async (routineId) => {
    if (!currentUser?.id) return;
    const updated = await removeUserSavedRoutine(currentUser.id, routineId);
    setUserRoutines(updated);
  };

  // Eventos de arrastar com precisão de 15 minutos
  const handleMouseDown15 = (dateStr, minutes) => {
    setIsDragging(true);
    setDragStart({ dateStr, minutes });
    setDragCurrent({ dateStr, minutes });
  };

  const handleMouseEnter15 = (dateStr, minutes) => {
    if (isDragging && dragStart && dragStart.dateStr === dateStr) {
      setDragCurrent({ dateStr, minutes });
    }
  };

  // Garante que o arrastar seja finalizado mesmo se soltar o mouse fora
  useEffect(() => {
    if (isDragging) {
      const onGlobalMouseUp = () => {
        handleMouseUpSlot();
      };
      window.addEventListener('mouseup', onGlobalMouseUp);
      return () => window.removeEventListener('mouseup', onGlobalMouseUp);
    }
  }, [isDragging, dragStart, dragCurrent]);

  const handleMouseUpSlot = () => {
    if (isDragging && dragStart && dragCurrent && dragStart.dateStr === dragCurrent.dateStr) {
      const minM = Math.min(dragStart.minutes, dragCurrent.minutes);
      const maxM = Math.max(dragStart.minutes, dragCurrent.minutes) + 15;
      const sTime = minutesToTime(minM);
      const eTime = minutesToTime(maxM);
      const dow = getDayOfWeekFromDateStr(dragStart.dateStr);

      // Abre diálogo para escolher Livre ou Ocupado e ajustar minutos
      setTimeDialog({
        dateStr: dragStart.dateStr,
        startTime: sTime,
        endTime: eTime,
        status: 'available',
        title: '',
        isRecurring: false,
        recurrenceDays: [dow],
        saveToProfile: false,
        isEditing: false
      });
    }
    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  // Salvar disponibilidade completa do participante
  const handleSaveAvailability = () => {
    const extraDates = [];
    customIntervals.forEach(item => {
      if (!event.dates.includes(item.dateStr) && !extraDates.includes(item.dateStr)) {
        extraDates.push(item.dateStr);
      }
    });

    onSaveAvailability({
      userId: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      avatar: currentUser.avatar,
      availabilities,
      customIntervals,
      suggestions: suggestionNote ? [suggestionNote] : [],
      extraDates
    });

    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 3000);
  };

  // Submissão de nova sugestão coletiva
  const handleCreateSuggestionSubmit = (e) => {
    e.preventDefault();
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

    onAddSuggestion(suggestionObj);
    setIsCreatingSuggestion(false);
    setNewSugTitle('');
  };

  // Dias da semana
  const getDaysOfWeek = () => {
    const curr = new Date(navDate);
    const dayOfWeek = curr.getDay();
    const sunday = new Date(curr);
    sunday.setDate(curr.getDate() - dayOfWeek);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      weekDays.push(d);
    }
    return weekDays;
  };

  // Dias do mês
  const getDaysOfMonth = () => {
    const year = navDate.getFullYear();
    const month = navDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    const startOffset = firstDay.getDay();

    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  const isOrganizerSuggested = (dateStr) => {
    return event.dates.includes(dateStr);
  };

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

  const suggestionsList = event.customSuggestions || [];

  // Renderiza uma coluna de timeline interativa (usada tanto na Semana quanto no Dia)
  const renderTimelineColumn = (dateStr, isSingleDay = false) => {
    const dayIntervals = customIntervals.filter(i => i.dateStr === dateStr);

    // Seleção ativa de arrastar nesta coluna
    const isThisColDragging = isDragging && dragStart && dragCurrent && dragStart.dateStr === dateStr;
    const dragMinM = isThisColDragging ? Math.min(dragStart.minutes, dragCurrent.minutes) : 0;
    const dragMaxM = isThisColDragging ? Math.max(dragStart.minutes, dragCurrent.minutes) + 15 : 0;
    const dragTop = (dragMinM - START_HOUR * 60);
    const dragHeight = (dragMaxM - dragMinM);

    return (
      <div
        style={{
          position: 'relative',
          height: `${hours.length * HOUR_HEIGHT}px`,
          borderLeft: isSingleDay ? 'none' : '1px solid var(--border-color)',
          background: isOrganizerSuggested(dateStr) ? '#f0f9ff' : 'white',
          userSelect: 'none'
        }}
      >
        {/* Linhas de 15 minutos em cada hora para capturar o arrastar */}
        {hours.map(h => (
          <div
            key={h}
            style={{
              height: `${HOUR_HEIGHT}px`,
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box'
            }}
          >
            {[0, 15, 30, 45].map(q => {
              const minutes = h * 60 + q;
              return (
                <div
                  key={q}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleMouseDown15(dateStr, minutes);
                  }}
                  onMouseEnter={() => handleMouseEnter15(dateStr, minutes)}
                  style={{
                    flex: 1,
                    borderBottom: q === 15 ? '1px dashed #e2e8f0' : (q === 45 ? 'none' : 'none'),
                    cursor: 'cell',
                    boxSizing: 'border-box'
                  }}
                  title={`Arraste para selecionar a partir de ${String(h).padStart(2, '0')}:${String(q).padStart(2, '0')}`}
                />
              );
            })}
          </div>
        ))}

        {/* Retângulo de Seleção Ativa durante o Arrastar */}
        {isThisColDragging && dragHeight > 0 && (
          <div
            style={{
              position: 'absolute',
              top: `${dragTop}px`,
              height: `${dragHeight}px`,
              left: 4,
              right: 4,
              background: 'rgba(0, 105, 255, 0.22)',
              border: '2px dashed var(--primary)',
              borderRadius: 'var(--radius-sm)',
              zIndex: 20,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary)',
              fontWeight: 800,
              fontSize: '0.8rem',
              boxShadow: '0 2px 8px rgba(0, 105, 255, 0.15)'
            }}
          >
            {minutesToTime(dragMinM)} às {minutesToTime(dragMaxM)}
          </div>
        )}

        {/* BLOCOS MESCLADOS (Células unificadas centralizadas sem repetição) */}
        {dayIntervals.map(item => {
          const rawStartM = timeToMinutes(item.startTime);
          const rawEndM = timeToMinutes(item.endTime);
          
          // Arredonda para múltiplo de 15 para posicionamento preciso na grade
          const roundedStartM = roundTo15(rawStartM);
          let roundedEndM = roundTo15(rawEndM);
          if (roundedEndM <= roundedStartM) {
            roundedEndM = roundedStartM + 15;
          }

          const clampedStartM = Math.max(START_HOUR * 60, roundedStartM);
          const clampedEndM = Math.min((END_HOUR + 1) * 60, roundedEndM);
          const startOffset = Math.max(0, (clampedStartM - START_HOUR * 60) * (HOUR_HEIGHT / 60));
          const blockHeight = Math.max(28, (clampedEndM - clampedStartM) * (HOUR_HEIGHT / 60));

          const isAvail = item.status === 'available';

          return (
            <div
              key={item.id}
              onClick={() => handleEditInterval(item)}
              title="Clique para editar este bloco de horário"
              style={{
                position: 'absolute',
                top: `${startOffset}px`,
                height: `${blockHeight}px`,
                left: 4,
                right: 4,
                background: isAvail ? 'var(--color-available-bg)' : 'var(--color-unavailable-bg)',
                border: `1.5px solid ${isAvail ? 'var(--color-available-border)' : 'var(--color-unavailable-border)'}`,
                borderRadius: 'var(--radius-sm)',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 8px',
                boxShadow: 'var(--shadow-sm)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = 'brightness(0.96)';
                e.currentTarget.style.zIndex = '15';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = 'none';
                e.currentTarget.style.zIndex = '10';
              }}
            >
              {/* Se tiver título */}
              {item.title && (
                <div style={{
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: isAvail ? '#065f46' : '#991b1b',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '85%'
                }}>
                  {item.title}
                </div>
              )}

              <div style={{
                fontWeight: 800,
                fontSize: blockHeight < 40 ? '0.72rem' : '0.82rem',
                color: isAvail ? '#065f46' : '#991b1b',
                textAlign: 'center',
                lineHeight: 1.2,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                {(item.isRecurring || item.recurrenceRuleId) && (
                  <span title="Horário recorrente semanal">🔁</span>
                )}
                {isAvail ? t('freeBadge') : t('busyBadge')}
              </div>
              <div style={{
                fontSize: blockHeight < 40 ? '0.65rem' : '0.72rem',
                fontWeight: 600,
                color: isAvail ? '#047857' : '#b91c1c',
                textAlign: 'center',
                marginTop: 1
              }}>
                {item.startTime} – {item.endTime}
              </div>

              {/* Botão de exclusão rápida */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveInterval(item.id);
                }}
                title={t('btnCancel')}
                style={{
                  position: 'absolute',
                  top: 3,
                  right: 3,
                  color: isAvail ? '#047857' : '#b91c1c',
                  background: 'rgba(255, 255, 255, 0.85)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="google-calendar-availability" onMouseUp={handleMouseUpSlot} data-tour="calendar-availability-container">
      {/* Top Bar da Agenda: Navegação e Alternador de Visões */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1.25rem',
        paddingBottom: '0.85rem',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {/* Navegação de Datas */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            className="btn-secondary"
            onClick={handleToday}
            style={{ fontWeight: 700, padding: '0.45rem 0.85rem' }}
          >
            {t('today')}
          </button>
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              onClick={handlePrev}
              style={{
                padding: '0.45rem',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                background: 'white',
                display: 'flex'
              }}
              title={t('prev')}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={handleNext}
              style={{
                padding: '0.45rem',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                background: 'white',
                display: 'flex'
              }}
              title={t('next')}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {viewMode === 'day'
              ? `${daysOfWeek[navDate.getDay()]}, ${navDate.getDate()} ${monthNames[navDate.getMonth()]} ${navDate.getFullYear()}`
              : `${monthNames[navDate.getMonth()]} ${navDate.getFullYear()}`}
          </span>
        </div>

        {/* Ações da Barra: Minha Rotina Padrão + Seletor de Visões */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          {currentUser && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsRoutineModalOpen(true)}
              title="Gerenciar rotinas e disponibilidades salvas no seu perfil"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 700,
                fontSize: '0.825rem',
                padding: '0.45rem 0.85rem',
                border: '1.5px solid var(--border-color)',
                background: 'white'
              }}
            >
              <RotateCcw size={15} color="var(--primary)" />
              <span>Minha Rotina Padrão</span>
              {userRoutines.length > 0 && (
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '0.1rem 0.45rem',
                  borderRadius: 12
                }}>
                  {userRoutines.length}
                </span>
              )}
            </button>
          )}

          {/* Seletor de Visões: Mês | Semana | Dia | Sugestões */}
          <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }} data-tour="calendar-view-mode-selector">
            {[
              { id: 'month', label: t('viewMonth') },
              { id: 'week', label: t('viewWeek') },
              { id: 'day', label: t('viewDay') },
              { id: 'suggestions', label: `💡 ${t('viewSuggestions')} (${suggestionsList.length})` }
            ].map(({ id, label }) => {
              const isActive = viewMode === id;
              return (
                <button
                  key={id}
                  onClick={() => setViewMode(id)}
                  data-tour={id === 'suggestions' ? 'date-suggestions-tab-btn' : undefined}
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    background: isActive ? 'var(--primary)' : 'white',
                    color: isActive ? 'white' : 'var(--text-muted)'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Banner Proativo: Aplicar Rotina do Perfil (Requirement 3) */}
      {showRoutinePrompt && userRoutines.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)',
          border: '1.5px solid #bbf7d0',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Sparkles size={18} color="#166534" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#166534' }}>
                Você possui {userRoutines.length} regra(s) de rotina salva(s) no seu perfil
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Ex: <strong>{userRoutines[0]?.title}</strong> ({userRoutines[0]?.startTime}–{userRoutines[0]?.endTime}). Deseja aplicá-las a este evento?
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleApplySavedRoutinesToEvent}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <RotateCcw size={14} />
              Aplicar Rotinas ao Evento
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowRoutinePrompt(false)}
              style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem' }}
            >
              Agora não
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. VISÃO DE MÊS (Month View)                             */}
      {/* ======================================================== */}
      {viewMode === 'month' && (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
          {/* Cabeçalho dos 7 dias com LARGURA RIGOROSAMENTE IGUAL */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            width: '100%',
            boxSizing: 'border-box',
            background: '#f8fafc',
            borderBottom: '1px solid var(--border-color)'
          }}>
            {daysOfWeek.map(d => (
              <div 
                key={d} 
                style={{
                  padding: '0.65rem 0.25rem',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grade de Dias do Mês */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
            gridAutoRows: 'minmax(105px, auto)',
            width: '100%',
            boxSizing: 'border-box',
            background: '#ffffff'
          }}>
            {getDaysOfMonth().map(({ date, isCurrentMonth }, idx) => {
              const dateStr = toDateStr(date);
              const isSuggested = isOrganizerSuggested(dateStr);
              const isToday = toDateStr(new Date()) === dateStr;
              const dayIntervals = customIntervals.filter(i => i.dateStr === dateStr);

              return (
                <div
                  key={idx}
                  onClick={() => {
                    const dow = getDayOfWeekFromDateStr(dateStr);
                    setTimeDialog({
                      dateStr,
                      startTime: '14:15',
                      endTime: '18:45',
                      status: 'available',
                      title: '',
                      isRecurring: false,
                      recurrenceDays: [dow],
                      saveToProfile: false,
                      isEditing: false
                    });
                  }}
                  style={{
                    minWidth: 0,
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    padding: '0.45rem',
                    borderRight: (idx + 1) % 7 !== 0 ? '1px solid #f1f5f9' : 'none',
                    borderBottom: '1px solid #f1f5f9',
                    background: isSuggested 
                      ? '#f0f9ff' 
                      : (isCurrentMonth ? '#ffffff' : '#fafafa'),
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = isSuggested ? '#e0f2fe' : '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = isSuggested ? '#f0f9ff' : (isCurrentMonth ? '#ffffff' : '#fafafa')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      color: isToday ? 'white' : (isCurrentMonth ? 'var(--text-main)' : '#cbd5e1'),
                      background: isToday ? 'var(--primary)' : 'transparent',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {date.getDate()}
                    </span>

                    {isSuggested && (
                      <span style={{
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        color: '#0284c7',
                        background: '#e0f2fe',
                        padding: '0.1rem 0.3rem',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        Sugerido
                      </span>
                    )}
                  </div>

                  {/* Badges dos blocos neste dia com clique para editar */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                    {dayIntervals.map(item => (
                      <div
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditInterval(item);
                        }}
                        title={`Clique para editar: ${item.title ? item.title + ' - ' : ''}${item.status === 'available' ? 'Livre' : 'Ocupado'} (${item.startTime} às ${item.endTime})`}
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.35rem',
                          borderRadius: 4,
                          background: item.status === 'available' ? '#dcfce7' : '#fee2e2',
                          color: item.status === 'available' ? '#166534' : '#991b1b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                          boxSizing: 'border-box',
                          cursor: 'pointer',
                          transition: 'filter 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(0.92)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
                      >
                        {(item.isRecurring || item.recurrenceRuleId) && '🔁 '}
                        {item.title ? `${item.title}: ` : ''}
                        {item.status === 'available' ? '✓ Livre' : '✗ Ocup.'} {item.startTime}–{item.endTime}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. VISÃO DE SEMANA (Week View com Blocos Mesclados)       */}
      {/* ======================================================== */}
      {viewMode === 'week' && (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflowX: 'auto', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ minWidth: 680, width: '100%' }}>
            {/* Cabeçalho de dias com 7 colunas idênticas */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))',
              width: '100%',
              boxSizing: 'border-box',
              borderBottom: '1px solid var(--border-color)',
              background: '#f8fafc'
            }}>
              <div style={{ padding: '0.65rem 0.25rem', textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-subtle)' }}>
                GMT-3
              </div>
              {getDaysOfWeek().map((d, idx) => {
                const dateStr = toDateStr(d);
                const isSuggested = isOrganizerSuggested(dateStr);
                const isToday = toDateStr(new Date()) === dateStr;

                return (
                  <div
                    key={idx}
                    style={{
                      padding: '0.55rem 0.25rem',
                      textAlign: 'center',
                      borderLeft: '1px solid var(--border-color)',
                      background: isSuggested ? '#f0f9ff' : 'transparent',
                      minWidth: 0,
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                      {daysOfWeek[d.getDay()]}
                    </div>
                    <div style={{
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      color: isToday ? 'white' : 'var(--text-main)',
                      background: isToday ? 'var(--primary)' : 'transparent',
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      margin: '2px auto 0 auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Linha Principal da Grade: Coluna lateral de Horas + 7 Colunas de Dias */}
            <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, minmax(0, 1fr))', width: '100%', position: 'relative' }}>
              {/* Marcação lateral apenas com as horas para visual limpo */}
              <div style={{ borderRight: '1px solid var(--border-color)', background: '#fafafa', userSelect: 'none' }}>
                {hours.map(h => (
                  <div
                    key={h}
                    style={{
                      height: `${HOUR_HEIGHT}px`,
                      borderBottom: '1px solid #e2e8f0',
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      textAlign: 'right',
                      paddingRight: '0.5rem',
                      transform: 'translateY(-7px)',
                      fontWeight: 600,
                      boxSizing: 'border-box'
                    }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </div>
                ))}
              </div>

              {/* 7 Colunas de Dias com Arraste (15m) e Blocos Mesclados */}
              {getDaysOfWeek().map(d => {
                const dateStr = toDateStr(d);
                return (
                  <div key={dateStr} style={{ position: 'relative', width: '100%', minWidth: 0 }}>
                    {renderTimelineColumn(dateStr, false)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. VISÃO DE DIA (Day View - Idêntica à Semana mas 1 dia) */}
      {/* ======================================================== */}
      {viewMode === 'day' && (
        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'white' }}>
          {/* Barra de atalho para os dias do evento */}
          {event.dates && event.dates.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1rem',
              background: '#f8fafc',
              borderBottom: '1px solid var(--border-color)',
              flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                Ir para o dia do evento:
              </span>
              {event.dates.map(dateStr => {
                const isSelected = toDateStr(navDate) === dateStr;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => {
                      const [y, m, d] = dateStr.split('-').map(Number);
                      setNavDate(new Date(y, m - 1, d));
                    }}
                    style={{
                      padding: '0.3rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: isSelected ? 'var(--primary)' : 'white',
                      color: isSelected ? 'white' : 'var(--text-main)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {formatDateFriendly(dateStr)}
                  </button>
                );
              })}
            </div>
          )}

          {/* Cabeçalho do Dia */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr',
            borderBottom: '1px solid var(--border-color)',
            background: isOrganizerSuggested(toDateStr(navDate)) ? '#f0f9ff' : '#f8fafc'
          }}>
            <div style={{ padding: '0.75rem 0.25rem', textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-subtle)' }}>
              GMT-3
            </div>
            <div style={{
              padding: '0.65rem 1rem',
              borderLeft: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: isOrganizerSuggested(toDateStr(navDate)) ? '#f0f9ff' : 'transparent',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  {daysOfWeek[navDate.getDay()]}, {navDate.toLocaleDateString(LOCALE_BY_LANG[lang] || 'pt-BR')}
                </span>
                {isOrganizerSuggested(toDateStr(navDate)) && (
                  <span style={{ marginLeft: 8, fontSize: '0.72rem', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '0.15rem 0.45rem', borderRadius: 4 }}>
                    {t('organizerSuggestedPeriod')}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {t('dragHint')}
              </div>
            </div>
          </div>

          {/* Grade da Linha do Dia */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', width: '100%', position: 'relative' }}>
            {/* Coluna lateral de Horas */}
            <div style={{ borderRight: '1px solid var(--border-color)', background: '#fafafa', userSelect: 'none' }}>
              {hours.map(h => (
                <div
                  key={h}
                  style={{
                    height: `${HOUR_HEIGHT}px`,
                    borderBottom: '1px solid #e2e8f0',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    textAlign: 'right',
                    paddingRight: '0.5rem',
                    transform: 'translateY(-7px)',
                    fontWeight: 600,
                    boxSizing: 'border-box'
                  }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Coluna única do Dia com Arraste de 15 minutos e Blocos Mesclados */}
            <div style={{ position: 'relative', width: '100%' }}>
              {renderTimelineColumn(toDateStr(navDate), true)}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. VISÃO DE SUGESTÕES COLETIVAS DE HORÁRIO               */}
      {/* ======================================================== */}
      {viewMode === 'suggestions' && (
        <div style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }} data-tour="date-suggestions-section">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={20} color="var(--primary)" />
                Sugestões de Dias & Horários dos Participantes
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Qualquer convidado pode propor um dia e horário com precisão de minutos. Os demais podem sinalizar com 1 clique se estão livres ou ocupados!
              </p>
            </div>

            <button
              className="btn-primary"
              onClick={() => setIsCreatingSuggestion(true)}
            >
              <Plus size={16} />
              Sugerir Novo Dia e Horário
            </button>
          </div>

          {/* Lista de Sugestões dos Participantes */}
          {suggestionsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
              <Clock size={40} style={{ opacity: 0.35, margin: '0 auto 0.75rem auto' }} />
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Nenhuma sugestão cadastrada ainda</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Tem uma ideia de dia ou horário que seria perfeito? Clique no botão acima para sugerir!
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {suggestionsList.map(sug => {
                const totalParticipants = event.participants.length;
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
                      padding: '1.25rem',
                      background: 'white',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>
                            {formatDateFriendly(sug.date)} • {sug.startTime} às {sug.endTime}
                          </span>
                        </div>
                        {sug.title && (
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                            "{sug.title}"
                          </div>
                        )}
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Avatar src={sug.creator?.avatar} name={sug.creator?.name} size={18} />
                          <span>Sugerido por <strong>{sug.creator?.name}</strong></span>
                        </div>
                      </div>

                      {/* Quórum da Sugestão */}
                      <div style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        padding: '0.45rem 0.85rem',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'right'
                      }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534' }}>
                          {availableVoters.length} de {totalParticipants} disponíveis
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                          {unavailableVoters.length} indisponíveis
                        </div>
                      </div>
                    </div>

                    {/* Votantes */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.65rem 0.85rem',
                      marginBottom: '1rem',
                      fontSize: '0.8rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <CheckCircle2 size={14} /> Podem comparecer:
                        </span>
                        {availableVoters.length > 0 ? (
                          availableVoters.map(p => (
                            <span key={p.id} className="pill-attendee pill-full">
                              {p.name}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-subtle)', fontStyle: 'italic' }}>Nenhum voto positivo ainda</span>
                        )}
                      </div>

                      {unavailableVoters.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                          <span style={{ fontWeight: 700, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <XCircle size={14} /> Não podem:
                          </span>
                          {unavailableVoters.map(p => (
                            <span key={p.id} className="pill-attendee pill-missing">
                              {p.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Ações de Voto e Ações do Organizador */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      paddingTop: '0.85rem',
                      borderTop: '1px solid #f1f5f9'
                    }}>
                      {/* Linha de Sinalização do Participante */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          Sua sinalização:
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => onVoteSuggestion(sug.id, 'available')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '0.4rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              border: `1.5px solid ${myVote === 'available' ? 'var(--color-available)' : 'var(--border-color)'}`,
                              background: myVote === 'available' ? 'var(--color-available-bg)' : 'white',
                              color: myVote === 'available' ? '#065f46' : 'var(--text-main)',
                              cursor: 'pointer'
                            }}
                          >
                            <ThumbsUp size={14} color={myVote === 'available' ? 'var(--color-available)' : '#64748b'} />
                            <span>Estou Disponível</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onVoteSuggestion(sug.id, 'unavailable')}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '0.4rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              border: `1.5px solid ${myVote === 'unavailable' ? 'var(--color-unavailable)' : 'var(--border-color)'}`,
                              background: myVote === 'unavailable' ? 'var(--color-unavailable-bg)' : 'white',
                              color: myVote === 'unavailable' ? '#991b1b' : 'var(--text-main)',
                              cursor: 'pointer'
                            }}
                          >
                            <ThumbsDown size={14} color={myVote === 'unavailable' ? 'var(--color-unavailable)' : '#64748b'} />
                            <span>Não Posso</span>
                          </button>
                        </div>
                      </div>

                      {/* Ações do Organizador (Alinhamento Robusto em Linha Dedicada) */}
                      {isOrganizer && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          paddingTop: '0.65rem',
                          borderTop: '1px dashed #e2e8f0',
                          width: '100%'
                        }}>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => onConfirmSlot({
                              date: sug.date,
                              startTime: sug.startTime,
                              endTime: sug.endTime,
                              durationMinutes: timeToMinutes(sug.endTime) - timeToMinutes(sug.startTime)
                            })}
                            style={{
                              flex: 1,
                              justifyContent: 'center',
                              fontSize: '0.825rem',
                              padding: '0.5rem 0.85rem'
                            }}
                          >
                            <Check size={15} />
                            <span>Definir como Horário Oficial</span>
                          </button>

                          {onRemoveTimeSuggestion && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(t('confirmDeleteSuggestion') || 'Deseja realmente excluir esta sugestão de horário?')) {
                                  onRemoveTimeSuggestion(sug.id);
                                }
                              }}
                              style={{
                                fontSize: '0.825rem',
                                padding: '0.5rem 0.85rem',
                                background: 'white',
                                border: '1px solid #fecaca',
                                borderRadius: 'var(--radius-sm)',
                                color: '#dc2626',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 5,
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition: 'all 0.15s ease'
                              }}
                              title={t('btnDeleteSuggestion') || 'Excluir sugestão de horário'}
                              onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                            >
                              <Trash2 size={14} />
                              <span>{t('btnDeleteSuggestion') || 'Excluir'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* DIÁLOGO DE HORÁRIO COM EDIÇÃO, RECORRÊNCIA E PERFIL      */}
      {/* ======================================================== */}
      {timeDialog && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  {timeDialog.isEditing ? 'Editar Bloco de Horário' : 'Cadastrar Período'}
                </div>
                <h3 className="modal-title">
                  {timeDialog.status === 'available' ? '🟢 Disponibilidade' : '🔴 Indisponibilidade'}
                </h3>
              </div>
              <button className="modal-close-btn" onClick={() => setTimeDialog(null)}>
                <X size={20} />
              </button>
            </div>

            {/* Seleção se é Livre ou Ocupado */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Você estará livre ou ocupado nesta faixa?</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setTimeDialog({ ...timeDialog, status: 'available' })}
                  style={{
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    border: `1.5px solid ${timeDialog.status === 'available' ? 'var(--color-available)' : 'var(--border-color)'}`,
                    background: timeDialog.status === 'available' ? 'var(--color-available-bg)' : 'white',
                    color: timeDialog.status === 'available' ? '#065f46' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  🟢 Livre / Disponível
                </button>
                <button
                  type="button"
                  onClick={() => setTimeDialog({ ...timeDialog, status: 'unavailable' })}
                  style={{
                    padding: '0.65rem',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    border: `1.5px solid ${timeDialog.status === 'unavailable' ? 'var(--color-unavailable)' : 'var(--border-color)'}`,
                    background: timeDialog.status === 'unavailable' ? 'var(--color-unavailable-bg)' : 'white',
                    color: timeDialog.status === 'unavailable' ? '#991b1b' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  🔴 Ocupado
                </button>
              </div>
            </div>

            {/* Título ou Motivo Opcional */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Título ou Motivo (opcional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Aulas na faculdade, Treino, Trabalho..."
                value={timeDialog.title || ''}
                onChange={(e) => setTimeDialog({ ...timeDialog, title: e.target.value })}
              />
            </div>

            {/* Data e Dia da Semana */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Data do Bloco</label>
              <input
                type="date"
                className="form-input"
                value={timeDialog.dateStr}
                onChange={(e) => {
                  const newDate = e.target.value;
                  const newDow = getDayOfWeekFromDateStr(newDate);
                  setTimeDialog({
                    ...timeDialog,
                    dateStr: newDate,
                    recurrenceDays: timeDialog.isRecurring ? timeDialog.recurrenceDays : [newDow]
                  });
                }}
                required
              />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
                {DAY_NAMES[getDayOfWeekFromDateStr(timeDialog.dateStr)]?.full}
              </div>
            </div>

            {/* Ajuste Fino de Horário com Minutos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label className="form-label">Início (HH:MM)</label>
                <input
                  type="time"
                  className="form-input"
                  value={timeDialog.startTime}
                  onChange={(e) => setTimeDialog({ ...timeDialog, startTime: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="form-label">Fim (HH:MM)</label>
                <input
                  type="time"
                  className="form-input"
                  value={timeDialog.endTime}
                  onChange={(e) => setTimeDialog({ ...timeDialog, endTime: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Atalhos Rápidos */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Atalhos rápidos:
              </span>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => setTimeDialog({ ...timeDialog, startTime: '09:00', endTime: '12:00' })}
                >
                  09h às 12h
                </button>
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => setTimeDialog({ ...timeDialog, startTime: '13:00', endTime: '18:00' })}
                >
                  13h às 18h
                </button>
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => setTimeDialog({ ...timeDialog, startTime: '18:30', endTime: '22:00' })}
                >
                  18h30 às 22h
                </button>
                <button
                  type="button"
                  className="quick-btn"
                  onClick={() => setTimeDialog({ ...timeDialog, startTime: '08:00', endTime: '22:00' })}
                >
                  Dia Todo
                </button>
              </div>
            </div>

            {/* Seção de Recorrência (Requirement 2) */}
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem',
              marginBottom: '1rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                <input
                  type="checkbox"
                  checked={Boolean(timeDialog.isRecurring)}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    const currentDow = getDayOfWeekFromDateStr(timeDialog.dateStr);
                    setTimeDialog({
                      ...timeDialog,
                      isRecurring: isChecked,
                      recurrenceDays: isChecked ? (timeDialog.recurrenceDays?.length ? timeDialog.recurrenceDays : [currentDow]) : []
                    });
                  }}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <RotateCcw size={15} color="var(--primary)" />
                <span>Repetir semanalmente (Recorrência)</span>
              </label>

              {timeDialog.isRecurring && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Selecione os dias da semana em que este horário se repete (ex: aulas nas terças à noite):
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {DAY_NAMES.map(d => {
                      const isSelected = (timeDialog.recurrenceDays || []).includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            const cur = timeDialog.recurrenceDays || [];
                            const updated = isSelected ? cur.filter(x => x !== d.id) : [...cur, d.id];
                            setTimeDialog({ ...timeDialog, recurrenceDays: updated });
                          }}
                          style={{
                            padding: '0.3rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                            background: isSelected ? 'var(--primary)' : 'white',
                            color: isSelected ? 'white' : 'var(--text-muted)',
                            cursor: 'pointer'
                          }}
                        >
                          {d.short}
                        </button>
                      );
                    })}
                  </div>

                  {timeDialog.isEditing && timeDialog.recurrenceRuleId && (
                    <div style={{ fontSize: '0.8rem', background: '#ffffff', padding: '0.65rem', borderRadius: 4, border: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: 700, display: 'block', marginBottom: 4, color: 'var(--text-main)' }}>
                        Escopo da alteração:
                      </span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="editScope"
                          value="all"
                          checked={timeDialog.editScope === 'all'}
                          onChange={() => setTimeDialog({ ...timeDialog, editScope: 'all' })}
                        />
                        <span>Aplicar a todas as ocorrências deste horário</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="editScope"
                          value="single"
                          checked={timeDialog.editScope === 'single'}
                          onChange={() => setTimeDialog({ ...timeDialog, editScope: 'single' })}
                        />
                        <span>Alterar apenas nesta data ({timeDialog.dateStr})</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Seção de Vínculo com Perfil do Usuário (Requirement 3) */}
            <div style={{
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              borderRadius: 'var(--radius-sm)',
              padding: '0.85rem',
              marginBottom: '1.5rem'
            }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={Boolean(timeDialog.saveToProfile)}
                  onChange={(e) => setTimeDialog({ ...timeDialog, saveToProfile: e.target.checked })}
                  style={{ width: 16, height: 16, marginTop: 2, cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#166534', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Bookmark size={15} color="#166534" />
                    Salvar no meu perfil (reutilizar em outros eventos)
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#4b5563', marginTop: 2 }}>
                    Guarda esta regra na sua rotina pessoal para que você possa aplicá-la com 1 clique em qualquer outro evento que participar (ou desmarque para usar apenas neste evento).
                  </div>
                </div>
              </label>
            </div>

            {/* Ações do Rodapé */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div>
                {timeDialog.isEditing && (
                  <button
                    type="button"
                    onClick={handleDeleteFromModal}
                    style={{
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: '1px solid #fca5a5',
                      padding: '0.55rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={15} />
                    Excluir Bloco
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setTimeDialog(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSaveIntervalModal}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Save size={16} />
                  {timeDialog.isEditing ? 'Salvar Alterações' : 'Confirmar e Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL DE GERENCIAMENTO DE ROTINA DO PERFIL (Requirement 3) */}
      {/* ======================================================== */}
      {isRoutineModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Perfil do Participante
                </div>
                <h3 className="modal-title">Minha Rotina Padrão</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsRoutineModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Cadastre suas disponibilidades ou indisponibilidades fixas da semana (ex: aulas nas terças à noite, horário comercial). Elas ficam vinculadas ao seu usuário e podem ser aplicadas em qualquer evento que você desejar.
            </p>

            {/* Ação rápida de aplicar ao evento atual */}
            {userRoutines.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleApplySavedRoutinesToEvent}
                  style={{ width: '100%', padding: '0.65rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700 }}
                >
                  <RotateCcw size={16} />
                  Aplicar Minhas Rotinas Salvas a Este Evento
                </button>
              </div>
            )}

            {/* Lista de Rotinas Existentes */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Regras Salvas ({userRoutines.length})
              </div>

              {userRoutines.length === 0 ? (
                <div style={{ padding: '1.25rem', textAlign: 'center', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px dashed #cbd5e1', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Nenhuma rotina cadastrada ainda. Crie uma abaixo para reutilizar em múltiplos eventos!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {userRoutines.map(r => {
                    const daysLabel = (r.daysOfWeek || [])
                      .map(id => DAY_NAMES.find(d => d.id === id)?.short)
                      .filter(Boolean)
                      .join(', ');

                    const isAvail = r.status === 'available';

                    return (
                      <div
                        key={r.id}
                        style={{
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: `1.5px solid ${isAvail ? '#bbf7d0' : '#fecaca'}`,
                          background: isAvail ? '#f0fdf4' : '#fef2f2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '0.88rem', color: isAvail ? '#166534' : '#991b1b', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>{isAvail ? '🟢 Livre' : '🔴 Ocupado'}</span>
                            <span>•</span>
                            <span>{r.title}</span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#4b5563', marginTop: 2 }}>
                            Dias: <strong>{daysLabel || 'Todos'}</strong> • Horário: <strong>{r.startTime} às {r.endTime}</strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveRoutine(r.id)}
                          style={{
                            background: 'white',
                            border: '1px solid #fca5a5',
                            color: '#dc2626',
                            borderRadius: '50%',
                            width: 28,
                            height: 28,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                          title="Excluir regra de rotina"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Formulário para Cadastrar Nova Regra de Rotina */}
            <form onSubmit={handleCreateRoutineSubmit} style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '0.75rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={16} color="var(--primary)" />
                Cadastrar Nova Regra de Rotina
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Título da Rotina</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Aulas nas terças à noite, Treino, Plantão..."
                  value={newRoutineForm.title}
                  onChange={(e) => setNewRoutineForm({ ...newRoutineForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Tipo</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setNewRoutineForm({ ...newRoutineForm, status: 'available' })}
                    style={{
                      padding: '0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      border: `1.5px solid ${newRoutineForm.status === 'available' ? 'var(--color-available)' : 'var(--border-color)'}`,
                      background: newRoutineForm.status === 'available' ? 'var(--color-available-bg)' : 'white',
                      color: newRoutineForm.status === 'available' ? '#065f46' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    🟢 Livre
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewRoutineForm({ ...newRoutineForm, status: 'unavailable' })}
                    style={{
                      padding: '0.45rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.825rem',
                      fontWeight: 700,
                      border: `1.5px solid ${newRoutineForm.status === 'unavailable' ? 'var(--color-unavailable)' : 'var(--border-color)'}`,
                      background: newRoutineForm.status === 'unavailable' ? 'var(--color-unavailable-bg)' : 'white',
                      color: newRoutineForm.status === 'unavailable' ? '#991b1b' : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    🔴 Ocupado
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">Dias da Semana</label>
                <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                  {DAY_NAMES.map(d => {
                    const isSelected = newRoutineForm.daysOfWeek.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          const cur = newRoutineForm.daysOfWeek;
                          const updated = isSelected ? cur.filter(x => x !== d.id) : [...cur, d.id];
                          setNewRoutineForm({ ...newRoutineForm, daysOfWeek: updated });
                        }}
                        style={{
                          padding: '0.3rem 0.65rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-color)'}`,
                          background: isSelected ? 'var(--primary)' : 'white',
                          color: isSelected ? 'white' : 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label className="form-label">Início</label>
                  <input
                    type="time"
                    className="form-input"
                    value={newRoutineForm.startTime}
                    onChange={(e) => setNewRoutineForm({ ...newRoutineForm, startTime: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Término</label>
                  <input
                    type="time"
                    className="form-input"
                    value={newRoutineForm.endTime}
                    onChange={(e) => setNewRoutineForm({ ...newRoutineForm, endTime: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem' }}
                >
                  <Bookmark size={15} />
                  Salvar Regra no Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA PROPOR NOVA SUGESTÃO COLETIVA */}
      {isCreatingSuggestion && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Proposta Aberta
                </div>
                <h3 className="modal-title">Sugerir Dia & Horário</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsCreatingSuggestion(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSuggestionSubmit}>
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
                  onClick={() => setIsCreatingSuggestion(false)}
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

      {/* Caixa de Comentários / Observações do Participante */}
      {viewMode !== 'suggestions' && (
        <>
          <div className="participant-notes-box">
            <label htmlFor="notes">
              <MessageSquare size={16} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
              {t('generalNotesLabel')}
            </label>
            <textarea
              id="notes"
              placeholder={t('generalNotesPlaceholder')}
              value={suggestionNote}
              onChange={(e) => {
                setSuggestionNote(e.target.value);
                setHasSaved(false);
              }}
            />
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
            {hasSaved && (
              <span style={{ fontSize: '0.85rem', color: '#166534', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Check size={16} /> {t('availabilitySavedSuccess')}
              </span>
            )}
            <button
              className="btn-primary"
              onClick={handleSaveAvailability}
              style={{ padding: '0.75rem 1.75rem', fontSize: '0.95rem' }}
            >
              <Save size={18} />
              {t('btnSaveAvailability')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
