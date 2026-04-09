-- 002: Coach profiles (NEW for multi-coach)
create extension if not exists postgis;

create table if not exists public.coach_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  bio text default '',
  specialties text[] default '{}',
  certifications jsonb default '[]',
  hourly_rate numeric(10,2) default 0,
  lat double precision,
  lng double precision,
  radius integer default 10,
  stripe_account_id text,
  accepts_anonymous_reviews boolean default true,
  is_verified boolean default false,
  avg_rating numeric(3,2) default 0,
  total_sessions integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_coach_profiles_user_id on public.coach_profiles(user_id);
create index idx_coach_profiles_specialties on public.coach_profiles using gin(specialties);
create index idx_coach_profiles_location on public.coach_profiles using gist(
  ST_SetSRID(ST_MakePoint(lng, lat), 4326)
) where lat is not null and lng is not null;

create trigger coach_profiles_updated_at
  before update on public.coach_profiles
  for each row execute function public.set_updated_at();
