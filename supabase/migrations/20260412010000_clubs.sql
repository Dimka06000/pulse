-- Clubs: 7 tables, helper function, RLS policies
-- ================================================

-- Helper: check if current user is active club member with minimum role
create or replace function public.is_club_member(p_club_id uuid, p_min_role text)
returns boolean as $$
  select exists (
    select 1 from public.club_members
    where club_id = p_club_id
      and user_id = auth.uid()
      and status = 'active'
      and role = any(
        case p_min_role
          when 'member'      then array['founder','coach_admin','coach','captain','member']
          when 'captain'     then array['founder','coach_admin','coach','captain']
          when 'coach'       then array['founder','coach_admin','coach']
          when 'coach_admin' then array['founder','coach_admin']
          when 'founder'     then array['founder']
        end
      )
  );
$$ language sql security definer stable;

-- ============================================================
-- 1. clubs
-- ============================================================
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  banner_url text,
  sports text[] default '{}',
  levels text[] default '{}',
  city text,
  postal_code text,
  lat double precision,
  lng double precision,
  address text,
  join_mode text not null default 'approval' check (join_mode in ('open','approval','invite')),
  stripe_account_id text,
  is_active boolean default true,
  founded_at date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_clubs_slug on public.clubs(slug);
create index idx_clubs_sports on public.clubs using gin(sports);
create index idx_clubs_city on public.clubs(city);
create index idx_clubs_geo on public.clubs(lat, lng);

create trigger clubs_updated_at
  before update on public.clubs
  for each row execute function public.set_updated_at();

-- ============================================================
-- 2. club_members
-- ============================================================
create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('founder','coach_admin','coach','captain','member')),
  status text not null default 'active' check (status in ('active','pending','suspended','left')),
  joined_at timestamptz default now(),
  unique(club_id, user_id)
);

-- ============================================================
-- 3. club_membership_plans
-- ============================================================
create table if not exists public.club_membership_plans (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null,
  interval text not null check (interval in ('month','year','once')),
  includes_coaching boolean default false,
  max_sessions_per_month integer,
  stripe_price_id text,
  is_active boolean default true,
  sort_order integer default 0
);

-- ============================================================
-- 4. club_subscriptions
-- ============================================================
create table if not exists public.club_subscriptions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  club_member_id uuid not null references public.club_members(id) on delete cascade,
  plan_id uuid references public.club_membership_plans(id),
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  status text not null default 'active' check (status in ('active','cancelled','past_due','lifetime')),
  current_period_end timestamptz,
  created_at timestamptz default now()
);

create index idx_club_subs_club_user on public.club_subscriptions(club_id, user_id);
create index idx_club_subs_stripe on public.club_subscriptions(stripe_subscription_id);

-- ============================================================
-- 5. club_events
-- ============================================================
create table if not exists public.club_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null,
  description text,
  event_type text not null check (event_type in ('training','competition','social','workshop')),
  sport text,
  level text,
  location text,
  lat double precision,
  lng double precision,
  starts_at timestamptz not null,
  ends_at timestamptz,
  max_participants integer,
  is_members_only boolean default false,
  created_by uuid references public.profiles(id),
  recurrence_rule text,
  recurrence_parent_id uuid references public.club_events(id) on delete set null,
  status text not null default 'upcoming' check (status in ('upcoming','cancelled','completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_club_events_club on public.club_events(club_id);
create index idx_club_events_starts on public.club_events(starts_at);

create trigger club_events_updated_at
  before update on public.club_events
  for each row execute function public.set_updated_at();

-- ============================================================
-- 6. club_event_participants
-- ============================================================
create table if not exists public.club_event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.club_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered','attended','no_show','cancelled')),
  registered_at timestamptz default now(),
  unique(event_id, user_id)
);

-- ============================================================
-- 7. club_announcements
-- ============================================================
create table if not exists public.club_announcements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  author_id uuid references public.profiles(id),
  title text not null,
  body text,
  is_pinned boolean default false,
  notify_members boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_club_announcements_club on public.club_announcements(club_id);

create trigger club_announcements_updated_at
  before update on public.club_announcements
  for each row execute function public.set_updated_at();

-- ============================================================
-- Modify existing tables
-- ============================================================

-- feed_posts: add club_id column
alter table public.feed_posts
  add column if not exists club_id uuid references public.clubs(id) on delete set null;

create index if not exists idx_feed_posts_club on public.feed_posts(club_id);

-- feed_posts: replace activity_type CHECK to include 'club_post'
alter table public.feed_posts
  drop constraint if exists feed_posts_activity_type_check;
alter table public.feed_posts
  add constraint feed_posts_activity_type_check
  check (activity_type in ('solo_session','booking','synced','goal_completed','record','streak','club_post'));

-- payments: replace payment_type CHECK to include 'club_membership'
alter table public.payments
  drop constraint if exists payments_payment_type_check;
alter table public.payments
  add constraint payments_payment_type_check
  check (payment_type in ('one_time','subscription','manual','club_membership'));

-- ============================================================
-- RLS
-- ============================================================

-- clubs
alter table public.clubs enable row level security;

create policy "Anyone can view active clubs"
  on public.clubs for select using (true);

create policy "Coaches can create clubs"
  on public.clubs for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('coach','both'))
  );

