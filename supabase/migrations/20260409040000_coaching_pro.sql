-- Phase 4: Coaching Pro — training programs, video feedback, device push queue

-- Training programs (multi-week plans)
create table if not exists public.training_programs (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  title text not null,
  description text default '',
  sport text not null,
  level text not null default 'all',
  duration_weeks integer not null,
  is_published boolean default false,
  price numeric default 0,
  cover_image_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_programs_coach on public.training_programs(coach_id);
alter table public.training_programs enable row level security;
create policy "Anyone reads published programs" on public.training_programs for select using (is_published = true or auth.uid() = (select user_id from coach_profiles where id = coach_id));
create policy "Coach manages own programs" on public.training_programs for all using (auth.uid() = (select user_id from coach_profiles where id = coach_id));

-- Program workouts (individual sessions within a program)
create table if not exists public.program_workouts (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  week_number integer not null,
  day_number integer not null,
  title text not null,
  description text default '',
  workout_data jsonb not null default '{}',
  duration_minutes integer not null default 60,
  created_at timestamptz default now()
);
create index idx_workouts_program on public.program_workouts(program_id);
alter table public.program_workouts enable row level security;
create policy "Read via program" on public.program_workouts for select using (true);
create policy "Coach manages via program" on public.program_workouts for all using (
  exists (select 1 from training_programs tp join coach_profiles cp on tp.coach_id = cp.id where tp.id = program_id and cp.user_id = auth.uid())
);

-- Program enrollments (athlete assigned to a program)
create table if not exists public.program_enrollments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  athlete_id uuid not null references auth.users on delete cascade,
  assigned_by uuid references auth.users,
  current_week integer not null default 1,
  current_day integer not null default 1,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  started_at timestamptz default now(),
  unique(program_id, athlete_id)
);
alter table public.program_enrollments enable row level security;
create policy "Athlete sees own enrollments" on public.program_enrollments for select using (auth.uid() = athlete_id);
create policy "Coach manages enrollments" on public.program_enrollments for all using (
  exists (select 1 from training_programs tp join coach_profiles cp on tp.coach_id = cp.id where tp.id = program_id and cp.user_id = auth.uid())
);

-- Video feedback
create table if not exists public.video_feedbacks (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id),
  athlete_id uuid not null references auth.users on delete cascade,
  coach_id uuid references public.coach_profiles(id),
  video_url text not null,
  thumbnail_url text,
  duration_seconds integer,
  coach_comment text,
  coach_timestamps jsonb default '[]',
  status text not null default 'pending' check (status in ('pending', 'reviewed')),
  created_at timestamptz default now()
);
alter table public.video_feedbacks enable row level security;
create policy "Athlete manages own videos" on public.video_feedbacks for all using (auth.uid() = athlete_id);
create policy "Coach reviews assigned videos" on public.video_feedbacks for all using (
  auth.uid() = (select user_id from coach_profiles where id = coach_id)
);

-- Device push queue
create table if not exists public.device_push_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  provider text not null,
  action text not null check (action in ('push_workout', 'push_plan', 'notification')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz default now(),
  processed_at timestamptz
);
create index idx_push_queue_pending on public.device_push_queue(status) where status = 'pending';
alter table public.device_push_queue enable row level security;
create policy "User sees own push queue" on public.device_push_queue for select using (auth.uid() = user_id);
