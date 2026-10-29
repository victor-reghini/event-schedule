export const EVENT_PRESETS = [
  {
    id: 'reencontro',
    title: 'Reencontro de Amigos',
    emoji: '🎉',
    duration: 180, // 3h
    locationType: 'presencial',
    defaultLocation: 'Barzinho / Parque / Casa de alguém',
    description: 'Bora matar a saudade e botar a conversa em dia! Marque os horários que você pode colar.',
    color: '#0069ff'
  },
  {
    id: 'encontro',
    title: 'Encontro Casual',
    emoji: '☕',
    duration: 90, // 1h30
    locationType: 'presencial',
    defaultLocation: 'Cafeteria / Shopping',
    description: 'Um café tranquilo para bater papo e relaxar.',
    color: '#0284c7'
  },
  {
    id: 'reuniao-presencial',
    title: 'Reunião Presencial',
    emoji: '💼',
    duration: 60, // 1h
    locationType: 'presencial',
    defaultLocation: 'Sala de Reuniões / Coworking',
    description: 'Alinhamento estratégico presencial de equipe e definição de próximos passos.',
    color: '#4f46e5'
  },
  {
    id: 'churrasco',
    title: 'Churrasco com a Galera',
    emoji: '🥩',
    duration: 300, // 5h
    locationType: 'presencial',
    defaultLocation: 'Chácara / Área de Lazer',
    description: 'Churrasco de confraternização! Vamos achar o dia com o maior número de pessoas livres.',
    color: '#ea580c'
  },
  {
    id: 'jogatina',
    title: 'Noite de Jogatina & Games',
    emoji: '🎲',
    duration: 240, // 4h
    locationType: 'presencial',
    defaultLocation: 'Casa de Jogos / Sala de Estar',
    description: 'Jogatina de tabuleiros, cartas ou videogame. Chegue quando puder e fique até quando der!',
    color: '#9333ea'
  },
  {
    id: 'almoco-jantar',
    title: 'Almoço ou Jantar',
    emoji: '🍕',
    duration: 120, // 2h
    locationType: 'presencial',
    defaultLocation: 'Restaurante / Pizzaria',
    description: 'Uma boa refeição reunindo todo mundo com calma.',
    color: '#d97706'
  },
  {
    id: 'estudo',
    title: 'Estudo em Grupo',
    emoji: '📚',
    duration: 120, // 2h
    locationType: 'presencial',
    defaultLocation: 'Biblioteca / Sala de Estudos',
    description: 'Sessão focada de estudos para provas ou projetos.',
    color: '#059669'
  },
  {
    id: 'online',
    title: 'Reunião ou Call Online',
    emoji: '💻',
    duration: 45,
    locationType: 'online',
    defaultLocation: 'Google Meet / Zoom',
    description: 'Alinhamento rápido por videoconferência.',
    color: '#2563eb'
  }
];

export const DURATION_OPTIONS = [
  { label: '30 minutos', value: 30 },
  { label: '45 minutos', value: 45 },
  { label: '1 hora', value: 60 },
  { label: '1h 30min', value: 90 },
  { label: '2 horas', value: 120 },
  { label: '3 horas', value: 180 },
  { label: '4 horas', value: 240 },
  { label: '5 horas', value: 300 },
  { label: '6 horas', value: 360 }
];