create policy "Club admins can update"
  on public.clubs for update
  using (is_club_member(id, 'coach_admin'));

create policy "Club founder can delete"
  on public.clubs for delete
  using (is_club_member(id, 'founder'));

-- club_members
alter table public.club_members enable row level security;

create policy "Club members can view fellow members"
  on public.club_members for select
  using (
    is_club_member(club_id, 'member')
    or user_id = auth.uid()
  );

create policy "User can request membership"
  on public.club_members for insert
  with check (auth.uid() = user_id);

create policy "Admin or self can update member"
  on public.club_members for update
  using (
    is_club_member(club_id, 'coach_admin')
    or user_id = auth.uid()
  );

create policy "Admin or self can delete member"
  on public.club_members for delete
  using (
    is_club_member(club_id, 'coach_admin')
    or user_id = auth.uid()
  );

-- club_membership_plans
alter table public.club_membership_plans enable row level security;

create policy "Anyone can view plans"
  on public.club_membership_plans for select using (true);

create policy "Founder manages plans (insert)"
  on public.club_membership_plans for insert
  with check (is_club_member(club_id, 'founder'));

create policy "Founder manages plans (update)"
  on public.club_membership_plans for update
  using (is_club_member(club_id, 'founder'));

create policy "Founder manages plans (delete)"
  on public.club_membership_plans for delete
  using (is_club_member(club_id, 'founder'));

-- club_subscriptions
alter table public.club_subscriptions enable row level security;

create policy "User views own subscriptions"
  on public.club_subscriptions for select
  using (user_id = auth.uid());

-- writes handled by service_role / admin client only

-- club_events
alter table public.club_events enable row level security;

create policy "Members see events, public sees non-members-only"
  on public.club_events for select
  using (
    is_members_only = false
    or is_club_member(club_id, 'member')
  );

create policy "Coach+ can create events"
  on public.club_events for insert
  with check (is_club_member(club_id, 'coach'));

create policy "Coach+ can update events"
  on public.club_events for update
  using (is_club_member(club_id, 'coach'));

-- club_event_participants
alter table public.club_event_participants enable row level security;

create policy "Club members see event participants"
  on public.club_event_participants for select
  using (
    is_club_member(
      (select club_id from public.club_events where id = event_id),
      'member'
    )
  );

create policy "Club members can register"
  on public.club_event_participants for insert
  with check (
    auth.uid() = user_id
    and is_club_member(
      (select club_id from public.club_events where id = event_id),
      'member'
    )
  );

create policy "User can cancel own participation"
  on public.club_event_participants for delete
  using (user_id = auth.uid());

-- club_announcements
alter table public.club_announcements enable row level security;

create policy "Club members can read announcements"
  on public.club_announcements for select
  using (is_club_member(club_id, 'member'));

create policy "Coach+ can create announcements"
  on public.club_announcements for insert
  with check (is_club_member(club_id, 'coach'));

create policy "Coach+ can update announcements"
  on public.club_announcements for update
  using (is_club_member(club_id, 'coach'));

-- feed_posts: additional policy for club feed
create policy "Club members can read club posts"
  on public.feed_posts for select
  using (
    club_id is null
    or is_club_member(club_id, 'member')
  );
