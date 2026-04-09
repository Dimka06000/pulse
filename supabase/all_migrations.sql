-- 001: User profiles (adapted from Elaubody)
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique,
  first_name text,
  last_name text,
  phone text,
  city text,
  postal_code text,
  avatar_url text,
  role text not null default 'athlete' check (role in ('athlete', 'coach', 'both')),
  oikos_did text,
  stripe_customer_id text,
  lat double precision,
  lng double precision,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, first_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
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
-- 003: Coach hierarchy (senior/junior)
create table if not exists public.coach_hierarchy (
  id uuid primary key default gen_random_uuid(),
  senior_id uuid not null references public.coach_profiles(id) on delete cascade,
  junior_id uuid not null references public.coach_profiles(id) on delete cascade,
  mode text not null check (mode in ('team', 'cabinet', 'mentorship', 'mixed')),
  commission_split numeric(5,2) not null default 0,
  senior_approval_required boolean default false,
  status text not null default 'pending' check (status in ('pending', 'active', 'ended')),
  created_at timestamptz default now(),
  constraint no_self_hierarchy check (senior_id != junior_id),
  constraint unique_hierarchy unique (senior_id, junior_id)
);
-- 004: Collaborations between coaches
create table if not exists public.collaborations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  type text not null check (type in ('joint_session', 'program', 'guest')),
  duration_weeks integer,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.collaboration_coaches (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null references public.collaborations(id) on delete cascade,
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  role text not null default 'participant' check (role in ('lead', 'participant')),
  revenue_share numeric(5,2) not null default 0,
  constraint unique_collab_coach unique (collaboration_id, coach_id)
);

