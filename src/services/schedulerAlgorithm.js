/**
 * Algoritmo Inteligente de Sugestão de Horários
 * 
 * Critérios:
 * 1. Maximizar o número de participantes presentes.
 * 2. Maximizar o tempo de participação de cada participante (suportando participação parcial).
 * 3. Gerar múltiplas opções ranqueadas (Top sugestões) para escolha dos organizadores/participantes.
 * 4. Considerar tanto as datas sugeridas pelo organizador quanto novas datas sugeridas pelos convidados.
 */

// Converte string "HH:MM" para minutos desde 00:00
export function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Converte minutos para "HH:MM"
export function minutesToTime(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Encontra as melhores opções de dias e horários para o evento
 * @param {Object} event - Objeto do evento
 * @param {number} topN - Quantidade máxima de sugestões a retornar (padrão 5)
 */
export function calculateBestSlots(event, topN = 5) {
  const {
    dates = [],
    extraDates = [],
    timeRange = { start: '08:00', end: '23:00', step: 60 },
    duration = 120,
    participants = []
  } = event;

  if (!participants.length) {
    return [];
  }

  // Agrega todas as datas: sugeridas pelo organizador + extras dos participantes
  const datesSet = new Set([...dates, ...extraDates]);
  participants.forEach(p => {
    if (p.availabilities) {
      Object.keys(p.availabilities).forEach(k => {
        const d = k.split('_')[0];
        if (d && d.length === 10) {
          datesSet.add(d);
        }
      });
    }
  });

  (event.customSuggestions || []).forEach(sug => {
    if (sug.date) {
      datesSet.add(sug.date);
    }
  });

  const allDates = Array.from(datesSet).sort();
  if (!allDates.length) return [];

  const startMins = timeToMinutes(timeRange.start || '08:00');
  const endMins = timeToMinutes(timeRange.end || '23:00');
  const step = timeRange.step || 60;
  const durationMins = Number(duration) || 120;
  const slotsNeeded = Math.ceil(durationMins / step);

  const candidates = [];

  for (const dateStr of allDates) {
    const isFromOriginalRange = dates.includes(dateStr);

    // Para cada horário de início possível no dia
    for (let currentStart = startMins; currentStart + durationMins <= endMins; currentStart += step) {
      const currentEnd = currentStart + durationMins;
      const startTimeStr = minutesToTime(currentStart);
      const endTimeStr = minutesToTime(currentEnd);

      // Gera todos os intervalos de step dentro dessa duração
      const slotKeys = [];
      for (let s = currentStart; s < currentEnd; s += step) {
        slotKeys.push(`${dateStr}_${minutesToTime(s)}`);
      }

      let fullAttendees = [];
      let partialAttendees = [];
      let unavailableAttendees = [];

      let totalMinutesAttended = 0;

      for (const participant of participants) {
        const pAvail = participant.availabilities || {};

        let availableSlotsCount = 0;
        let partialSlotsCount = 0;
        let unavailableSlotsCount = 0;

        // Verifica a disponibilidade em cada fatia de tempo
        const slicesStatus = slotKeys.map(key => pAvail[key] || 'neutral');

        slicesStatus.forEach(status => {
          if (status === 'available') {
            availableSlotsCount++;
          } else if (status === 'maybe' || status === 'partial') {
            partialSlotsCount++;
          } else if (status === 'unavailable') {
            unavailableSlotsCount++;
          }
        });

        // Minutos que o participante consegue estar presente
        const effectiveDuration = (availableSlotsCount * step) + (partialSlotsCount * step * 0.7);

        if (availableSlotsCount === slotsNeeded) {
          // 100% disponível no intervalo inteiro
          fullAttendees.push({
            id: participant.id,
            name: participant.name,
            avatar: participant.avatar,
            availableMinutes: durationMins,
            attendancePct: 100,
            status: 'integral'
          });
          totalMinutesAttended += durationMins;
        } else if (availableSlotsCount + partialSlotsCount > 0 && unavailableSlotsCount < slotsNeeded) {
          // Participação parcial
          const pct = Math.round((effectiveDuration / durationMins) * 100);
          
          let firstAvailIndex = slicesStatus.findIndex(s => s === 'available' || s === 'maybe');
          let lastAvailIndex = slicesStatus.length - 1;
          for (let i = slicesStatus.length - 1; i >= 0; i--) {
            if (slicesStatus[i] === 'available' || slicesStatus[i] === 'maybe') {
              lastAvailIndex = i;
              break;
            }
          }

          const partialStart = minutesToTime(currentStart + firstAvailIndex * step);
          const partialEnd = minutesToTime(currentStart + (lastAvailIndex + 1) * step);

          partialAttendees.push({
            id: participant.id,
            name: participant.name,
            avatar: participant.avatar,
            availableMinutes: Math.round(effectiveDuration),
            attendancePct: pct,
            partialWindow: `${partialStart} - ${partialEnd}`,
            status: 'parcial'
          });
          totalMinutesAttended += effectiveDuration;
        } else {
          // Indisponível totalmente
          unavailableAttendees.push({
            id: participant.id,
            name: participant.name,
            avatar: participant.avatar,
            status: 'indisponivel'
          });
        }
      }

      const totalParticipants = participants.length;
      const attendeeCount = fullAttendees.length + partialAttendees.length;
      const maxPossibleMinutes = totalParticipants * durationMins;
      const overallScore = maxPossibleMinutes > 0 ? (totalMinutesAttended / maxPossibleMinutes) * 100 : 0;

      // Classificação e badge da qualidade
      let matchBadge = 'Boa Opção';
      let badgeType = 'good';

      if (fullAttendees.length === totalParticipants) {
        matchBadge = 'Perfeito (100% Presentes)';
        badgeType = 'perfect';
      } else if (attendeeCount === totalParticipants) {
        matchBadge = 'Todos Participam (Alguns Parciais)';
        badgeType = 'high';
      } else if (overallScore >= 75) {
        matchBadge = 'Alta Adesão';
        badgeType = 'high';
      } else if (overallScore >= 50) {
        matchBadge = 'Adesão Média';
        badgeType = 'medium';
      } else {
        matchBadge = 'Baixa Adesão';
        badgeType = 'low';
      }

      candidates.push({
        id: `${dateStr}_${startTimeStr}_${endTimeStr}`,
        date: dateStr,
        startTime: startTimeStr,
        endTime: endTimeStr,
        durationMinutes: durationMins,
        score: Math.round(overallScore),
        attendeeCount,
        totalParticipants,
        fullAttendees,
        partialAttendees,
        unavailableAttendees,
        matchBadge,
        badgeType,
        isFromOriginalRange,
        totalMinutesAttended: Math.round(totalMinutesAttended)
      });
    }
  }

  // Ordena pelas melhores opções:
  // 1º Maior número de participantes integrais
  // 2º Maior número total de participantes (integrais + parciais)
  // 3º Maior pontuação total de tempo
  candidates.sort((a, b) => {
    if (b.fullAttendees.length !== a.fullAttendees.length) {
      return b.fullAttendees.length - a.fullAttendees.length;
    }
    if (b.attendeeCount !== a.attendeeCount) {
      return b.attendeeCount - a.attendeeCount;
    }
    return b.score - a.score;
  });

  return candidates.slice(0, topN);
}

/**
 * Calcula matriz de calor (heatmap) para um determinado dia
 */
export function calculateHeatmap(event, dateStr) {
  const { timeRange = { start: '08:00', end: '23:00', step: 60 }, participants = [] } = event;
  const startMins = timeToMinutes(timeRange.start || '08:00');
  const endMins = timeToMinutes(timeRange.end || '23:00');
  const step = timeRange.step || 60;

  const totalParticipants = participants.length;
  const slots = [];

  for (let m = startMins; m < endMins; m += step) {
    const timeStr = minutesToTime(m);
    const key = `${dateStr}_${timeStr}`;

    const availableNames = [];
    const maybeNames = [];
    const unavailableNames = [];

    participants.forEach(p => {
      const status = (p.availabilities && p.availabilities[key]) || 'neutral';
      if (status === 'available') availableNames.push(p.name);
      else if (status === 'maybe') maybeNames.push(p.name);
      else if (status === 'unavailable') unavailableNames.push(p.name);
    });

    const score = availableNames.length + (maybeNames.length * 0.5);
    const percentage = totalParticipants > 0 ? Math.round((score / totalParticipants) * 100) : 0;

    slots.push({
      time: timeStr,
      key,
      availableCount: availableNames.length,
      maybeCount: maybeNames.length,
      unavailableCount: unavailableNames.length,
      availableNames,
      maybeNames,
      unavailableNames,
      percentage
    });
  }

  return slots;
}
