-- 009: Events (platform + partner)
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  type text not null check (type in ('platform', 'partner')),
  partner_id uuid references public.profiles(id),
  date timestamptz not null,
  lat double precision,
  lng double precision,
  address text,
  slots_coach integer not null default 1,
  slots_athlete integer not null default 10,
  price numeric(10,2) default 0,
  sport text,
  level text default 'all',
  status text not null default 'draft' check (status in ('draft', 'open', 'full', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  role text not null check (role in ('coach', 'athlete')),
  status text not null default 'applied' check (status in ('applied', 'confirmed', 'rejected', 'cancelled')),
  payment_id uuid references public.payments(id),
  created_at timestamptz default now(),
  constraint unique_event_participant unique (event_id, user_id)
);

create index idx_events_date on public.events(date);
create index idx_events_status on public.events(status);
create index idx_event_participants_event on public.event_participants(event_id);

create trigger events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();
