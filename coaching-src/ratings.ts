// ============================================================
// @oikos/coaching — Ratings Engine
// Athlete rates coach after completed booking. 1-5 stars.
// Anonymous if athlete chooses AND coach accepts anonymous.
// Coach can reply. Auto-recalculates avg_rating.
// ============================================================

import { type SupabaseClient } from '@supabase/supabase-js';
import type {
  Rating,
  RatingCreateInput,
  RatingReplyInput,
  RatingWithAthlete,
  RatingStats,
} from './types';

// ─── Create rating ──────────────────────────────────────────────────

export async function createRating(
  supabase: SupabaseClient,
  athleteId: string,
  input: RatingCreateInput,
): Promise<Rating> {
  // Validate score
  if (input.score < 1 || input.score > 5 || !Number.isInteger(input.score)) {
    throw new Error('Score must be an integer between 1 and 5');
  }

  // Verify booking exists, belongs to this athlete, and is completed
  const { data: booking, error: bookingErr } = await supabase
    .from('bookings')
    .select('id, athlete_id, coach_id, status')
    .eq('id', input.bookingId)
    .single();

  if (bookingErr || !booking) throw new Error('Booking not found');
  if (booking.athlete_id !== athleteId) throw new Error('This booking does not belong to you');
  if (booking.status !== 'completed') throw new Error('Can only rate completed sessions');

  // Check not already rated
  const { data: existingRating } = await supabase
    .from('ratings')
    .select('id')
    .eq('booking_id', input.bookingId)
    .maybeSingle();

  if (existingRating) throw new Error('This booking has already been rated');

  // If anonymous, check coach accepts anonymous reviews
  if (input.isAnonymous) {
    const { data: coachProfile } = await supabase
      .from('coach_profiles')
      .select('accepts_anonymous_reviews')
      .eq('id', booking.coach_id)
      .single();

    if (coachProfile && !coachProfile.accepts_anonymous_reviews) {
      throw new Error('This coach does not accept anonymous reviews');
    }
  }

  const { data, error } = await supabase
    .from('ratings')
    .insert({
      booking_id: input.bookingId,
      athlete_id: athleteId,
      coach_id: booking.coach_id,
      score: input.score,
      comment: input.comment,
      is_anonymous: input.isAnonymous,
    })
    .select()
    .single();

  if (error) throw error;

  // Recalculate avg_rating for coach
  await recalcAvgRating(supabase, booking.coach_id);

  return mapRating(data);
}

// ─── Coach reply ────────────────────────────────────────────────────

export async function replyToRating(
  supabase: SupabaseClient,
  ratingId: string,
  coachProfileId: string,
  input: RatingReplyInput,
): Promise<Rating> {
  // Verify rating belongs to this coach
  const { data: rating } = await supabase
    .from('ratings')
    .select('id, coach_id')
    .eq('id', ratingId)
    .single();

  if (!rating) throw new Error('Rating not found');
  if (rating.coach_id !== coachProfileId) {
    throw new Error('This rating is not for your profile');
  }

  const { data, error } = await supabase
    .from('ratings')
    .update({ coach_reply: input.coachReply })
    .eq('id', ratingId)
    .select()
    .single();

  if (error) throw error;
  return mapRating(data);
}

// ─── Get ratings for a coach (with athlete info) ────────────────────

export async function getCoachRatings(
  supabase: SupabaseClient,
  coachProfileId: string,
  options?: { limit?: number; offset?: number },
): Promise<{ ratings: RatingWithAthlete[]; stats: RatingStats }> {
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  // Fetch ratings with booking + athlete info
  const { data, error } = await supabase
    .from('ratings')
    .select(`
      *,
      athlete:profiles!athlete_id ( name ),
      booking:bookings!booking_id (
        scheduled_at,
        session:session_templates!session_template_id ( title )
      )
    `)
    .eq('coach_id', coachProfileId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const ratings: RatingWithAthlete[] = (data ?? []).map((row: Record<string, unknown>) => ({
    ...mapRating(row),
    athleteName: (row as Record<string, unknown>).is_anonymous
      ? null
      : ((row.athlete as Record<string, unknown>)?.name as string ?? null),
    bookingDate: (row.booking as Record<string, unknown>)?.scheduled_at as string ?? '',
    sessionTitle: ((row.booking as Record<string, unknown>)?.session as Record<string, unknown>)?.title as string ?? '',
  }));

  // Get stats
  const stats = await getCoachRatingStats(supabase, coachProfileId);

  return { ratings, stats };
}

// ─── Rating stats ───────────────────────────────────────────────────

export async function getCoachRatingStats(
  supabase: SupabaseClient,
  coachProfileId: string,
): Promise<RatingStats> {
  const { data, error } = await supabase
    .from('ratings')
    .select('score')
    .eq('coach_id', coachProfileId);

  if (error) throw error;

  const scores = (data ?? []).map((r: Record<string, unknown>) => r.score as number);
  const total = scores.length;
  const avg = total > 0 ? scores.reduce((a: number, b: number) => a + b, 0) / total : 0;

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const s of scores) {
    distribution[s] = (distribution[s] ?? 0) + 1;
  }

  return {
    avgRating: Math.round(avg * 100) / 100,
    totalRatings: total,
    distribution: distribution as Record<1 | 2 | 3 | 4 | 5, number>,
  };
}

// ─── Recalculate avg_rating on coach_profiles ───────────────────────

async function recalcAvgRating(
  supabase: SupabaseClient,
  coachProfileId: string,
): Promise<void> {
  const stats = await getCoachRatingStats(supabase, coachProfileId);

  await supabase
    .from('coach_profiles')
    .update({ avg_rating: stats.avgRating })
    .eq('id', coachProfileId);
}

// ─── Mapper ─────────────────────────────────────────────────────────

function mapRating(row: Record<string, unknown>): Rating {
  return {
    id: row.id as string,
    bookingId: row.booking_id as string,
    fromUserId: row.athlete_id as string,
    toUserId: row.coach_id as string,
    score: row.score as number,
    comment: (row.comment as string) ?? undefined,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}
