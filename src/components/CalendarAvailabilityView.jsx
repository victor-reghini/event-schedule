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
  MousePointer,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { timeToMinutes, minutesToTime } from '../services/schedulerAlgorithm';
import { useI18n } from '../services/i18n';
import Avatar from './Avatar';

const START_HOUR = 8;
const END_HOUR = 22;
const HOUR_HEIGHT = 60; // 60px por hora = 1px por minuto (15m = 15px)

// Arredonda minutos para o múltiplo de 15 mais próximo
function roundTo15(mins) {
  return Math.round(mins / 15) * 15;
}

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

  // Diálogo para cadastro ao clicar no dia ou ao soltar o arraste
  const [timeDialog, setTimeDialog] = useState(null); // { dateStr, startTime: '14:15', endTime: '18:45', status: 'available' }

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

  // Salva intervalo
  const handleSaveInterval = (dateStr, startTime, endTime, status) => {
    const startM = timeToMinutes(startTime);
    const endM = timeToMinutes(endTime);

    if (startM >= endM) {
      alert('O horário de início deve ser anterior ao horário de término.');
      return;
    }

    const newInterval = {
      id: `int-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      dateStr,
      startTime,
      endTime,
      status
    };

    const updatedIntervals = [...customIntervals, newInterval];
    setCustomIntervals(updatedIntervals);

    // Mapeia para steps de 15 minutos e horas completas para compatibilidade total
    const updatedAvail = { ...availabilities };
    const roundedStart = roundTo15(startM);
    let roundedEnd = roundTo15(endM);
    if (roundedEnd <= roundedStart) {
      roundedEnd = roundedStart + 15;
    }
    for (let m = roundedStart; m < roundedEnd; m += 15) {
      const timeStr = minutesToTime(m);
      updatedAvail[`${dateStr}_${timeStr}`] = status;
    }
    for (let h = Math.floor(startM / 60); h <= Math.ceil(endM / 60); h++) {
      const hM = h * 60;
      if (hM >= startM && hM < endM) {
        updatedAvail[`${dateStr}_${minutesToTime(hM)}`] = status;
      }
    }

    setAvailabilities(updatedAvail);
    setHasSaved(false);
    setTimeDialog(null);
  };

  // Remove intervalo cadastrado
  const handleRemoveInterval = (idToRemove) => {
    const item = customIntervals.find(i => i.id === idToRemove);
    const updated = customIntervals.filter(i => i.id !== idToRemove);
    setCustomIntervals(updated);

    if (item) {
      const startM = timeToMinutes(item.startTime);
      const endM = timeToMinutes(item.endTime);
      const updatedAvail = { ...availabilities };
      const roundedStart = roundTo15(startM);
      let roundedEnd = roundTo15(endM);
      if (roundedEnd <= roundedStart) {
        roundedEnd = roundedStart + 15;
      }
      for (let m = roundedStart; m < roundedEnd; m += 15) {
        const timeStr = minutesToTime(m);
        delete updatedAvail[`${item.dateStr}_${timeStr}`];
      }
      for (let h = Math.floor(startM / 60); h <= Math.ceil(endM / 60); h++) {
        const hM = h * 60;
        if (hM >= startM && hM < endM) {
          delete updatedAvail[`${item.dateStr}_${minutesToTime(hM)}`];
        }
      }
      setAvailabilities(updatedAvail);
    }
    setHasSaved(false);
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

      // Abre diálogo para escolher Livre ou Ocupado e ajustar minutos
      setTimeDialog({
        dateStr: dragStart.dateStr,
        startTime: sTime,
        endTime: eTime,
        status: 'available'
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
                overflow: 'hidden'
              }}
            >
              <div style={{
                fontWeight: 800,
                fontSize: blockHeight < 40 ? '0.75rem' : '0.85rem',
                color: isAvail ? '#065f46' : '#991b1b',
                textAlign: 'center',
                lineHeight: 1.2
              }}>
                {isAvail ? t('freeBadge') : t('busyBadge')}
              </div>
              <div style={{
                fontSize: blockHeight < 40 ? '0.68rem' : '0.74rem',
                fontWeight: 600,
                color: isAvail ? '#047857' : '#b91c1c',
                textAlign: 'center',
                marginTop: 2
              }}>
                {item.startTime} – {item.endTime}
              </div>

              {/* Botão de exclusão */}
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
                  onClick={() => setTimeDialog({
                    dateStr,
                    startTime: '14:15',
                    endTime: '18:45',
                    status: 'available'
                  })}
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

                  {/* Badges dos blocos neste dia */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                    {dayIntervals.map(item => (
                      <div
                        key={item.id}
                        title={`${item.status === 'available' ? 'Livre' : 'Ocupado'}: ${item.startTime} às ${item.endTime}`}
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
                          boxSizing: 'border-box'
                        }}
                      >
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

                    {/* Ações de Voto */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                          Sua sinalização:
                        </span>
                        <button
                          type="button"
                          onClick={() => onVoteSuggestion(sug.id, 'available')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '0.4rem 0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            border: `1px solid ${myVote === 'available' ? 'var(--color-available)' : 'var(--border-color)'}`,
                            background: myVote === 'available' ? 'var(--color-available-bg)' : 'white',
                            color: myVote === 'available' ? '#065f46' : 'var(--text-main)'
                          }}
                        >
                          <ThumbsUp size={14} color={myVote === 'available' ? 'var(--color-available)' : '#64748b'} />
                          Estou Disponível
                        </button>

                        <button
                          type="button"
                          onClick={() => onVoteSuggestion(sug.id, 'unavailable')}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '0.4rem 0.85rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            border: `1px solid ${myVote === 'unavailable' ? 'var(--color-unavailable)' : 'var(--border-color)'}`,
                            background: myVote === 'unavailable' ? 'var(--color-unavailable-bg)' : 'white',
                            color: myVote === 'unavailable' ? '#991b1b' : 'var(--text-main)'
                          }}
                        >
                          <ThumbsDown size={14} color={myVote === 'unavailable' ? 'var(--color-unavailable)' : '#64748b'} />
                          Não Posso
                        </button>
                      </div>

                      {/* Ações do Organizador */}
                      {isOrganizer && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => onConfirmSlot({
                              date: sug.date,
                              startTime: sug.startTime,
                              endTime: sug.endTime,
                              durationMinutes: timeToMinutes(sug.endTime) - timeToMinutes(sug.startTime)
                            })}
                            style={{ fontSize: '0.825rem', padding: '0.45rem 1rem' }}
                          >
                            <Check size={15} />
                            Definir como Horário Oficial
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
                                padding: '0.45rem 0.8rem',
                                background: 'white',
                                border: '1px solid #fecaca',
                                borderRadius: 'var(--radius-sm)',
                                color: '#dc2626',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                cursor: 'pointer',
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
      {/* DIÁLOGO DE HORÁRIO COM ESCOLHA LIVRE/OCUPADO E MINUTOS   */}
      {/* ======================================================== */}
      {timeDialog && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>
                  Cadastrar Período
                </div>
                <h3 className="modal-title">Livre ou Ocupado</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setTimeDialog(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 700 }}>
              Dia: <strong>{timeDialog.dateStr}</strong>
            </div>

            {/* Seleção se é Livre ou Ocupado */}
            <div className="form-group">
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
                    color: timeDialog.status === 'available' ? '#065f46' : 'var(--text-muted)'
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
                    color: timeDialog.status === 'unavailable' ? '#991b1b' : 'var(--text-muted)'
                  }}
                >
                  🔴 Ocupado
                </button>
              </div>
            </div>

            {/* Ajuste Fino de Horário com Minutos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
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
            <div style={{ marginBottom: '1.5rem' }}>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
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
                onClick={() => {
                  handleSaveInterval(timeDialog.dateStr, timeDialog.startTime, timeDialog.endTime, timeDialog.status);
                }}
              >
                Confirmar e Salvar
              </button>
            </div>
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
