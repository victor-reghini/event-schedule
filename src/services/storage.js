/**
 * Gerenciamento de Estado Local e Persistência
 */

// Gera datas dinâmicas no futuro próximo para a demonstração
function getUpcomingDates() {
  const dates = [];
  const today = new Date();
  // Busca a próxima sexta, sábado e domingo
  for (let i = 2; i <= 6; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates.slice(0, 3); // 3 dias candidatos
}

const DEMO_DATES = getUpcomingDates();

export const INITIAL_USER = {
  id: 'usr-victor',
  name: 'Victor Reghini',
  email: 'victor@exemplo.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  isOrganizer: true
};

export const DEMO_PARTICIPANTS = [
  {
    id: 'usr-victor',
    name: 'Victor Reghini',
    email: 'victor@exemplo.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    availabilities: {}, // Será preenchido
    suggestions: ['Sábado à tarde seria o ideal pra mim!']
  },
  {
    id: 'usr-camila',
    name: 'Camila Santos',
    email: 'camila@exemplo.com',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    availabilities: {},
    suggestions: ['Qualquer horário no fim de semana']
  },
  {
    id: 'usr-rodrigo',
    name: 'Rodrigo Lima',
    email: 'rodrigo@exemplo.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    availabilities: {},
    suggestions: ['Consigo ficar até 18h no sábado']
  },
  {
    id: 'usr-mariana',
    name: 'Mariana Duarte',
    email: 'mariana@exemplo.com',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    availabilities: {},
    suggestions: ['Prefiro sábado à tarde']
  },
  {
    id: 'usr-lucas',
    name: 'Lucas Almeida',
    email: 'lucas@exemplo.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    availabilities: {},
    suggestions: []
  }
];

// Preenche dados realistas de disponibilidade para a demonstração
function buildDemoAvailabilities(dates) {
  const [d1, d2, d3] = dates; // sexta, sabado, domingo
  const times = [
    '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
    '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
  ];

  // Victor: Livre sexta à noite, sábado a tarde toda, domingo tarde
  DEMO_PARTICIPANTS[0].availabilities = {
    [`${d1}_19:00`]: 'available', [`${d1}_20:00`]: 'available', [`${d1}_21:00`]: 'available',
    [`${d2}_14:00`]: 'available', [`${d2}_15:00`]: 'available', [`${d2}_16:00`]: 'available',
    [`${d2}_17:00`]: 'available', [`${d2}_18:00`]: 'available', [`${d2}_19:00`]: 'available',
    [`${d3}_15:00`]: 'available', [`${d3}_16:00`]: 'available'
  };
  DEMO_PARTICIPANTS[0].customIntervals = [
    { id: 'v-int-1', dateStr: d1, startTime: '19:00', endTime: '22:00', status: 'available' },
    { id: 'v-int-2', dateStr: d2, startTime: '14:00', endTime: '20:00', status: 'available' },
    { id: 'v-int-3', dateStr: d3, startTime: '15:00', endTime: '17:00', status: 'available' }
  ];

  // Camila: Livre quase todo o sábado
  DEMO_PARTICIPANTS[1].availabilities = {
    [`${d1}_20:00`]: 'available',
    [`${d2}_12:00`]: 'available', [`${d2}_13:00`]: 'available', [`${d2}_14:00`]: 'available',
    [`${d2}_15:00`]: 'available', [`${d2}_16:00`]: 'available', [`${d2}_17:00`]: 'available',
    [`${d2}_18:00`]: 'available',
    [`${d3}_14:00`]: 'available', [`${d3}_15:00`]: 'available'
  };
  DEMO_PARTICIPANTS[1].customIntervals = [
    { id: 'c-int-1', dateStr: d1, startTime: '20:00', endTime: '21:00', status: 'available' },
    { id: 'c-int-2', dateStr: d2, startTime: '12:00', endTime: '19:00', status: 'available' },
    { id: 'c-int-3', dateStr: d3, startTime: '14:00', endTime: '16:00', status: 'available' }
  ];

  // Rodrigo: Livre sábado das 14h às 18h, ocupado das 18h às 19h
  DEMO_PARTICIPANTS[2].availabilities = {
    [`${d2}_14:00`]: 'available', [`${d2}_15:00`]: 'available', [`${d2}_16:00`]: 'available',
    [`${d2}_17:00`]: 'available', [`${d2}_18:00`]: 'unavailable',
    [`${d3}_16:00`]: 'available', [`${d3}_17:00`]: 'available'
  };
  DEMO_PARTICIPANTS[2].customIntervals = [
    { id: 'r-int-1', dateStr: d2, startTime: '14:00', endTime: '18:00', status: 'available' },
    { id: 'r-int-2', dateStr: d2, startTime: '18:00', endTime: '19:00', status: 'unavailable' },
    { id: 'r-int-3', dateStr: d3, startTime: '16:00', endTime: '18:00', status: 'available' }
  ];

  // Mariana: Livre sábado à tarde
  DEMO_PARTICIPANTS[3].availabilities = {
    [`${d2}_14:00`]: 'available', [`${d2}_15:00`]: 'available', [`${d2}_16:00`]: 'available',
    [`${d2}_17:00`]: 'available', [`${d2}_18:00`]: 'available',
    [`${d3}_15:00`]: 'available', [`${d3}_16:00`]: 'available'
  };
  DEMO_PARTICIPANTS[3].customIntervals = [
    { id: 'm-int-1', dateStr: d2, startTime: '14:00', endTime: '19:00', status: 'available' },
    { id: 'm-int-2', dateStr: d3, startTime: '15:00', endTime: '17:00', status: 'available' }
  ];

  // Lucas: Disponível sábado à tarde e domingo
  DEMO_PARTICIPANTS[4].availabilities = {
    [`${d2}_15:00`]: 'available', [`${d2}_16:00`]: 'available', [`${d2}_17:00`]: 'available',
    [`${d2}_18:00`]: 'available',
    [`${d3}_14:00`]: 'available', [`${d3}_15:00`]: 'available', [`${d3}_16:00`]: 'available'
  };
  DEMO_PARTICIPANTS[4].customIntervals = [
    { id: 'l-int-1', dateStr: d2, startTime: '15:00', endTime: '19:00', status: 'available' },
    { id: 'l-int-2', dateStr: d3, startTime: '14:00', endTime: '17:00', status: 'available' }
  ];
}

buildDemoAvailabilities(DEMO_DATES);

export const SEED_EVENTS = [
  {
    id: 'evt-reencontro-2026',
    title: 'Reencontro de Amigos da Turma',
    type: 'reencontro',
    emoji: '🎉',
    description: 'Bora matar a saudade e colocar os assuntos em dia! Vamos escolher o melhor horário para todo mundo comparecer.',
    organizer: {
      id: 'usr-victor',
      name: 'Victor Reghini',
      email: 'victor@exemplo.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    locationType: 'presencial',
    locationDetails: 'Vila Madalena - São Paulo (ou local a combinar)',
    duration: 180, // 3 horas
    dates: DEMO_DATES,
    timeRange: { start: '12:00', end: '22:00', step: 60 },
    privacy: 'public', // 'public' (todos veem tudo) ou 'private' (só organizador)
    status: 'voting', // 'voting' ou 'confirmed'
    confirmedSlot: null,
    allowLocationSuggestions: true,
    locationSuggestions: [
      {
        id: 'loc-1',
        title: 'Bar & Restaurante Pirajá (Pinheiros)',
        address: 'Rua Fradique Coutinho, 124 - Pinheiros',
        notes: 'Clima descontraído, ótimos petiscos e mesas grandes.',
        creator: {
          id: 'usr-camila',
          name: 'Camila Santos',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
        },
        createdAt: new Date().toISOString(),
        votes: {
          'usr-camila': 'approve',
          'usr-victor': 'approve',
          'usr-mariana': 'approve',
          'usr-rodrigo': 'reject'
        }
      },
      {
        id: 'loc-2',
        title: 'Parque Villa-Lobos (Área de Piquenique)',
        address: 'Av. Prof. Fonseca Rodrigues, 2001 - Alto de Pinheiros',
        notes: 'Espaço aberto ao ar livre, bom para levar comidas e bebidas.',
        creator: {
          id: 'usr-lucas',
          name: 'Lucas Almeida',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
        },
        createdAt: new Date().toISOString(),
        votes: {
          'usr-lucas': 'approve',
          'usr-victor': 'approve',
          'usr-camila': 'reject'
        }
      }
    ],
    customSuggestions: [
      {
        id: 'sug-1',
        date: DEMO_DATES[1],
        startTime: '15:30',
        endTime: '18:30',
        title: 'Sábado à tarde após o almoço',
        creator: {
          id: 'usr-camila',
          name: 'Camila Santos',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
        },
        createdAt: new Date().toISOString(),
        votes: {
          'usr-camila': 'available',
          'usr-victor': 'available',
          'usr-mariana': 'available',
          'usr-rodrigo': 'unavailable'
        }
      },
      {
        id: 'sug-2',
        date: DEMO_DATES[2],
        startTime: '16:00',
        endTime: '19:00',
        title: 'Final de tarde no Domingo',
        creator: {
          id: 'usr-lucas',
          name: 'Lucas Almeida',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
        },
        createdAt: new Date().toISOString(),
        votes: {
          'usr-lucas': 'available',
          'usr-victor': 'available'
        }
      }
    ],
    participants: DEMO_PARTICIPANTS,
    createdAt: new Date().toISOString()
  },
  {
    id: 'evt-reuniao-presencial',
    title: 'Planejamento Estratégico Q4',
    type: 'reuniao-presencial',
    emoji: '💼',
    description: 'Reunião executiva para alinhamento de metas e prioridades.',
    organizer: {
      id: 'usr-victor',
      name: 'Victor Reghini',
      email: 'victor@exemplo.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    locationType: 'presencial',
    locationDetails: 'Sala Principal - Av. Paulista, 1000',
    duration: 120, // 2 horas
    dates: [DEMO_DATES[0], DEMO_DATES[1]],
    timeRange: { start: '09:00', end: '18:00', step: 60 },
    privacy: 'private', // Visibilidade restrita ao organizador
    status: 'confirmed',
    confirmedSlot: {
      date: DEMO_DATES[0],
      startTime: '14:00',
      endTime: '16:00',
      durationMinutes: 120
    },
    allowLocationSuggestions: false,
    locationSuggestions: [],
    customSuggestions: [],
    participants: [DEMO_PARTICIPANTS[0], DEMO_PARTICIPANTS[1], DEMO_PARTICIPANTS[2]],
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'evt-almoco-equipe',
    title: 'Almoço de Fim de Ano da Equipe',
    type: 'encontro',
    emoji: '🍽️',
    description: 'Confraternização anual do time no restaurante.',
    organizer: {
      id: 'usr-victor',
      name: 'Victor Reghini',
      email: 'victor@exemplo.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    locationType: 'presencial',
    locationDetails: 'Fogo de Chão - Jardins',
    duration: 120,
    dates: [DEMO_DATES[0]],
    timeRange: { start: '12:00', end: '16:00', step: 60 },
    privacy: 'public',
    status: 'completed',
    confirmedSlot: {
      date: DEMO_DATES[0],
      startTime: '12:30',
      endTime: '14:30',
      durationMinutes: 120
    },
    allowLocationSuggestions: false,
    locationSuggestions: [],
    customSuggestions: [],
    participants: [DEMO_PARTICIPANTS[0], DEMO_PARTICIPANTS[1], DEMO_PARTICIPANTS[3]],
    createdAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'evt-workshop-design',
    title: 'Workshop de Design Thinking Presencial',
    type: 'reuniao-presencial',
    emoji: '🎨',
    description: 'Sessão prática cancelada por indisponibilidade da sala.',
    organizer: {
      id: 'usr-victor',
      name: 'Victor Reghini',
      email: 'victor@exemplo.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    },
    locationType: 'presencial',
    locationDetails: 'Coworking Paulista - Sala 4',
    duration: 180,
    dates: [DEMO_DATES[1]],
    timeRange: { start: '14:00', end: '18:00', step: 60 },
    privacy: 'public',
    status: 'canceled',
    confirmedSlot: null,
    allowLocationSuggestions: false,
    locationSuggestions: [],
    customSuggestions: [],
    participants: [DEMO_PARTICIPANTS[0], DEMO_PARTICIPANTS[2]],
    createdAt: new Date(Date.now() - 259200000).toISOString()
  }
];

const STORAGE_KEYS = {
  EVENTS: 'sincroniza_events_v7',
  CURRENT_USER: 'sincroniza_user_v2'
};

export function getStoredEvents() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(e => ({
          ...e,
          status: e.status || 'voting'
        }));
      }
    }
  } catch (e) {
    console.error('Erro ao ler eventos:', e);
  }
  // Se não existir, salva os dados de seed
  saveStoredEvents(SEED_EVENTS);
  return SEED_EVENTS;
}

export function saveStoredEvents(events) {
  try {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
  } catch (e) {
    console.error('Erro ao salvar eventos:', e);
  }
}

export function getStoredUser() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Erro ao ler usuário:', e);
  }
  saveStoredUser(INITIAL_USER);
  return INITIAL_USER;
}

export function saveStoredUser(user) {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } catch (e) {
    console.error('Erro ao salvar usuário:', e);
  }
}
