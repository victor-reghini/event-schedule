import { supabase } from './supabaseClient';
import { timeToMinutes, minutesToTime } from './schedulerAlgorithm';

export const DAY_NAMES = [
  { id: 0, short: 'Dom', full: 'Domingo' },
  { id: 1, short: 'Seg', full: 'Segunda-feira' },
  { id: 2, short: 'Ter', full: 'Terça-feira' },
  { id: 3, short: 'Qua', full: 'Quarta-feira' },
  { id: 4, short: 'Qui', full: 'Quinta-feira' },
  { id: 5, short: 'Sex', full: 'Sexta-feira' },
  { id: 6, short: 'Sáb', full: 'Sábado' }
];

// Arredonda minutos para o múltiplo de 15 mais próximo
export function roundTo15(mins) {
  return Math.round(mins / 15) * 15;
}

// Extrai dia da semana de "YYYY-MM-DD" sem sofrer desvio de fuso horário
export function getDayOfWeekFromDateStr(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return 0;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

const STORAGE_KEY_PREFIX = 'sincroniza_user_routines_';

/**
 * Obtém as rotinas salvas no perfil do usuário
 * @param {string} userId
 */
export function getUserSavedRoutines(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Erro ao carregar rotinas salvas do localStorage:', err);
  }
  return [];
}

/**
 * Salva as rotinas do usuário no localStorage e no Supabase Auth Metadata
 * @param {string} userId
 * @param {Array} routines
 */
export async function saveUserSavedRoutines(userId, routines) {
  if (!userId) return;
  const safeRoutines = Array.isArray(routines) ? routines : [];

  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(safeRoutines));
  } catch (err) {
    console.warn('Erro ao salvar rotinas no localStorage:', err);
  }

  // Sincroniza em segundo plano com auth metadata do Supabase para persistir em outros dispositivos
  try {
    if (supabase?.auth) {
      await supabase.auth.updateUser({
        data: { saved_routines: safeRoutines }
      });
    }
  } catch (err) {
    // Falha silenciosa em caso offline ou sem sessão ativa
    console.debug('Sincronização remota de rotinas ignorada:', err?.message);
  }
}

/**
 * Adiciona ou atualiza uma rotina na lista do usuário
 */
export async function upsertUserSavedRoutine(userId, routine) {
  if (!userId || !routine) return [];
  const current = getUserSavedRoutines(userId);
  const existingIdx = current.findIndex(r => r.id === routine.id);

  let updated;
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = {
      ...updated[existingIdx],
      ...routine,
      updatedAt: new Date().toISOString()
    };
  } else {
    updated = [
      ...current,
      {
        ...routine,
        id: routine.id || `routine-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        createdAt: new Date().toISOString()
      }
    ];
  }

  await saveUserSavedRoutines(userId, updated);
  return updated;
}

/**
 * Remove uma rotina da lista do usuário
 */
export async function removeUserSavedRoutine(userId, routineId) {
  if (!userId || !routineId) return [];
  const current = getUserSavedRoutines(userId);
  const updated = current.filter(r => r.id !== routineId);
  await saveUserSavedRoutines(userId, updated);
  return updated;
}

/**
 * Aplica rotinas salvas nas datas especificadas
 * @param {Array} routines - Regras de rotina
 * @param {Array} datesList - Lista de datas ("YYYY-MM-DD")
 * @param {Array} existingIntervals - Intervalos já existentes para evitar duplicatas exatas
 */
export function applyRoutinesToDates(routines = [], datesList = [], existingIntervals = []) {
  if (!routines.length || !datesList.length) {
    return { newIntervals: [...existingIntervals], addedCount: 0 };
  }

  const result = [...existingIntervals];
  let addedCount = 0;

  datesList.forEach(dateStr => {
    const dayOfWeek = getDayOfWeekFromDateStr(dateStr);

    routines.forEach(routine => {
      const routineDays = routine.daysOfWeek || [];
      if (!routineDays.includes(dayOfWeek)) return;

      // Verifica se já existe um intervalo idêntico nesta data
      const alreadyExists = result.some(
        item =>
          item.dateStr === dateStr &&
          item.startTime === routine.startTime &&
          item.endTime === routine.endTime
      );

      if (!alreadyExists) {
        result.push({
          id: `int-${routine.id}-${dateStr}-${Math.random().toString(36).substr(2, 4)}`,
          recurrenceRuleId: routine.id,
          dateStr,
          startTime: routine.startTime,
          endTime: routine.endTime,
          status: routine.status || 'unavailable',
          title: routine.title || '',
          isRecurring: true,
          recurrenceDays: routine.daysOfWeek,
          saveToProfile: true
        });
        addedCount++;
      }
    });
  });

  return { newIntervals: result, addedCount };
}

/**
 * Reconstrói o mapa de availabilities (${dateStr}_${timeStr} -> status) a partir de uma lista de intervalos
 * @param {Array} intervals
 */
export function buildAvailabilitiesMap(intervals = []) {
  const map = {};

  (intervals || []).forEach(item => {
    if (!item.dateStr || !item.startTime || !item.endTime || !item.status) return;

    const startM = timeToMinutes(item.startTime);
    const endM = timeToMinutes(item.endTime);
    if (isNaN(startM) || isNaN(endM) || startM >= endM) return;

    const roundedStart = roundTo15(startM);
    let roundedEnd = roundTo15(endM);
    if (roundedEnd <= roundedStart) {
      roundedEnd = roundedStart + 15;
    }

    // Fatias de 15 minutos
    for (let m = roundedStart; m < roundedEnd; m += 15) {
      const timeStr = minutesToTime(m);
      map[`${item.dateStr}_${timeStr}`] = item.status;
    }

    // Horas cheias para retrocompatibilidade
    for (let h = Math.floor(startM / 60); h <= Math.ceil(endM / 60); h++) {
      const hM = h * 60;
      if (hM >= startM && hM < endM) {
        map[`${item.dateStr}_${minutesToTime(hM)}`] = item.status;
      }
    }
  });

  return map;
}