create trigger collaborations_updated_at
  before update on public.collaborations
  for each row execute function public.set_updated_at();
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
-- 008: Payments, credits, subscriptions (from Elaubody)
create table if not exists public.pricing_plans (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles(id) on delete cascade,
  name text not null,
  description text,
  type text not null check (type in ('single', 'pack', 'subscription')),
  price_cents integer not null,
  sessions_count integer,
  sessions_per_week integer,
  validity_days integer,
  stripe_price_id text,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_pricing_plans_coach on public.pricing_plans(coach_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  pricing_plan_id uuid references public.pricing_plans(id),
  stripe_payment_intent_id text,
  stripe_checkout_session_id text unique,
  amount_cents integer not null,
  platform_fee_cents integer default 0,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  payment_type text not null default 'one_time' check (payment_type in ('one_time', 'subscription', 'manual')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_payments_user on public.payments(user_id);
create index idx_payments_status on public.payments(status);

create table if not exists public.user_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  coach_id uuid not null references public.coach_profiles(id),
  payment_id uuid references public.payments(id),
  total_sessions integer not null default 0,
  used_sessions integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create index idx_credits_user on public.user_credits(user_id);
create index idx_credits_coach on public.user_credits(coach_id);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  pricing_plan_id uuid not null references public.pricing_plans(id),
  stripe_subscription_id text unique,
  status text not null default 'active' check (status in ('active', 'cancelled', 'past_due', 'incomplete')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.bookings
  add constraint fk_bookings_credit
  foreign key (credit_id) references public.user_credits(id);
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
-- 011: Nutrition plans
create table if not exists public.nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  coach_id uuid references public.coach_profiles(id),
  goal text not null,
  daily_calories integer,
  macros jsonb default '{"protein": 0, "carbs": 0, "fat": 0}',
  meals jsonb default '[]',
  vivo_sync_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_nutrition_user on public.nutrition_plans(user_id);

create trigger nutrition_plans_updated_at
  before update on public.nutrition_plans
  for each row execute function public.set_updated_at();
-- 012: Session reports (simplified from Elaubody)
create table if not exists public.session_reports (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) unique,
  coach_notes text default '',
  athlete_progress jsonb default '[]',
  next_session_focus text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_session_reports_booking on public.session_reports(booking_id);

create trigger session_reports_updated_at
  before update on public.session_reports
  for each row execute function public.set_updated_at();
-- 013: App settings (from Elaubody)
create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

insert into public.app_settings (key, value) values
  ('platform_fee_percent', '5'),
  ('booking_lead_time_hours', '24'),
  ('cancellation_deadline_hours', '24'),
  ('default_currency', 'eur')
on conflict (key) do nothing;
-- 015: PostGIS geo-search function for coaches
-- Used by searchCoaches() when lat/lng filters are provided.

create or replace function public.search_coaches_geo(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision,
  p_sport text default null,
  p_level text default null,
  p_price_min numeric default null,
  p_price_max numeric default null,
  p_min_rating numeric default null,
  p_sort_by text default 'relevance',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  "userId" uuid,
  bio text,
  specialties text[],
  certifications jsonb,
  "hourlyRate" numeric,
  lat double precision,
  lng double precision,
  radius integer,
  "acceptsAnonymousReviews" boolean,
  "isVerified" boolean,
  "avgRating" numeric,
  "totalSessions" integer,
  "firstName" text,
  "lastName" text,
  "avatarUrl" text,
  city text,
  "distanceKm" double precision
)
language plpgsql stable
as $$
begin
  return query
  select
    cp.id,
    cp.user_id as "userId",
    cp.bio,
    cp.specialties,
    cp.certifications,
    cp.hourly_rate as "hourlyRate",
    cp.lat,
    cp.lng,
    cp.radius,
    cp.accepts_anonymous_reviews as "acceptsAnonymousReviews",
    cp.is_verified as "isVerified",
    cp.avg_rating as "avgRating",
    cp.total_sessions as "totalSessions",
    coalesce(p.first_name, '') as "firstName",
    coalesce(p.last_name, '') as "lastName",
    p.avatar_url as "avatarUrl",
    p.city,
    round(
      (ST_Distance(
        ST_SetSRID(ST_MakePoint(cp.lng, cp.lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) / 1000)::numeric, 1
    )::double precision as "distanceKm"
  from public.coach_profiles cp
  inner join public.profiles p on p.id = cp.user_id
  where
    cp.lat is not null
    and cp.lng is not null
    and ST_DWithin(
      ST_SetSRID(ST_MakePoint(cp.lng, cp.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_m
    )
    and (p_sport is null or p_sport = any(cp.specialties))
    and (p_price_min is null or cp.hourly_rate >= p_price_min)
    and (p_price_max is null or cp.hourly_rate <= p_price_max)
    and (p_min_rating is null or cp.avg_rating >= p_min_rating)
  order by
    case when p_sort_by = 'distance' then
      ST_Distance(
        ST_SetSRID(ST_MakePoint(cp.lng, cp.lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      )
    end asc nulls last,
    case when p_sort_by = 'price_asc' then cp.hourly_rate end asc nulls last,
    case when p_sort_by = 'price_desc' then cp.hourly_rate end desc nulls last,
    case when p_sort_by = 'rating' then cp.avg_rating end desc nulls last,
    case when p_sort_by = 'relevance' or p_sort_by is null then cp.total_sessions end desc nulls last
  limit p_limit
  offset p_offset;
end;
$$;
-- 016: RLS policies for social layer tables
-- (ratings + endorsements already have basic RLS from 014)

-- ─── Coach Hierarchy ────────────────────────────────────────────────
alter table public.coach_hierarchy enable row level security;

-- Coaches can see hierarchies they're part of
create policy "Coach sees own hierarchy" on public.coach_hierarchy for select
  using (
    auth.uid() = (select user_id from public.coach_profiles where id = senior_id)
    or auth.uid() = (select user_id from public.coach_profiles where id = junior_id)
  );

-- Senior can create (invite)
create policy "Senior creates hierarchy invite" on public.coach_hierarchy for insert
  with check (
    auth.uid() = (select user_id from public.coach_profiles where id = senior_id)
  );

-- Both sides can update (accept/end/config)
create policy "Participant updates hierarchy" on public.coach_hierarchy for update
  using (
    auth.uid() = (select user_id from public.coach_profiles where id = senior_id)
    or auth.uid() = (select user_id from public.coach_profiles where id = junior_id)
  );

-- ─── Collaborations ────────────────────────────────────────────────
alter table public.collaborations enable row level security;
alter table public.collaboration_coaches enable row level security;

-- Anyone can read collaborations (public info for search)
create policy "Anyone reads collabs" on public.collaborations for select using (true);

-- Lead can create
create policy "Any coach creates collab" on public.collaborations for insert
  with check (true);  -- Enforced at API level (must be authenticated coach)

-- Lead can update
create policy "Lead updates collab" on public.collaborations for update
  using (
    id in (
      select collaboration_id from public.collaboration_coaches
      where coach_id = (select id from public.coach_profiles where user_id = auth.uid())
      and role = 'lead'
    )
  );

-- Anyone reads collab coaches
create policy "Anyone reads collab coaches" on public.collaboration_coaches for select using (true);

-- Lead can add coaches
create policy "Lead adds collab coaches" on public.collaboration_coaches for insert
  with check (
    collaboration_id in (
      select collaboration_id from public.collaboration_coaches
      where coach_id = (select id from public.coach_profiles where user_id = auth.uid())
      and role = 'lead'
    )
    -- Also allow first insert (lead adding themselves)
    or coach_id = (select id from public.coach_profiles where user_id = auth.uid())
  );

-- Lead can update revenue shares
create policy "Lead updates collab coaches" on public.collaboration_coaches for update
  using (
    collaboration_id in (
      select collaboration_id from public.collaboration_coaches
      where coach_id = (select id from public.coach_profiles where user_id = auth.uid())
      and role = 'lead'
    )
  );

-- ─── Endorsements (extend 014) ─────────────────────────────────────
-- 014 already has basic RLS. Add insert/delete policies.

-- Anyone reads endorsements (public)
create policy "Anyone reads endorsements" on public.endorsements for select using (true);

-- Coach can endorse
create policy "Coach creates endorsement" on public.endorsements for insert
  with check (
    auth.uid() = (select user_id from public.coach_profiles where id = endorser_id)
  );

-- Endorser can delete own endorsement
create policy "Endorser deletes endorsement" on public.endorsements for delete
  using (
    auth.uid() = (select user_id from public.coach_profiles where id = endorser_id)
  );

-- ─── Ratings (extend 014) ──────────────────────────────────────────
-- 014 already has select + insert. Add update for coach reply.

create policy "Coach replies to rating" on public.ratings for update
  using (
    auth.uid() = (select user_id from public.coach_profiles where id = coach_id)
  );
-- 016: Training courses, enrollments, coach pathway
create table if not exists public.training_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null check (category in ('platform_basics', 'first_aid', 'sports_nutrition', 'pedagogy', 'partner_cert')),
  duration_minutes integer not null default 60,
  modules jsonb not null default '[]',
  required_for_verification boolean not null default false,
  badge_icon text not null default '🎓',
  created_at timestamptz default now()
);

create table if not exists public.training_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.training_courses(id),
  coach_id uuid not null references public.coach_profiles(id),
  status text not null default 'available' check (status in ('available', 'in_progress', 'completed')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  completed_modules jsonb not null default '[]',
  started_at timestamptz default now(),
  completed_at timestamptz,
  unique (course_id, coach_id)
);

create table if not exists public.coach_pathway_progress (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coach_profiles(id) unique,
  profile_complete boolean not null default false,
  basics_course_done boolean not null default false,
  endorsements_count integer not null default 0,
  completed_sessions integer not null default 0,
  is_verified boolean not null default false,
  updated_at timestamptz default now()
);

create index idx_training_enrollments_coach on public.training_enrollments(coach_id);
create index idx_pathway_coach on public.coach_pathway_progress(coach_id);

-- Seed platform basics course (required for verification)
insert into public.training_courses (title, description, category, duration_minutes, modules, required_for_verification, badge_icon)
values (
  'Les bases de la plateforme',
  'Apprenez à utiliser la plateforme : créer vos séances, gérer vos clients, suivre vos revenus.',
  'platform_basics',
  30,
  '[
    {"id": "mod-1", "title": "Bienvenue", "type": "text", "durationMinutes": 5},
    {"id": "mod-2", "title": "Créer votre première séance", "type": "text", "durationMinutes": 10},
    {"id": "mod-3", "title": "Gérer vos clients", "type": "text", "durationMinutes": 10},
    {"id": "mod-4", "title": "Quiz final", "type": "quiz", "durationMinutes": 5, "quizQuestions": [
      {"question": "Comment créer une séance ?", "options": ["Menu Séances > Nouvelle", "Menu Profil > Séances", "Page d accueil > Créer"], "correctIndex": 0},
      {"question": "Où voir vos revenus ?", "options": ["Profil", "Revenus", "Séances"], "correctIndex": 1}
    ]}
  ]'::jsonb,
  true,
  '📚'
),
(
  'Premiers secours sportifs',
  'Les gestes essentiels de premiers secours en contexte sportif.',
  'first_aid',
  60,
  '[
    {"id": "mod-fa-1", "title": "Introduction", "type": "text", "durationMinutes": 10},
    {"id": "mod-fa-2", "title": "Blessures courantes", "type": "text", "durationMinutes": 20},
    {"id": "mod-fa-3", "title": "Réagir face à une urgence", "type": "text", "durationMinutes": 20},
    {"id": "mod-fa-4", "title": "Quiz", "type": "quiz", "durationMinutes": 10}
  ]'::jsonb,
  false,
  '🩹'
),
(
  'Nutrition sportive de base',
  'Comprendre les macronutriments, l hydratation et la récupération.',
  'sports_nutrition',
  45,
  '[
    {"id": "mod-sn-1", "title": "Macronutriments", "type": "text", "durationMinutes": 15},
    {"id": "mod-sn-2", "title": "Hydratation", "type": "text", "durationMinutes": 15},
    {"id": "mod-sn-3", "title": "Quiz", "type": "quiz", "durationMinutes": 15}
  ]'::jsonb,
  false,
  '🥗'
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger coach_pathway_updated_at
  before update on public.coach_pathway_progress
  for each row execute function public.set_updated_at();
