// ============================================================
// @oikos/coaching — Collaboration Engine
// Coaches team up: joint_session, program, guest.
// Lead coach creates, invites others. Revenue split per coach.
// ============================================================

import { type SupabaseClient } from '@supabase/supabase-js';
import type {
  Collaboration,
  CollaborationCoach,
  CollabCreateInput,
  CollabUpdateInput,
  CollabInviteInput,
  MyCollabs,
} from './types';

// ─── Create collaboration ───────────────────────────────────────────

export async function createCollab(
  supabase: SupabaseClient,
  leadCoachId: string,
  input: CollabCreateInput,
): Promise<Collaboration & { coaches: CollaborationCoach[] }> {
  // Create the collaboration
  const { data: collab, error: collabErr } = await supabase
    .from('collaborations')
    .insert({
      name: input.name,
      description: input.description ?? '',
      type: input.type,
      duration_weeks: input.durationWeeks ?? null,
      status: 'draft',
    })
    .select()
    .single();

  if (collabErr) throw collabErr;

  // Add lead coach with 100% share initially
  const { data: coach, error: coachErr } = await supabase
    .from('collaboration_coaches')
    .insert({
      collaboration_id: collab.id,
      coach_id: leadCoachId,
      role: 'lead',
      revenue_share: 100,
    })
    .select()
    .single();

  if (coachErr) throw coachErr;

  return {
    ...mapCollab(collab),
    coaches: [mapCollabCoach(coach)],
  };
}

// ─── Update collaboration ───────────────────────────────────────────

export async function updateCollab(
  supabase: SupabaseClient,
  collabId: string,
  leadCoachId: string,
  input: CollabUpdateInput,
): Promise<Collaboration> {
  // Verify caller is lead
  const { data: membership } = await supabase
    .from('collaboration_coaches')
    .select('role')
    .eq('collaboration_id', collabId)
    .eq('coach_id', leadCoachId)
    .single();

  if (!membership || membership.role !== 'lead') {
    throw new Error('Only the lead coach can update a collaboration');
  }

  const updatePayload: Record<string, unknown> = {};
  if (input.name !== undefined) updatePayload.name = input.name;
  if (input.description !== undefined) updatePayload.description = input.description;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.durationWeeks !== undefined) updatePayload.duration_weeks = input.durationWeeks;

  const { data, error } = await supabase
    .from('collaborations')
    .update(updatePayload)
    .eq('id', collabId)
    .select()
    .single();

  if (error) throw error;
  return mapCollab(data);
}

// ─── Invite coach to collaboration ──────────────────────────────────

export async function inviteCoachToCollab(
  supabase: SupabaseClient,
  collabId: string,
  leadCoachId: string,
  input: CollabInviteInput,
): Promise<CollaborationCoach> {
  // Verify caller is lead
  const { data: membership } = await supabase
    .from('collaboration_coaches')
    .select('role')
    .eq('collaboration_id', collabId)
    .eq('coach_id', leadCoachId)
    .single();

  if (!membership || membership.role !== 'lead') {
    throw new Error('Only the lead coach can invite others');
  }

  // Check not already in collab
  const { data: existing } = await supabase
    .from('collaboration_coaches')
    .select('id')
    .eq('collaboration_id', collabId)
    .eq('coach_id', input.coachId)
    .maybeSingle();

  if (existing) {
    throw new Error('Coach is already in this collaboration');
  }

  // Validate revenue shares: fetch current total, check new total <= 100
  const { data: currentCoaches } = await supabase
    .from('collaboration_coaches')
    .select('revenue_share, coach_id')
    .eq('collaboration_id', collabId);

  const currentTotal = (currentCoaches ?? []).reduce(
    (sum: number, c: Record<string, unknown>) => sum + (c.revenue_share as number),
    0,
  );

  if (currentTotal + input.revenueShare > 100) {
    throw new Error(`Total revenue share would exceed 100% (current: ${currentTotal}%, adding: ${input.revenueShare}%)`);
  }

  const { data, error } = await supabase
    .from('collaboration_coaches')
    .insert({
      collaboration_id: collabId,
      coach_id: input.coachId,
      role: input.role,
      revenue_share: input.revenueShare,
    })
    .select()
    .single();

  if (error) throw error;

  // Auto-reduce lead's share so total stays at 100
  const nonLeadTotal = (currentCoaches ?? [])
    .filter((c: Record<string, unknown>) => (c.coach_id as string) !== leadCoachId)
    .reduce((sum: number, c: Record<string, unknown>) => sum + (c.revenue_share as number), 0);

  const adjustedLeadShare = 100 - nonLeadTotal - input.revenueShare;
  if (adjustedLeadShare >= 0) {
    await supabase
      .from('collaboration_coaches')
      .update({ revenue_share: adjustedLeadShare })
      .eq('collaboration_id', collabId)
      .eq('coach_id', leadCoachId);
  }

  return mapCollabCoach(data);
}

// ─── Get my collabs ─────────────────────────────────────────────────

export async function getMyCollabs(
  supabase: SupabaseClient,
  coachProfileId: string,
): Promise<MyCollabs> {
  // Get all collab IDs I'm in
  const { data: myMemberships, error: memErr } = await supabase
    .from('collaboration_coaches')
    .select('collaboration_id, role')
    .eq('coach_id', coachProfileId);

  if (memErr) throw memErr;
  if (!myMemberships || myMemberships.length === 0) {
    return { asLead: [], asParticipant: [] };
  }

  const collabIds = myMemberships.map((m: Record<string, unknown>) => m.collaboration_id);

  // Fetch all collabs with their coaches
  const { data: collabs, error: collabErr } = await supabase
    .from('collaborations')
    .select(`
      *,
      coaches:collaboration_coaches (
        *,
        coach:coach_profiles!coach_id (
          id, user_id,
          profile:profiles!user_id ( name )
        )
      )
    `)
    .in('id', collabIds)
    .order('created_at', { ascending: false });

  if (collabErr) throw collabErr;

  const leadIds = new Set(
    myMemberships
      .filter((m: Record<string, unknown>) => m.role === 'lead')
      .map((m: Record<string, unknown>) => m.collaboration_id),
  );

  const mapped = (collabs ?? []).map((row: Record<string, unknown>) => ({
    ...mapCollab(row),
    coaches: ((row.coaches as Record<string, unknown>[]) ?? []).map(
      (c: Record<string, unknown>) => ({
        ...mapCollabCoach(c),
        coachName: ((c.coach as Record<string, unknown>)?.profile as Record<string, unknown>)?.name as string ?? 'Inconnu',
      }),
    ),
  }));

  return {
    asLead: mapped.filter((c) => leadIds.has(c.id)),
    asParticipant: mapped.filter((c) => !leadIds.has(c.id)),
  };
}

// ─── Mappers ────────────────────────────────────────────────────────

function mapCollab(row: Record<string, unknown>): Collaboration {
  return {
    id: row.id as string,
    clientId: '',  // Not used in coach-coach collabs
    type: row.type as Collaboration['type'],
    status: row.status as Collaboration['status'],
    title: row.name as string,
    description: (row.description as string) ?? '',
    goals: [],
    startDate: new Date(row.created_at as string).getTime(),
    endDate: undefined,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

function mapCollabCoach(row: Record<string, unknown>): CollaborationCoach {
  return {
    id: row.id as string,
    collaborationId: row.collaboration_id as string,
    coachId: row.coach_id as string,
    role: row.role as CollaborationCoach['role'],
    joinedAt: Date.now(),
  };
}
