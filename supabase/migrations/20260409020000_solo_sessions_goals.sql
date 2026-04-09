-- Solo sessions (athlete self-logged)
create table if not exists public.solo_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  sport text not null,
  title text not null default '',
  duration_minutes integer not null,
  scheduled_at timestamptz not null,
  completed boolean not null default false,
  notes text default '',
  metrics jsonb default '{}',
  created_at timestamptz default now()
);
create index if not exists idx_solo_sessions_user on public.solo_sessions(user_id);
create index if not exists idx_solo_sessions_date on public.solo_sessions(scheduled_at);
alter table public.solo_sessions enable row level security;
drop policy if exists "User manages own solo sessions" on public.solo_sessions;
create policy "User manages own solo sessions" on public.solo_sessions for all using (auth.uid() = user_id);

-- Goals
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  type text not null check (type in ('frequency', 'performance', 'weight', 'custom')),
  target_value numeric not null,
  current_value numeric not null default 0,
  unit text not null default '',
  deadline timestamptz,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  created_at timestamptz default now(),
  completed_at timestamptz
);
create index if not exists idx_goals_user on public.goals(user_id);
alter table public.goals enable row level security;
drop policy if exists "User manages own goals" on public.goals;
create policy "User manages own goals" on public.goals for all using (auth.uid() = user_id);

-- Streaks tracking
create table if not exists public.user_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade unique,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_activity_date date,
  total_activities integer not null default 0,
  updated_at timestamptz default now()
);
alter table public.user_streaks enable row level security;
drop policy if exists "User manages own streaks" on public.user_streaks;
create policy "User manages own streaks" on public.user_streaks for all using (auth.uid() = user_id);

-- Personal records
create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  sport text not null,
  metric_key text not null,
  metric_label text not null,
  value numeric not null,
  unit text not null,
  achieved_at timestamptz not null,
  source text not null default 'pulse',
  created_at timestamptz default now(),
  unique(user_id, sport, metric_key)
);
alter table public.personal_records enable row level security;
drop policy if exists "User manages own records" on public.personal_records;
create policy "User manages own records" on public.personal_records for all using (auth.uid() = user_id);
