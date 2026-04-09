-- 007: Bookings (adapted from Elaubody)
create extension if not exists btree_gist;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  session_template_id uuid not null references public.session_templates(id),
  athlete_id uuid not null references public.profiles(id),
  coach_id uuid not null references public.coach_profiles(id),
  scheduled_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  stripe_payment_id text,
  platform_fee numeric(10,2) default 0,
  coach_payout numeric(10,2) default 0,
  cancelled_by text check (cancelled_by in ('athlete', 'coach', 'platform')),
  credit_id uuid,
  location_type text default 'on_site' check (location_type in ('home', 'on_site', 'online')),
  address text,
  travel_surcharge_cents integer default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint no_overlapping_bookings exclude using gist (
    coach_id with =,
    tstzrange(scheduled_at, end_at) with &&
  ) where (status = 'confirmed')
);

create index idx_bookings_athlete on public.bookings(athlete_id);
create index idx_bookings_coach on public.bookings(coach_id);
create index idx_bookings_date on public.bookings(scheduled_at);
create index idx_bookings_status on public.bookings(status);

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();
