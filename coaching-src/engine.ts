// ============================================================
// @oikos/coaching — Coach Engine
// Business logic for coach profiles and search.
// Uses Supabase client passed by the caller (server or browser).
// PostGIS for geo queries (ST_DWithin, ST_Distance).
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CoachSearchFilters,
  CoachSearchResult,
  CreateCoachProfileInput,
  UpdateCoachProfileInput,
} from './types';

const DEFAULT_LIMIT = 20;
const DEFAULT_RADIUS_KM = 50;
const METERS_PER_KM = 1000;

/**
 * Search coaches with filters. Uses PostGIS ST_DWithin for geo queries.
 * Returns paginated results with optional distance calculation.
 */
export async function searchCoaches(
  supabase: SupabaseClient,
  filters: CoachSearchFilters = {}
) {
  const {
    sport,
    level,
    priceMin,
    priceMax,
    lat,
    lng,
    radiusKm = DEFAULT_RADIUS_KM,
    minRating,
    sortBy = 'relevance',
    page = 1,
    limit = DEFAULT_LIMIT,
  } = filters;

  const offset = (page - 1) * limit;

  // If geo filter is active, use RPC for PostGIS query
  if (lat != null && lng != null) {
    const { data, error } = await supabase.rpc('search_coaches_geo', {
      p_lat: lat,
      p_lng: lng,
      p_radius_m: radiusKm * METERS_PER_KM,
      p_sport: sport ?? null,
      p_level: level ?? null,
      p_price_min: priceMin ?? null,
      p_price_max: priceMax ?? null,
      p_min_rating: minRating ?? null,
      p_sort_by: sortBy,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw error;
    return {
      coaches: (data ?? []) as CoachSearchResult[],
      page,
      limit,
    };
  }

  // Non-geo query: standard Supabase filters
  let query = supabase
    .from('coach_profiles')
    .select(`
      id, user_id, bio, specialties, certifications,
      hourly_rate, lat, lng, radius,
      accepts_anonymous_reviews, is_verified,
      avg_rating, total_sessions,
      profiles!inner(first_name, last_name, avatar_url, city)
    `)
    .range(offset, offset + limit - 1);

  if (sport) {
    query = query.contains('specialties', [sport]);
  }
  if (priceMin != null) {
    query = query.gte('hourly_rate', priceMin);
  }
  if (priceMax != null) {
    query = query.lte('hourly_rate', priceMax);
  }
  if (minRating != null) {
    query = query.gte('avg_rating', minRating);
  }

  // Sort
  switch (sortBy) {
    case 'price_asc':
      query = query.order('hourly_rate', { ascending: true });
      break;
    case 'price_desc':
      query = query.order('hourly_rate', { ascending: false });
      break;
    case 'rating':
      query = query.order('avg_rating', { ascending: false });
      break;
    default:
      query = query.order('total_sessions', { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw error;

  const coaches: CoachSearchResult[] = (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    bio: row.bio,
    specialties: row.specialties,
    certifications: row.certifications,
    hourlyRate: Number(row.hourly_rate),
    lat: row.lat,
    lng: row.lng,
    radius: row.radius,
    acceptsAnonymousReviews: row.accepts_anonymous_reviews,
    isVerified: row.is_verified,
    avgRating: Number(row.avg_rating),
    totalSessions: row.total_sessions,
    firstName: row.profiles.first_name ?? '',
    lastName: row.profiles.last_name ?? '',
    avatarUrl: row.profiles.avatar_url,
    city: row.profiles.city,
  }));

  return { coaches, page, limit };
}

/**
 * Get a single coach's public profile with ratings, endorsements, sessions.
 */
export async function getCoachProfile(
  supabase: SupabaseClient,
  coachId: string
) {
  const { data: coach, error } = await supabase
    .from('coach_profiles')
    .select(`
      id, user_id, bio, specialties, certifications,
      hourly_rate, lat, lng, radius,
      accepts_anonymous_reviews, is_verified,
      avg_rating, total_sessions,
      profiles!inner(first_name, last_name, avatar_url, city)
    `)
    .eq('id', coachId)
    .single();

  if (error) throw error;

  // Fetch ratings
  const { data: ratings } = await supabase
    .from('ratings')
    .select('id, score, comment, is_anonymous, coach_reply, created_at, athlete_id')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })
    .limit(20);

  // Fetch endorsements
  const { data: endorsements } = await supabase
    .from('endorsements')
    .select('id, endorser_id, specialty, created_at')
    .eq('endorsee_id', coachId);

  // Fetch active session templates
  const { data: sessionTemplates } = await supabase
    .from('session_templates')
    .select('*')
    .eq('coach_id', coachId)
    .eq('is_active', true)
    .order('price', { ascending: true });

  return {
    id: coach.id,
    userId: coach.user_id,
    bio: coach.bio,
    specialties: coach.specialties,
    certifications: coach.certifications,
    hourlyRate: Number(coach.hourly_rate),
    lat: coach.lat,
    lng: coach.lng,
    radius: coach.radius,
    acceptsAnonymousReviews: coach.accepts_anonymous_reviews,
    isVerified: coach.is_verified,
    avgRating: Number(coach.avg_rating),
    totalSessions: coach.total_sessions,
    firstName: (coach as any).profiles.first_name ?? '',
    lastName: (coach as any).profiles.last_name ?? '',
    avatarUrl: (coach as any).profiles.avatar_url,
    city: (coach as any).profiles.city,
    ratings: ratings ?? [],
    endorsements: endorsements ?? [],
    sessionTemplates: sessionTemplates ?? [],
  };
}

/**
 * Create a coach profile. Also upgrades user role to 'both'.
 */
export async function createCoachProfile(
  supabase: SupabaseClient,
  userId: string,
  input: CreateCoachProfileInput = {}
) {
  // Create coach profile
  const { data: coach, error: coachError } = await supabase
    .from('coach_profiles')
    .insert({
      user_id: userId,
      bio: input.bio ?? '',
      specialties: input.specialties ?? [],
      hourly_rate: input.hourlyRate ?? 0,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      radius: input.radius ?? 10,
      accepts_anonymous_reviews: input.acceptsAnonymousReviews ?? true,
    })
    .select()
    .single();

  if (coachError) throw coachError;

  // Upgrade user role to 'both'
  const { error: roleError } = await supabase
    .from('profiles')
    .update({ role: 'both' })
    .eq('id', userId);

  if (roleError) throw roleError;

  return coach;
}

/**
 * Update own coach profile.
 */
export async function updateCoachProfile(
  supabase: SupabaseClient,
  coachProfileId: string,
  input: UpdateCoachProfileInput
) {
  const updateData: Record<string, unknown> = {};

  if (input.bio !== undefined) updateData.bio = input.bio;
  if (input.specialties !== undefined) updateData.specialties = input.specialties;
  if (input.certifications !== undefined) updateData.certifications = input.certifications;
  if (input.hourlyRate !== undefined) updateData.hourly_rate = input.hourlyRate;
  if (input.lat !== undefined) updateData.lat = input.lat;
  if (input.lng !== undefined) updateData.lng = input.lng;
  if (input.radius !== undefined) updateData.radius = input.radius;
  if (input.acceptsAnonymousReviews !== undefined)
    updateData.accepts_anonymous_reviews = input.acceptsAnonymousReviews;
  if (input.displayName !== undefined) updateData.display_name = input.displayName;
  if (input.yearsExperience !== undefined) updateData.years_experience = input.yearsExperience;
  if (input.mainSports !== undefined) updateData.main_sports = input.mainSports;
  if (input.instagram !== undefined) updateData.instagram = input.instagram;
  if (input.website !== undefined) updateData.website = input.website;

  const { data, error } = await supabase
    .from('coach_profiles')
    .update(updateData)
    .eq('id', coachProfileId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all unique specialties across all coaches (for search filter dropdown).
 */
export async function getAllSpecialties(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from('coach_profiles')
    .select('specialties');

  if (error) throw error;

  const allSpecialties = new Set<string>();
  for (const row of data ?? []) {
    for (const s of row.specialties ?? []) {
      allSpecialties.add(s);
    }
  }

  return Array.from(allSpecialties).sort();
}

/**
 * Get coach profile by user_id (for "my profile" in coach view).
 */
export async function getMyCoachProfile(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from('coach_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data;
}

/**
 * Get active session templates for a coach.
 */
export async function getCoachSessionTemplates(
  supabase: SupabaseClient,
  coachId: string
) {
  const { data, error } = await supabase
    .from('session_templates')
    .select('*')
    .eq('coach_id', coachId)
    .eq('is_active', true)
    .order('price', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
