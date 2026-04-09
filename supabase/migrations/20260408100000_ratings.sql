-- 010: Ratings + Endorsements
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) unique,
  athlete_id uuid not null references public.profiles(id),
  coach_id uuid not null references public.coach_profiles(id),
  score integer not null check (score between 1 and 5),
  comment text default '',
  is_anonymous boolean default false,
  coach_reply text,
  created_at timestamptz default now()
);

create index idx_ratings_coach on public.ratings(coach_id);

create table if not exists public.endorsements (
  id uuid primary key default gen_random_uuid(),
  endorser_id uuid not null references public.coach_profiles(id) on delete cascade,
  endorsee_id uuid not null references public.coach_profiles(id) on delete cascade,
  specialty text not null,
  created_at timestamptz default now(),
  constraint no_self_endorsement check (endorser_id != endorsee_id),
  constraint unique_endorsement unique (endorser_id, endorsee_id, specialty)
);

create index idx_endorsements_endorsee on public.endorsements(endorsee_id);
