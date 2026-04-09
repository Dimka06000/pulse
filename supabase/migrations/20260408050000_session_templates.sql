-- 005: Session templates (coach offerings)
create table if not exists public.session_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  collab_id uuid references public.collaborations(id) on delete set null,
  title text not null,
  sport text not null,
  description text default '',
  level text not null default 'all' check (level in ('beginner', 'intermediate', 'advanced', 'all')),
  type text not null default 'individual' check (type in ('individual', 'group', 'online')),
  max_participants integer not null default 1,
  duration integer not null default 60,
  price numeric(10,2) not null,
  lat double precision,
  lng double precision,
  address text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_session_templates_coach on public.session_templates(coach_id);
create index idx_session_templates_sport on public.session_templates(sport);

create trigger session_templates_updated_at
  before update on public.session_templates
  for each row execute function public.set_updated_at();
