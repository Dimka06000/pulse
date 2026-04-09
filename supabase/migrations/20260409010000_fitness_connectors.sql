-- Fitness platform connections (Strava, Garmin, Fitbit, etc.)
create table if not exists public.fitness_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  provider text not null check (provider in ('strava', 'garmin', 'fitbit', 'apple_health')),
  provider_user_id text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] default '{}',
  profile_data jsonb default '{}',
  is_active boolean not null default true,
  last_sync_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, provider)
);

create index idx_fitness_connections_user on public.fitness_connections(user_id);

alter table public.fitness_connections enable row level security;
create policy "User manages own connections" on public.fitness_connections
  for all using (auth.uid() = user_id);

-- Synced activities from external platforms
create table if not exists public.synced_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  provider text not null,
  provider_activity_id text not null,
  sport text not null,
  title text not null,
  duration_seconds integer not null,
  distance_meters numeric,
  calories integer,
  start_time timestamptz not null,
  end_time timestamptz,
  avg_heart_rate integer,
  max_heart_rate integer,
  elevation_gain numeric,
  average_speed numeric,
  max_speed numeric,
  raw_data jsonb default '{}',
  created_at timestamptz default now(),
  unique(provider, provider_activity_id)
);

create index idx_synced_activities_user on public.synced_activities(user_id);
create index idx_synced_activities_start on public.synced_activities(start_time);

alter table public.synced_activities enable row level security;
create policy "User sees own synced activities" on public.synced_activities
  for all using (auth.uid() = user_id);
