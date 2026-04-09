-- 016: RLS policies for social layer tables
-- (ratings + endorsements already have basic RLS from 014)

-- ─── Coach Hierarchy ────────────────────────────────────────────────
alter table public.coach_hierarchy enable row level security;

-- Coaches can see hierarchies they're part of
create policy "Coach sees own hierarchy" on public.coach_hierarchy for select
  using (
    auth.uid() = (select user_id from public.coach_profiles where id = senior_id)
    or auth.uid() = (select user_id from public.coach_profiles where id = junior_id)
  );

-- Senior can create (invite)
create policy "Senior creates hierarchy invite" on public.coach_hierarchy for insert
  with check (
    auth.uid() = (select user_id from public.coach_profiles where id = senior_id)
  );

-- Both sides can update (accept/end/config)
create policy "Participant updates hierarchy" on public.coach_hierarchy for update
  using (
    auth.uid() = (select user_id from public.coach_profiles where id = senior_id)
    or auth.uid() = (select user_id from public.coach_profiles where id = junior_id)
  );

-- ─── Collaborations ────────────────────────────────────────────────
alter table public.collaborations enable row level security;
alter table public.collaboration_coaches enable row level security;

-- Anyone can read collaborations (public info for search)
create policy "Anyone reads collabs" on public.collaborations for select using (true);

-- Lead can create
create policy "Any coach creates collab" on public.collaborations for insert
  with check (true);  -- Enforced at API level (must be authenticated coach)

-- Lead can update
create policy "Lead updates collab" on public.collaborations for update
  using (
    id in (
      select collaboration_id from public.collaboration_coaches
      where coach_id = (select id from public.coach_profiles where user_id = auth.uid())
      and role = 'lead'
    )
  );

-- Anyone reads collab coaches
create policy "Anyone reads collab coaches" on public.collaboration_coaches for select using (true);

-- Lead can add coaches
create policy "Lead adds collab coaches" on public.collaboration_coaches for insert
  with check (
    collaboration_id in (
      select collaboration_id from public.collaboration_coaches
      where coach_id = (select id from public.coach_profiles where user_id = auth.uid())
      and role = 'lead'
    )
    -- Also allow first insert (lead adding themselves)
    or coach_id = (select id from public.coach_profiles where user_id = auth.uid())
  );

-- Lead can update revenue shares
create policy "Lead updates collab coaches" on public.collaboration_coaches for update
  using (
    collaboration_id in (
      select collaboration_id from public.collaboration_coaches
      where coach_id = (select id from public.coach_profiles where user_id = auth.uid())
      and role = 'lead'
    )
  );

-- ─── Endorsements (extend 014) ─────────────────────────────────────
-- 014 already has basic RLS. Add insert/delete policies.

-- Anyone reads endorsements (public)
create policy "Anyone reads endorsements" on public.endorsements for select using (true);

-- Coach can endorse
create policy "Coach creates endorsement" on public.endorsements for insert
  with check (
    auth.uid() = (select user_id from public.coach_profiles where id = endorser_id)
  );

-- Endorser can delete own endorsement
create policy "Endorser deletes endorsement" on public.endorsements for delete
  using (
    auth.uid() = (select user_id from public.coach_profiles where id = endorser_id)
  );

-- ─── Ratings (extend 014) ──────────────────────────────────────────
-- 014 already has select + insert. Add update for coach reply.

create policy "Coach replies to rating" on public.ratings for update
  using (
    auth.uid() = (select user_id from public.coach_profiles where id = coach_id)
  );
