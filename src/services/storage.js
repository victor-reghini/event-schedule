import { supabase } from './supabaseClient';

const EVENT_RELATIONAL_SELECT = `
  *,
  organizer:profiles!events_organizer_id_fkey(id, name, email, avatar_url),
  event_participants(
    user_id,
    availabilities,
    custom_intervals,
    suggestions,
    joined_at,
    updated_at,
    profile:profiles!event_participants_user_id_fkey(id, name, email, avatar_url)
  ),
  location_suggestions(
    id,
    title,
    address,
    notes,
    created_at,
    creator:profiles!location_suggestions_creator_id_fkey(id, name, email, avatar_url),
    location_votes(user_id, vote)
  ),
  time_suggestions(
    id,
    date,
    start_time,
    end_time,
    title,
    created_at,
    creator:profiles!time_suggestions_creator_id_fkey(id, name, email, avatar_url),
    time_suggestion_votes(user_id, vote)
  )
`;

function mapEventRowToClient(row) {
  const rawTimeRange = row.time_range || { start: '09:00', end: '18:00', step: 60 };
  const {
    start = '09:00',
    end = '18:00',
    step = 60,
    dateMode = 'specific',
    dateRange = null,
    suggestedTimeWindow = null
  } = rawTimeRange;

  const baseDates = Array.isArray(row.dates) ? row.dates : [];

  const participants = (row.event_participants || []).map(p => ({
    id: p.user_id,
    name: p.profile?.name || 'Participante',
    email: p.profile?.email || '',
    avatar: p.profile?.avatar_url || '',
    availabilities: p.availabilities || {},
    customIntervals: Array.isArray(p.custom_intervals) ? p.custom_intervals : [],
    suggestions: Array.isArray(p.suggestions) ? p.suggestions : [],
    joinedAt: p.joined_at,
    updatedAt: p.updated_at
  }));

  const extraDatesSet = new Set();
  participants.forEach(p => {
    (p.customIntervals || []).forEach(interval => {
      if (interval?.dateStr && !baseDates.includes(interval.dateStr)) {
        extraDatesSet.add(interval.dateStr);
      }
    });
  });

  const locationSuggestions = [...(row.location_suggestions || [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(loc => ({
      id: loc.id,
      title: loc.title,
      address: loc.address || '',
      notes: loc.notes || '',
      createdAt: loc.created_at,
      creator: {
        id: loc.creator?.id || '',
        name: loc.creator?.name || 'Participante',
        avatar: loc.creator?.avatar_url || ''
      },
      votes: Object.fromEntries((loc.location_votes || []).map(v => [v.user_id, v.vote]))
    }));

  const customSuggestions = [...(row.time_suggestions || [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(sug => ({
      id: sug.id,
      date: sug.date,
      startTime: sug.start_time,
      endTime: sug.end_time,
      title: sug.title || 'Sugestão de Horário',
      createdAt: sug.created_at,
      creator: {
        id: sug.creator?.id || '',
        name: sug.creator?.name || 'Participante',
        avatar: sug.creator?.avatar_url || ''
      },
      votes: Object.fromEntries((sug.time_suggestion_votes || []).map(v => [v.user_id, v.vote]))
    }));

  return {
    id: row.id,
    title: row.title,
    type: row.type || 'encontro',
    emoji: row.emoji || '📅',
    description: row.description || '',
    organizer: {
      id: row.organizer?.id || row.organizer_id,
      name: row.organizer?.name || 'Organizador',
      email: row.organizer?.email || '',
      avatar: row.organizer?.avatar_url || ''
    },
    locationType: row.location_type || 'presencial',
    locationDetails: row.location_details || '',
    allowLocationSuggestions: Boolean(row.allow_location_suggestions),
    locationSuggestions,
    customSuggestions,
    duration: Number(row.duration) || 60,
    dates: baseDates,
    extraDates: Array.from(extraDatesSet),
    dateMode,
    dateRange,
    suggestedTimeWindow,
    timeRange: { start, end, step },
    privacy: row.privacy || 'public',
    status: row.status || 'voting',
    confirmedSlot: row.confirmed_slot || null,
    participants,
    createdAt: row.created_at
  };
}

export async function fetchEvents() {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_RELATIONAL_SELECT)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erro ao carregar eventos do Supabase: ${error.message}`);
  }

  return (data || []).map(mapEventRowToClient);
}

export function subscribeToEventsRealtime(onSyncNeeded) {
  let debounceTimer = null;

  const channel = supabase
    .channel('sincroniza-realtime-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          onSyncNeeded();
        }, 250);
      }
    )
    .subscribe();

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    supabase.removeChannel(channel);
  };
}

export async function createEventInDb(newEvent, organizerId) {
  const packedTimeRange = {
    ...(newEvent.timeRange || { start: '08:00', end: '23:00', step: 60 }),
    dateMode: newEvent.dateMode || 'specific',
    dateRange: newEvent.dateRange || null,
    suggestedTimeWindow: newEvent.suggestedTimeWindow || null
  };

  const { data: insertedEvent, error: eventErr } = await supabase
    .from('events')
    .insert({
      id: newEvent.id,
      title: newEvent.title,
      type: newEvent.type || 'encontro',
      emoji: newEvent.emoji || '📅',
      description: newEvent.description || '',
      organizer_id: organizerId,
      location_type: newEvent.locationType || 'presencial',
      location_details: newEvent.locationDetails || '',
      duration: Number(newEvent.duration) || 60,
      dates: newEvent.dates || [],
      time_range: packedTimeRange,
      privacy: newEvent.privacy || 'public',
      status: newEvent.status || 'voting',
      confirmed_slot: newEvent.confirmedSlot || null,
      allow_location_suggestions: newEvent.allowLocationSuggestions ?? true
    })
    .select('id')
    .single();

  if (eventErr) {
    throw new Error(`Erro ao criar evento: ${eventErr.message}`);
  }

  const { error: partErr } = await supabase
    .from('event_participants')
    .upsert(
      {
        event_id: insertedEvent.id,
        user_id: organizerId,
        availabilities: {},
        custom_intervals: [],
        suggestions: []
      },
      { onConflict: 'event_id,user_id' }
    );

  if (partErr) {
    throw new Error(`Erro ao registrar organizador no evento: ${partErr.message}`);
  }

  return insertedEvent.id;
}

export async function joinEventInDb(eventId, userId) {
  const { error } = await supabase
    .from('event_participants')
    .upsert(
      {
        event_id: eventId,
        user_id: userId
      },
      { onConflict: 'event_id,user_id', ignoreDuplicates: true }
    );

  if (error) {
    throw new Error(`Erro ao ingressar no evento: ${error.message}`);
  }
}

export async function removeParticipantFromDb(eventId, participantId) {
  const { error } = await supabase
    .from('event_participants')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', participantId);

  if (error) {
    throw new Error(`Erro ao remover participante: ${error.message}`);
  }
}

export async function saveAvailabilityInDb(eventId, participantData) {
  const { error } = await supabase
    .from('event_participants')
    .upsert(
      {
        event_id: eventId,
        user_id: participantData.userId,
        availabilities: participantData.availabilities || {},
        custom_intervals: participantData.customIntervals || [],
        suggestions: participantData.suggestions || [],
        updated_at: new Date().toISOString()
      },
      { onConflict: 'event_id,user_id' }
    );

  if (error) {
    throw new Error(`Erro ao salvar disponibilidade: ${error.message}`);
  }
}

export async function updateEventFieldsInDb(eventId, fields) {
  const { error } = await supabase
    .from('events')
    .update({
      ...fields,
      updated_at: new Date().toISOString()
    })
    .eq('id', eventId);

  if (error) {
    throw new Error(`Erro ao atualizar evento: ${error.message}`);
  }
}

export async function addTimeSuggestionInDb(eventId, suggestionObj, creatorId) {
  const { data, error } = await supabase
    .from('time_suggestions')
    .insert({
      id: suggestionObj.id,
      event_id: eventId,
      creator_id: creatorId,
      date: suggestionObj.date,
      start_time: suggestionObj.startTime,
      end_time: suggestionObj.endTime,
      title: suggestionObj.title || 'Sugestão de Horário'
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Erro ao criar sugestão de horário: ${error.message}`);
  }

  await supabase
    .from('time_suggestion_votes')
    .upsert(
      {
        suggestion_id: data.id,
        user_id: creatorId,
        vote: 'available'
      },
      { onConflict: 'suggestion_id,user_id' }
    );
}

export async function voteTimeSuggestionInDb(suggestionId, userId, voteType) {
  const { error } = await supabase
    .from('time_suggestion_votes')
    .upsert(
      {
        suggestion_id: suggestionId,
        user_id: userId,
        vote: voteType
      },
      { onConflict: 'suggestion_id,user_id' }
    );

  if (error) {
    throw new Error(`Erro ao votar no horário: ${error.message}`);
  }
}

export async function addLocationSuggestionInDb(eventId, locationObj, creatorId) {
  const { data, error } = await supabase
    .from('location_suggestions')
    .insert({
      id: locationObj.id,
      event_id: eventId,
      creator_id: creatorId,
      title: locationObj.title,
      address: locationObj.address || '',
      notes: locationObj.notes || ''
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Erro ao sugerir local: ${error.message}`);
  }

  await supabase
    .from('location_votes')
    .upsert(
      {
        location_id: data.id,
        user_id: creatorId,
        vote: 'approve'
      },
      { onConflict: 'location_id,user_id' }
    );
}

export async function voteLocationInDb(locationId, userId, voteType, removeVote = false) {
  if (removeVote) {
    const { error } = await supabase
      .from('location_votes')
      .delete()
      .eq('location_id', locationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Erro ao remover voto do local: ${error.message}`);
    }
    return;
  }

  const { error } = await supabase
    .from('location_votes')
    .upsert(
      {
        location_id: locationId,
        user_id: userId,
        vote: voteType
      },
      { onConflict: 'location_id,user_id' }
    );

  if (error) {
    throw new Error(`Erro ao votar no local: ${error.message}`);
  }
}

export async function removeTimeSuggestionInDb(suggestionId) {
  // Limpa votos da sugestão
  await supabase
    .from('time_suggestion_votes')
    .delete()
    .eq('suggestion_id', suggestionId);

  const { error } = await supabase
    .from('time_suggestions')
    .delete()
    .eq('id', suggestionId);

  if (error) {
    throw new Error(`Erro ao excluir sugestão de horário: ${error.message}`);
  }
}

export async function removeLocationSuggestionInDb(locationId) {
  // Limpa votos da sugestão de local
  await supabase
    .from('location_votes')
    .delete()
    .eq('location_id', locationId);

  const { error } = await supabase
    .from('location_suggestions')
    .delete()
    .eq('id', locationId);

  if (error) {
    throw new Error(`Erro ao excluir sugestão de local: ${error.message}`);
  }
}

export async function createDemoEventForUser(currentUser) {
  const today = new Date();
  const upcomingDates = [2, 3, 4].map(offset => {
    const d = new Date(today);
    d.setDate(today.getDate() + offset);
    return d.toISOString().split('T')[0];
  });

  const eventId = `evt-demo-${Date.now()}`;

  await createEventInDb(
    {
      id: eventId,
      title: 'Reencontro de Amigos da Turma',
      type: 'reencontro',
      emoji: '🎉',
      description: 'Vamos escolher o melhor horário e local para todo mundo comparecer!',
      locationType: 'presencial',
      locationDetails: 'Vila Madalena - São Paulo (ou local a combinar)',
      duration: 180,
      dates: upcomingDates,
      timeRange: { start: '12:00', end: '22:00', step: 60 },
      privacy: 'public',
      status: 'voting',
      allowLocationSuggestions: true
    },
    currentUser.id
  );

  await saveAvailabilityInDb(eventId, {
    userId: currentUser.id,
    availabilities: {
      [`${upcomingDates[1]}_14:00`]: 'available',
      [`${upcomingDates[1]}_15:00`]: 'available',
      [`${upcomingDates[1]}_16:00`]: 'available',
      [`${upcomingDates[1]}_17:00`]: 'available'
    },
    customIntervals: [
      {
        id: `int-${Date.now()}`,
        dateStr: upcomingDates[1],
        startTime: '14:00',
        endTime: '18:00',
        status: 'available'
      }
    ],
    suggestions: ['Sábado à tarde seria ideal!']
  });

  await addLocationSuggestionInDb(
    eventId,
    {
      id: `loc-${Date.now()}`,
      title: 'Bar & Restaurante Pirajá (Pinheiros)',
      address: 'Rua Fradique Coutinho, 124 - Pinheiros',
      notes: 'Ótimos petiscos e mesas grandes para grupos.'
    },
    currentUser.id
  );

  return eventId;
}
