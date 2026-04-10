// ============================================================
// @oikos/coaching — Coach Hierarchy Engine
// Senior/junior system: team, cabinet, mentorship, mixed.
// Senior invites junior, junior accepts. Commission configurable.
// ============================================================

import { type SupabaseClient } from '@supabase/supabase-js';
import type {
  CoachHierarchy,
  HierarchyInviteInput,
  HierarchyUpdateInput,
  MyHierarchy,
} from './types';

// ─── Invite junior ──────────────────────────────────────────────────

export async function inviteJunior(
  supabase: SupabaseClient,
  seniorCoachId: string,
  input: HierarchyInviteInput,
): Promise<CoachHierarchy> {
  // Validate commission range
  if (input.commissionSplit < 0 || input.commissionSplit > 100) {
    throw new Error('Commission split must be between 0 and 100');
  }

  // Check not already in relationship
  const { data: existing } = await supabase
    .from('coach_hierarchy')
    .select('id')
    .eq('senior_id', seniorCoachId)
    .eq('junior_id', input.juniorCoachId)
    .neq('status', 'ended')
    .maybeSingle();

  if (existing) {
    throw new Error('Active hierarchy relationship already exists');
  }

  // Check junior doesn't already have a senior (only 1 senior allowed)
  const { data: existingSenior } = await supabase
    .from('coach_hierarchy')
    .select('id')
    .eq('junior_id', input.juniorCoachId)
    .neq('status', 'ended')
    .maybeSingle();

  if (existingSenior) {
    throw new Error('This coach already has an active senior');
  }

  const { data, error } = await supabase
    .from('coach_hierarchy')
    .insert({
      senior_id: seniorCoachId,
      junior_id: input.juniorCoachId,
      mode: input.mode,
      commission_split: input.commissionSplit,
      senior_approval_required: input.seniorApprovalRequired,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return mapHierarchy(data);
}

// ─── Update hierarchy (accept, end, update config) ──────────────────

export async function updateHierarchy(
  supabase: SupabaseClient,
  hierarchyId: string,
  coachProfileId: string,
  input: HierarchyUpdateInput,
): Promise<CoachHierarchy> {
  // Fetch current to check permissions
  const { data: current, error: fetchErr } = await supabase
    .from('coach_hierarchy')
    .select('*')
    .eq('id', hierarchyId)
    .single();

  if (fetchErr || !current) throw new Error('Hierarchy not found');

  // Only junior can accept (pending → active)
  if (input.status === 'active' && current.status === 'pending') {
    if (coachProfileId !== current.junior_id) {
      throw new Error('Only the junior coach can accept an invitation');
    }
  }

  // Either side can end
  if (input.status === 'ended') {
    if (coachProfileId !== current.senior_id && coachProfileId !== current.junior_id) {
      throw new Error('Only participants can end the hierarchy');
    }
  }

  // Only senior can update config
  if (input.commissionSplit !== undefined || input.seniorApprovalRequired !== undefined || input.mode !== undefined) {
    if (coachProfileId !== current.senior_id) {
      throw new Error('Only the senior can update hierarchy configuration');
    }
  }

  const updatePayload: Record<string, unknown> = {};
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.commissionSplit !== undefined) {
    if (input.commissionSplit < 0 || input.commissionSplit > 100) {
      throw new Error('Commission split must be between 0 and 100');
    }
    updatePayload.commission_split = input.commissionSplit;
  }
  if (input.seniorApprovalRequired !== undefined) updatePayload.senior_approval_required = input.seniorApprovalRequired;
  if (input.mode !== undefined) updatePayload.mode = input.mode;

  const { data, error } = await supabase
    .from('coach_hierarchy')
    .update(updatePayload)
    .eq('id', hierarchyId)
    .select()
    .single();

  if (error) throw error;
  return mapHierarchy(data);
}

// ─── Get my hierarchy (both sides) ──────────────────────────────────

export async function getMyHierarchy(
  supabase: SupabaseClient,
  coachProfileId: string,
): Promise<MyHierarchy> {
  // As senior: my juniors
  const { data: juniors, error: e1 } = await supabase
    .from('coach_hierarchy')
    .select(`
      *,
      junior:coach_profiles!junior_id (
        id, user_id,
        profile:profiles!user_id ( name )
      )
    `)
    .eq('senior_id', coachProfileId)
    .neq('status', 'ended')
    .order('created_at', { ascending: false });

  if (e1) throw e1;

  // As junior: my senior
  const { data: seniors, error: e2 } = await supabase
    .from('coach_hierarchy')
    .select(`
      *,
      senior:coach_profiles!senior_id (
        id, user_id,
        profile:profiles!user_id ( name )
      )
    `)
    .eq('junior_id', coachProfileId)
    .neq('status', 'ended')
    .order('created_at', { ascending: false });

  if (e2) throw e2;

  return {
    asSenior: (juniors ?? []).map((row: Record<string, unknown>) => ({
      ...mapHierarchy(row),
      junior: {
        id: (row.junior as Record<string, unknown>).id as string,
        userId: (row.junior as Record<string, unknown>).user_id as string,
        userName: ((row.junior as Record<string, unknown>).profile as Record<string, unknown>)?.name as string ?? 'Inconnu',
      },
    })),
    asJunior: (seniors ?? []).length > 0
      ? (seniors ?? []).map((row: Record<string, unknown>) => ({
          ...mapHierarchy(row),
          senior: {
            id: (row.senior as Record<string, unknown>).id as string,
            userId: (row.senior as Record<string, unknown>).user_id as string,
            userName: ((row.senior as Record<string, unknown>).profile as Record<string, unknown>)?.name as string ?? 'Inconnu',
          },
        }))
      : null,
  };
}

// ─── Mapper ─────────────────────────────────────────────────────────

function mapHierarchy(row: Record<string, unknown>): CoachHierarchy {
  return {
    id: row.id as string,
    parentCoachId: row.senior_id as string,
    childCoachId: row.junior_id as string,
    status: row.status as CoachHierarchy['status'],
    commissionRate: row.commission_split as number,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.created_at as string).getTime(),
  };
}
