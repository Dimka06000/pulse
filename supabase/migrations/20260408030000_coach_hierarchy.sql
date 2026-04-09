-- 003: Coach hierarchy (senior/junior)
create table if not exists public.coach_hierarchy (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.coach_profiles(id) on delete cascade,
  junior_id uuid not null references public.coach_profiles(id) on delete cascade,
  mode text not null check (mode in ('team', 'cabinet', 'mentorship', 'mixed')),
  commission_split numeric(5,2) not null default 0,
  senior_approval_required boolean default false,
  status text not null default 'pending' check (status in ('pending', 'active', 'ended')),
  created_at timestamptz default now(),
  constraint no_self_hierarchy check (senior_id != junior_id),
  constraint unique_hierarchy unique (senior_id, junior_id)
);
