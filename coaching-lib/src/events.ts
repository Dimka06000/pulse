// ============================================================
// @oikos/coaching — Event Engine
// Platform + partner events. CRUD, slot management, matching.
// DB: 009_events.sql (events + event_participants)
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EventFilters,
  CreateEventInput,
  UpdateEventInput,
  RegisterEventInput,
  EventWithCounts,
  EventParticipantStatus,
  MatchCandidate,
} from './types';

// ─── List events with filters ───────────────────────────────────────

export async function listEvents(
  supabase: SupabaseClient,
  filters: EventFilters,
  currentUserId?: string,
): Promise<{ data: EventWithCounts[]; count: number }> {
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const offset = (page - 1) * limit;

  // Base query — events with participant counts
  let query = supabase
    .from('events')
    .select('*, event_participants(*)', { count: 'exact' })
    .order('date', { ascending: true })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (filters.sport) query = query.eq('sport', filters.sport);
  if (filters.level && filters.level !== 'all') query = query.eq('level', filters.level);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('date', filters.dateTo);
  if (filters.city) query = query.ilike('address', `%${filters.city}%`);

  // Only show open/full events to athletes (not draft)
  if (!filters.status) {
    query = query.in('status', ['open', 'full', 'completed']);
  }

  const { data: events, error, count } = await query;
  if (error) throw error;

  // Compute slot counts per event
  const enriched: EventWithCounts[] = (events ?? []).map((event: any) => {
    const participants = event.event_participants ?? [];
    const coaches = participants.filter((p: any) => p.role === 'coach');
    const athletes = participants.filter((p: any) => p.role === 'athlete');

    const userParticipation = currentUserId
      ? participants.find((p: any) => p.user_id === currentUserId)
      : null;

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      type: event.type,
      partnerId: event.partner_id,
      date: event.date,
      lat: event.lat,
      lng: event.lng,
      address: event.address,
      slotsCoach: event.slots_coach,
      slotsAthlete: event.slots_athlete,
      price: event.price,
      sport: event.sport,
      level: event.level,
      status: event.status,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      filledCoach: coaches.length,
      filledAthlete: athletes.length,
      confirmedCoach: coaches.filter((c: any) => c.status === 'confirmed').length,
      confirmedAthlete: athletes.filter((a: any) => a.status === 'confirmed').length,
      userStatus: userParticipation?.status ?? null,
    };
  });

  return { data: enriched, count: count ?? 0 };
}

// ─── Get single event ───────────────────────────────────────────────

export async function getEvent(
  supabase: SupabaseClient,
  eventId: string,
  currentUserId?: string,
): Promise<EventWithCounts | null> {
  const { data: event, error } = await supabase
    .from('events')
    .select('*, event_participants(*, profiles:user_id(id, display_name, avatar_url))')
    .eq('id', eventId)
    .single();

  if (error || !event) return null;

  const participants = event.event_participants ?? [];
  const coaches = participants.filter((p: any) => p.role === 'coach');
  const athletes = participants.filter((p: any) => p.role === 'athlete');
  const userParticipation = currentUserId
    ? participants.find((p: any) => p.user_id === currentUserId)
    : null;

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    type: event.type,
    partnerId: event.partner_id,
    date: event.date,
    lat: event.lat,
    lng: event.lng,
    address: event.address,
    slotsCoach: event.slots_coach,
    slotsAthlete: event.slots_athlete,
    price: event.price,
    sport: event.sport,
    level: event.level,
    status: event.status,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
    filledCoach: coaches.length,
    filledAthlete: athletes.length,
    confirmedCoach: coaches.filter((c: any) => c.status === 'confirmed').length,
    confirmedAthlete: athletes.filter((a: any) => a.status === 'confirmed').length,
    userStatus: userParticipation?.status ?? null,
  };
}

// ─── Create event ───────────────────────────────────────────────────

export async function createEvent(
  supabase: SupabaseClient,
  input: CreateEventInput,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: input.title,
      description: input.description ?? '',
      type: input.type,
      partner_id: input.partnerId ?? null,
      date: input.date,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      address: input.address ?? null,
      slots_coach: input.slotsCoach,
      slots_athlete: input.slotsAthlete,
      price: input.price,
      sport: input.sport ?? null,
      level: input.level ?? 'all',
      status: 'draft',
    })
    .select('id')
    .single();

  if (error) throw error;
  return { id: data.id };
}

// ─── Update event ───────────────────────────────────────────────────

