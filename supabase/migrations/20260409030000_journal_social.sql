-- Daily journal entries (behavior logging)
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  sleep_hours numeric,
  sleep_quality integer check (sleep_quality between 1 and 5),
  energy_level integer check (energy_level between 1 and 5),
  stress_level integer check (stress_level between 1 and 5),
  mood integer check (mood between 1 and 5),
  alcohol boolean default false,
  caffeine_cups integer default 0,
  supplements text[] default '{}',
  notes text default '',
  created_at timestamptz default now(),
  unique(user_id, date)
);
create index idx_journal_user_date on public.journal_entries(user_id, date);
alter table public.journal_entries enable row level security;
create policy "User manages own journal" on public.journal_entries for all using (auth.uid() = user_id);

-- Activity feed posts (auto-generated from activities)
create table if not exists public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  activity_type text not null check (activity_type in ('solo_session', 'booking', 'synced', 'goal_completed', 'record', 'streak')),
  activity_id text,
  sport text,
  title text not null,
  description text default '',
  metrics jsonb default '{}',
  created_at timestamptz default now()
);
create index idx_feed_posts_created on public.feed_posts(created_at desc);
create index idx_feed_posts_user on public.feed_posts(user_id);
alter table public.feed_posts enable row level security;
create policy "Anyone reads feed" on public.feed_posts for select using (true);
create policy "User creates own feed" on public.feed_posts for insert with check (auth.uid() = user_id);

-- Kudos (reactions to feed posts)
create table if not exists public.kudos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  emoji text not null default '👏',
  created_at timestamptz default now(),
  unique(post_id, user_id)
);
alter table public.kudos enable row level security;
create policy "Anyone reads kudos" on public.kudos for select using (true);
create policy "User manages own kudos" on public.kudos for insert with check (auth.uid() = user_id);
create policy "User deletes own kudos" on public.kudos for delete using (auth.uid() = user_id);

-- Challenges
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  type text not null check (type in ('distance', 'duration', 'frequency', 'custom')),
  sport text,
  target_value numeric not null,
  unit text not null,
  start_date date not null,
  end_date date not null,
  is_global boolean default false,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);
alter table public.challenges enable row level security;
create policy "Anyone reads challenges" on public.challenges for select using (true);

-- Challenge participants
create table if not exists public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  current_value numeric not null default 0,
  joined_at timestamptz default now(),
  unique(challenge_id, user_id)
);
alter table public.challenge_participants enable row level security;
create policy "Anyone reads participants" on public.challenge_participants for select using (true);
create policy "User manages own participation" on public.challenge_participants for all using (auth.uid() = user_id);
