-- 006: Availability (from Elaubody, adapted for multi-coach)
create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  is_active boolean default true,
  created_at timestamptz default now(),
  constraint valid_time_range check (start_time < end_time)
);

create index idx_availability_coach on public.availability_slots(coach_id);

create table if not exists public.availability_overrides (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  override_date date not null,
  start_time time,
  end_time time,
  type text not null check (type in ('add', 'remove')),
  reason text,
  created_at timestamptz default now()
);

create index idx_overrides_coach_date on public.availability_overrides(coach_id, override_date);