export async function updateEvent(
  supabase: SupabaseClient,
  eventId: string,
  input: UpdateEventInput,
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (input.title !== undefined) update.title = input.title;
  if (input.description !== undefined) update.description = input.description;
  if (input.date !== undefined) update.date = input.date;
  if (input.lat !== undefined) update.lat = input.lat;
  if (input.lng !== undefined) update.lng = input.lng;
  if (input.address !== undefined) update.address = input.address;
  if (input.slotsCoach !== undefined) update.slots_coach = input.slotsCoach;
  if (input.slotsAthlete !== undefined) update.slots_athlete = input.slotsAthlete;
  if (input.price !== undefined) update.price = input.price;
  if (input.sport !== undefined) update.sport = input.sport;
  if (input.level !== undefined) update.level = input.level;
  if (input.status !== undefined) update.status = input.status;

  const { error } = await supabase
    .from('events')
    .update(update)
    .eq('id', eventId);

  if (error) throw error;
}

// ─── Register / Apply ───────────────────────────────────────────────

export async function registerForEvent(
  supabase: SupabaseClient,
  input: RegisterEventInput,
): Promise<{ participantId: string; status: EventParticipantStatus }> {
  // Check event exists and is open
  const { data: event, error: evErr } = await supabase
    .from('events')
    .select('*')
    .eq('id', input.eventId)
    .single();

  if (evErr || !event) throw new Error('Event not found');
  if (event.status !== 'open') throw new Error('Event is not open for registration');

  // Check not already registered
  const { data: existing } = await supabase
    .from('event_participants')
    .select('id, status')
    .eq('event_id', input.eventId)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (existing && existing.status !== 'cancelled') {
    throw new Error('Already registered for this event');
  }

  // Count current participants by role
  const { count: currentCount } = await supabase
    .from('event_participants')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', input.eventId)
    .eq('role', input.role)
    .in('status', ['applied', 'confirmed']);

  const maxSlots = input.role === 'coach' ? event.slots_coach : event.slots_athlete;
  const isFull = (currentCount ?? 0) >= maxSlots;

  if (isFull && input.role === 'athlete') {
    throw new Error('No athlete slots available');
  }

  // Coaches always "apply" (platform selects). Athletes "confirmed" directly if free event, "applied" if paid.
  let initialStatus: EventParticipantStatus;
  if (input.role === 'coach') {
    initialStatus = 'applied'; // coaches must be confirmed by platform/partner
  } else {
    initialStatus = event.price > 0 ? 'applied' : 'confirmed'; // free events = instant confirm
  }

  // Upsert if previously cancelled
  if (existing) {
    const { error } = await supabase
      .from('event_participants')
      .update({ status: initialStatus })
      .eq('id', existing.id);
    if (error) throw error;
    return { participantId: existing.id, status: initialStatus };
  }

  const { data, error } = await supabase
    .from('event_participants')
    .insert({
      event_id: input.eventId,
      user_id: input.userId,
      role: input.role,
      status: initialStatus,
    })
    .select('id')
    .single();

  if (error) throw error;

  // Check if event is now full and update status
  await updateEventFullStatus(supabase, input.eventId);

  return { participantId: data.id, status: initialStatus };
}

// ─── Cancel registration ────────────────────────────────────────────

export async function cancelRegistration(
  supabase: SupabaseClient,
  eventId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('event_participants')
    .update({ status: 'cancelled' })
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) throw error;

  // Re-check if event should go back to 'open'
  await updateEventFullStatus(supabase, eventId);
}

// ─── Confirm / Reject coach application ─────────────────────────────

export async function updateParticipantStatus(
  supabase: SupabaseClient,
  eventId: string,
  userId: string,
  status: 'confirmed' | 'rejected',
): Promise<void> {
  const { error } = await supabase
    .from('event_participants')
    .update({ status })
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) throw error;

  if (status === 'confirmed') {
    await updateEventFullStatus(supabase, eventId);
  }
}

// ─── Get event participants ─────────────────────────────────────────

