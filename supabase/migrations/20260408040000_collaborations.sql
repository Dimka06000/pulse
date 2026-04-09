-- 004: Collaborations between coaches
create table if not exists public.collaborations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  type text not null check (type in ('joint_session', 'program', 'guest')),
  duration_weeks integer,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.collaboration_coaches (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references public.collaborations(id) on delete cascade,
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  role text not null default 'participant' check (role in ('lead', 'participant')),
  revenue_share numeric(5,2) not null default 0,
  constraint unique_collab_coach unique (collaboration_id, coach_id)
);

create trigger collaborations_updated_at
  before update on public.collaborations
  for each row execute function public.set_updated_at();
