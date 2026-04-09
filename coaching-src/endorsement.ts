// ============================================================
// @oikos/coaching — Endorsement Engine
// Coach endorses another coach's specialty.
// Must practice that specialty themselves. Public on profile.
// ============================================================

import { type SupabaseClient } from '@supabase/supabase-js';
import type { Endorsement, EndorsementCreateInput, EndorsementGroup } from './types.js';

// ─── Create endorsement ─────────────────────────────────────────────

export async function createEndorsement(
  supabase: SupabaseClient,
  endorserCoachId: string,
  input: EndorsementCreateInput,
): Promise<Endorsement> {
  // Cannot endorse yourself
  if (endorserCoachId === input.endorseeId) {
    throw new Error('Cannot endorse yourself');
  }

  // Verify endorser practices this specialty
  const { data: endorserProfile } = await supabase
    .from('coach_profiles')
    .select('specialties')
    .eq('id', endorserCoachId)
    .single();

  if (!endorserProfile) {
    throw new Error('Endorser coach profile not found');
  }

  const specialties: string[] = endorserProfile.specialties ?? [];
  const normalizedSpecialty = input.specialty.toLowerCase().trim();
  const hasSpecialty = specialties.some(
    (s: string) => s.toLowerCase().trim() === normalizedSpecialty,
  );

  if (!hasSpecialty) {
    throw new Error(`You can only endorse specialties you practice. "${input.specialty}" is not in your profile.`);
  }

  // Verify endorsee exists and has this specialty
  const { data: endorseeProfile } = await supabase
    .from('coach_profiles')
    .select('specialties')
    .eq('id', input.endorseeId)
    .single();

  if (!endorseeProfile) {
    throw new Error('Endorsee coach profile not found');
  }

  const endorseeSpecialties: string[] = endorseeProfile.specialties ?? [];
  const endorseeHas = endorseeSpecialties.some(
    (s: string) => s.toLowerCase().trim() === normalizedSpecialty,
  );

  if (!endorseeHas) {
    throw new Error(`This coach does not list "${input.specialty}" as a specialty`);
  }

  const { data, error } = await supabase
    .from('endorsements')
    .insert({
      endorser_id: endorserCoachId,
      endorsee_id: input.endorseeId,
      specialty: input.specialty,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // unique violation
      throw new Error('You have already endorsed this coach for this specialty');
    }
    throw error;
  }

  return mapEndorsement(data);
}

// ─── Delete endorsement ─────────────────────────────────────────────

export async function deleteEndorsement(
  supabase: SupabaseClient,
  endorsementId: string,
  endorserCoachId: string,
): Promise<void> {
  const { error } = await supabase
    .from('endorsements')
    .delete()
    .eq('id', endorsementId)
    .eq('endorser_id', endorserCoachId);

  if (error) throw error;
}

// ─── Get endorsements for a coach (grouped by specialty) ────────────

export async function getCoachEndorsements(
  supabase: SupabaseClient,
  coachProfileId: string,
): Promise<EndorsementGroup[]> {
  const { data, error } = await supabase
    .from('endorsements')
    .select(`
      *,
      endorser:coach_profiles!endorser_id (
        id, user_id,
        profile:profiles!user_id ( name )
      )
    `)
    .eq('endorsee_id', coachProfileId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Group by specialty
  const groups: Record<string, EndorsementGroup> = {};

  for (const row of data ?? []) {
    const specialty = row.specialty as string;
    if (!groups[specialty]) {
      groups[specialty] = { specialty, count: 0, endorsers: [] };
    }
    groups[specialty].count++;
    groups[specialty].endorsers.push({
      id: row.id,
      endorserId: row.endorser_id,
      endorserName: (row.endorser as Record<string, unknown>)?.profile
        ? ((row.endorser as Record<string, unknown>).profile as Record<string, unknown>)?.name as string
        : 'Inconnu',
      createdAt: new Date(row.created_at as string).getTime(),
    });
  }

  // Sort by count descending
  return Object.values(groups).sort((a, b) => b.count - a.count);
}

// ─── Mapper ─────────────────────────────────────────────────────────

function mapEndorsement(row: Record<string, unknown>): Endorsement {
  return {
    id: row.id as string,
    fromCoachId: row.endorser_id as string,
    toCoachId: row.endorsee_id as string,
    skill: row.specialty as string,
    message: undefined,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}