export async function getEventParticipants(
  supabase: SupabaseClient,
  eventId: string,
  role?: 'coach' | 'athlete',
): Promise<any[]> {
  let query = supabase
    .from('event_participants')
    .select('*, profiles:user_id(id, display_name, avatar_url, email)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (role) query = query.eq('role', role);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// ─── Matching: find qualified coaches for unfilled event ────────────

export async function matchCoachesForEvent(
  supabase: SupabaseClient,
  eventId: string,
): Promise<MatchCandidate[]> {
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (!event) return [];

  // Get already registered coach IDs
  const { data: existingCoaches } = await supabase
    .from('event_participants')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('role', 'coach')
    .in('status', ['applied', 'confirmed']);

  const excludeIds = (existingCoaches ?? []).map((c: any) => c.user_id);

  // Find coaches matching sport + location
  let query = supabase
    .from('coach_profiles')
    .select('*, profiles:user_id(id, display_name)')
    .eq('is_verified', true);

  if (excludeIds.length > 0) {
    // Filter out already registered coaches
    query = query.not('user_id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: coaches } = await query;
  if (!coaches) return [];

  // Score each candidate
  const candidates: MatchCandidate[] = coaches.map((coach: any) => {
    let score = 0;
    const reasons: string[] = [];

    // Sport match
    const specialties: string[] = coach.specialties ?? [];
    if (event.sport && specialties.some((s: string) =>
      s.toLowerCase().includes(event.sport.toLowerCase())
    )) {
      score += 40;
      reasons.push('sport match');
    }

    // Location proximity (simple check — same city in address)
    if (event.address && coach.city) {
      const eventCity = event.address.toLowerCase();
      const coachCity = (coach.city as string).toLowerCase();
      if (eventCity.includes(coachCity) || coachCity.includes(eventCity)) {
        score += 30;
        reasons.push('within area');
      }
    }

    // Verified bonus
    if (coach.is_verified) {
      score += 15;
      reasons.push('verified coach');
    }

    // Rating bonus
    if (coach.avg_rating && coach.avg_rating >= 4.0) {
      score += 15;
      reasons.push('high rating');
    }

    return {
      userId: coach.user_id,
      name: coach.profiles?.display_name ?? 'Coach',
      matchScore: score,
      matchReasons: reasons,
    };
  });

  // Sort by score desc, return top 20
  return candidates
    .filter((c) => c.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 20);
}

// ─── Matching: find athletes for promotion ──────────────────────────

export async function matchAthletesForEvent(
  supabase: SupabaseClient,
  eventId: string,
): Promise<MatchCandidate[]> {
  const { data: event } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (!event) return [];

  // Get already registered athlete IDs
  const { data: existingAthletes } = await supabase
    .from('event_participants')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('role', 'athlete')
    .in('status', ['applied', 'confirmed']);

  const excludeIds = (existingAthletes ?? []).map((a: any) => a.user_id);

  // Find athletes — all profiles that are not coaches-only
  let query = supabase
    .from('profiles')
    .select('id, display_name, city')
    .in('role', ['client', 'both']); // athletes or dual-role

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data: athletes } = await query;
  if (!athletes) return [];

  const candidates: MatchCandidate[] = athletes.map((athlete: any) => {
    let score = 0;
    const reasons: string[] = [];

    // Location match
    if (event.address && athlete.city) {
      const eventCity = event.address.toLowerCase();
      const athleteCity = (athlete.city as string).toLowerCase();
      if (eventCity.includes(athleteCity) || athleteCity.includes(eventCity)) {
        score += 50;
        reasons.push('same city');
      }
    }

    // Sport interest (would need a preferences table — for now, base score)
    if (event.sport) {
      score += 20;
      reasons.push('sport interest');
    }

    // Free event bonus
    if (event.price === 0) {
      score += 30;
      reasons.push('free event');
    }

    return {
      userId: athlete.id,
      name: athlete.display_name ?? 'Athlete',
      matchScore: score,
      matchReasons: reasons,
    };
  });

  return candidates
    .filter((c) => c.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 50);
}

// ─── Internal: update event full status ─────────────────────────────

async function updateEventFullStatus(
  supabase: SupabaseClient,
  eventId: string,
): Promise<void> {
  const { data: event } = await supabase
    .from('events')
    .select('slots_coach, slots_athlete, status')
    .eq('id', eventId)
    .single();

  if (!event || event.status === 'completed') return;

  const { count: coachCount } = await supabase
    .from('event_participants')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('role', 'coach')
    .eq('status', 'confirmed');

  const { count: athleteCount } = await supabase
    .from('event_participants')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .eq('role', 'athlete')
    .in('status', ['applied', 'confirmed']);

  const isFull =
    (coachCount ?? 0) >= event.slots_coach &&
    (athleteCount ?? 0) >= event.slots_athlete;

  const newStatus = isFull ? 'full' : 'open';
  if (event.status !== newStatus && event.status !== 'draft') {
    await supabase
      .from('events')
      .update({ status: newStatus })
      .eq('id', eventId);
  }
}
