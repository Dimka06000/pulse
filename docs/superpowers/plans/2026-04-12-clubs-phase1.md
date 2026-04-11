# Clubs Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the clubs feature — branded sports organizations where coaches associate to manage coaching, events, and community for members, with Stripe Connect payments.

**Architecture:** 7 new DB tables + modifications to 2 existing tables, 21 API endpoints, 17 pages, Zustand store, sidebar integration. Follows existing patterns: Next.js 15 App Router pages, Supabase admin client for queries, RLS policies, Stripe Connect with transfers.

**Tech Stack:** Next.js 15, Supabase (PostgreSQL + RLS + Realtime), Stripe Connect, Zustand, Tailwind CSS, `rrule` npm package.

**Spec:** `docs/superpowers/specs/2026-04-12-clubs-design.md`

---

### Task 1: Database Migration — Core Tables

**Files:**
- Create: `supabase/migrations/20260412010000_clubs.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 020: Clubs — core tables, RLS helper, policies

-- Helper function for role-based access
create or replace function public.is_club_member(p_club_id uuid, p_min_role text default 'member')
returns boolean as $$
  select exists (
    select 1 from public.club_members
    where club_id = p_club_id
      and user_id = auth.uid()
      and status = 'active'
      and role = any(
        case p_min_role
          when 'member' then array['founder', 'coach_admin', 'coach', 'captain', 'member']
          when 'captain' then array['founder', 'coach_admin', 'coach', 'captain']
          when 'coach' then array['founder', 'coach_admin', 'coach']
          when 'coach_admin' then array['founder', 'coach_admin']
          when 'founder' then array['founder']
        end
      )
  );
$$ language sql security definer stable;

-- Clubs
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text default '',
  logo_url text,
  banner_url text,
  sports text[] default '{}',
  levels text[] default '{}',
  city text,
  postal_code text,
  lat double precision,
  lng double precision,
  address text,
  join_mode text not null default 'open' check (join_mode in ('open', 'approval', 'invite')),
  stripe_account_id text,
  is_active boolean default true,
  founded_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_clubs_slug on public.clubs(slug);
create index idx_clubs_sports on public.clubs using gin(sports);
create index idx_clubs_city on public.clubs(city);
create index idx_clubs_location on public.clubs(lat, lng);

create trigger clubs_updated_at
  before update on public.clubs
  for each row execute function public.set_updated_at();

-- Club members
create table if not exists public.club_members (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('founder', 'coach_admin', 'coach', 'captain', 'member')),
  status text not null default 'active' check (status in ('active', 'pending', 'suspended', 'left')),
  joined_at timestamptz default now(),
  unique (club_id, user_id)
);

create index idx_club_members_club on public.club_members(club_id);
create index idx_club_members_user on public.club_members(user_id);

-- Membership plans
create table if not exists public.club_membership_plans (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  description text default '',
  price_cents integer not null default 0,
  interval text not null default 'month' check (interval in ('month', 'year', 'once')),
  includes_coaching boolean default false,
  max_sessions_per_month integer,
  stripe_price_id text,
  is_active boolean default true,
  sort_order integer default 0
);

create index idx_club_plans_club on public.club_membership_plans(club_id);

-- Club subscriptions
create table if not exists public.club_subscriptions (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  club_member_id uuid not null references public.club_members(id) on delete cascade,
  plan_id uuid not null references public.club_membership_plans(id),
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  status text not null default 'active' check (status in ('active', 'cancelled', 'past_due', 'lifetime')),
  current_period_end timestamptz,
  created_at timestamptz default now()
);

create index idx_club_subs_club_user on public.club_subscriptions(club_id, user_id);
create index idx_club_subs_stripe on public.club_subscriptions(stripe_subscription_id);

-- Club events
create table if not exists public.club_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null,
  description text default '',
  event_type text not null default 'training' check (event_type in ('training', 'competition', 'social', 'workshop')),
  sport text,
  level text default 'all',
  location text,
  lat double precision,
  lng double precision,
  starts_at timestamptz not null,
  ends_at timestamptz,
  max_participants integer,
  is_members_only boolean default true,
  created_by uuid references public.profiles(id),
  recurrence_rule text,
  recurrence_parent_id uuid references public.club_events(id) on delete set null,
  status text not null default 'upcoming' check (status in ('upcoming', 'cancelled', 'completed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_club_events_club on public.club_events(club_id);
create index idx_club_events_starts on public.club_events(starts_at);
create index idx_club_events_parent on public.club_events(recurrence_parent_id);

create trigger club_events_updated_at
  before update on public.club_events
  for each row execute function public.set_updated_at();

-- Club event participants
create table if not exists public.club_event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.club_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'attended', 'no_show', 'cancelled')),
  registered_at timestamptz default now(),
  unique (event_id, user_id)
);

-- Club announcements
create table if not exists public.club_announcements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  title text not null,
  body text not null default '',
  is_pinned boolean default false,
  notify_members boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_club_announcements_club on public.club_announcements(club_id);

create trigger club_announcements_updated_at
  before update on public.club_announcements
  for each row execute function public.set_updated_at();

-- Modify feed_posts: add club_id + expand activity_type
alter table public.feed_posts add column if not exists club_id uuid references public.clubs(id) on delete set null;
create index if not exists idx_feed_posts_club on public.feed_posts(club_id);

alter table public.feed_posts drop constraint if exists feed_posts_activity_type_check;
alter table public.feed_posts add constraint feed_posts_activity_type_check
  check (activity_type in ('solo_session', 'booking', 'synced', 'goal_completed', 'record', 'streak', 'club_post'));

-- Modify payments: expand payment_type
alter table public.payments drop constraint if exists payments_payment_type_check;
alter table public.payments add constraint payments_payment_type_check
  check (payment_type in ('one_time', 'subscription', 'manual', 'club_membership'));

-- RLS policies
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.club_membership_plans enable row level security;
alter table public.club_subscriptions enable row level security;
alter table public.club_events enable row level security;
alter table public.club_event_participants enable row level security;
alter table public.club_announcements enable row level security;

-- clubs: public read, admin+ write
create policy "Anyone reads clubs" on public.clubs for select using (true);
create policy "Coach creates club" on public.clubs for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('coach', 'both'))
);
create policy "Club admin updates club" on public.clubs for update using (
  public.is_club_member(id, 'coach_admin')
);
create policy "Founder deletes club" on public.clubs for delete using (
  public.is_club_member(id, 'founder')
);

-- club_members: members read own club, auth join, admin manage
create policy "Members read own club" on public.club_members for select using (
  public.is_club_member(club_id, 'member') or user_id = auth.uid()
);
create policy "Auth user joins club" on public.club_members for insert with check (
  auth.uid() = user_id
);
create policy "Admin or self updates membership" on public.club_members for update using (
  public.is_club_member(club_id, 'coach_admin') or user_id = auth.uid()
);
create policy "Admin or self deletes membership" on public.club_members for delete using (
  public.is_club_member(club_id, 'coach_admin') or user_id = auth.uid()
);

-- club_membership_plans: public read, founder write
create policy "Anyone reads club plans" on public.club_membership_plans for select using (true);
create policy "Founder manages plans" on public.club_membership_plans for insert with check (
  public.is_club_member(club_id, 'founder')
);
create policy "Founder updates plans" on public.club_membership_plans for update using (
  public.is_club_member(club_id, 'founder')
);
create policy "Founder deletes plans" on public.club_membership_plans for delete using (
  public.is_club_member(club_id, 'founder')
);

-- club_subscriptions: own rows read, admin client writes
create policy "User reads own subscriptions" on public.club_subscriptions for select using (
  user_id = auth.uid()
);

-- club_events: members read, coach+ write
create policy "Members read club events" on public.club_events for select using (
  public.is_club_member(club_id, 'member') or not is_members_only
);
create policy "Coach creates club events" on public.club_events for insert with check (
  public.is_club_member(club_id, 'coach')
);
create policy "Coach updates club events" on public.club_events for update using (
  public.is_club_member(club_id, 'coach')
);

-- club_event_participants: members read via event, self register
create policy "Members read event participants" on public.club_event_participants for select using (
  public.is_club_member((select club_id from public.club_events where id = event_id), 'member')
);
create policy "Member registers for event" on public.club_event_participants for insert with check (
  auth.uid() = user_id and
  public.is_club_member((select club_id from public.club_events where id = event_id), 'member')
);
create policy "Self cancels registration" on public.club_event_participants for delete using (
  auth.uid() = user_id
);

-- club_announcements: members read, coach+ write
create policy "Members read announcements" on public.club_announcements for select using (
  public.is_club_member(club_id, 'member')
);
create policy "Coach posts announcement" on public.club_announcements for insert with check (
  public.is_club_member(club_id, 'coach')
);
create policy "Coach updates announcement" on public.club_announcements for update using (
  public.is_club_member(club_id, 'coach')
);

-- feed_posts club extension
create policy "Members read club feed" on public.feed_posts for select using (
  club_id is null or public.is_club_member(club_id, 'member')
);
```

- [ ] **Step 2: Run migration on Supabase**

Run: `npx supabase db push` or apply via Supabase dashboard SQL editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260412010000_clubs.sql
git commit -m "feat(clubs): database migration — 7 tables, RLS helper, policies"
```

---

### Task 2: Install rrule + Zustand Store

**Files:**
- Create: `src/stores/clubs.ts`

- [ ] **Step 1: Install rrule**

```bash
npm install rrule
```

- [ ] **Step 2: Write the Zustand store**

```typescript
// src/stores/clubs.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Club {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string | null;
  banner_url: string | null;
  sports: string[];
  levels: string[];
  city: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  join_mode: 'open' | 'approval' | 'invite';
  stripe_account_id: string | null;
  is_active: boolean;
  member_count?: number;
}

interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: 'founder' | 'coach_admin' | 'coach' | 'captain' | 'member';
  status: 'active' | 'pending' | 'suspended' | 'left';
  joined_at: string;
  profiles?: { first_name: string; last_name: string; avatar_url: string | null };
}

interface ClubEvent {
  id: string;
  club_id: string;
  title: string;
  description: string;
  event_type: string;
  sport: string | null;
  level: string;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  max_participants: number | null;
  is_members_only: boolean;
  status: string;
  participant_count?: number;
  is_registered?: boolean;
}

interface ClubsState {
  // Discovery
  clubs: Club[];
  totalCount: number;
  loading: boolean;
  error: string | null;

  // Active club context
  activeClub: Club | null;
  myClubs: (Club & { role: string })[];
  activeClubSlug: string | null;
  myRole: string | null;

  // Club detail data
  members: ClubMember[];
  events: ClubEvent[];
  announcements: any[];

  // Actions
  fetchClubs: (params?: Record<string, string>) => Promise<void>;
  fetchClub: (slugOrId: string) => Promise<void>;
  fetchMyClubs: () => Promise<void>;
  setActiveClub: (slug: string) => void;

  fetchMembers: (clubId: string) => Promise<void>;
  joinClub: (clubId: string) => Promise<void>;
  updateMember: (clubId: string, userId: string, data: Record<string, string>) => Promise<void>;

  fetchEvents: (clubId: string) => Promise<void>;
  createEvent: (clubId: string, data: Record<string, unknown>) => Promise<void>;
  registerForEvent: (clubId: string, eventId: string) => Promise<void>;
  cancelEventRegistration: (clubId: string, eventId: string) => Promise<void>;

  fetchAnnouncements: (clubId: string) => Promise<void>;
  postAnnouncement: (clubId: string, data: { title: string; body: string }) => Promise<void>;
}

export const useClubsStore = create<ClubsState>()(
  persist(
    (set, get) => ({
  clubs: [],
  totalCount: 0,
  loading: false,
  error: null,
  activeClub: null,
  myClubs: [],
  activeClubSlug: null,
  myRole: null,
  members: [],
  events: [],
  announcements: [],

  fetchClubs: async (params) => {
    set({ loading: true, error: null });
    try {
      const qs = new URLSearchParams(params || {});
      const res = await fetch(`/api/clubs?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erreur chargement');
      set({ clubs: json.data, totalCount: json.count, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchClub: async (slugOrId) => {
    set({ loading: true, error: null });
    try {
      const isUuid = /^[0-9a-f-]{36}$/.test(slugOrId);
      const url = isUuid ? `/api/clubs/${slugOrId}` : `/api/clubs/${slugOrId}?by=slug`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Club introuvable');
      set({ activeClub: json, loading: false });
      // Determine user role — fetch myClubs first if not loaded
      let myClubs = get().myClubs;
      if (myClubs.length === 0) {
        await get().fetchMyClubs();
        myClubs = get().myClubs;
      }
      const membership = myClubs.find((c) => c.id === json.id);
      set({ myRole: membership?.role || null });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchMyClubs: async () => {
    try {
      const res = await fetch('/api/clubs?mine=true');
      const json = await res.json();
      if (res.ok) {
        set({ myClubs: json.data || [] });
        // Auto-set active club if none selected
        const { activeClubSlug } = get();
        if (!activeClubSlug && json.data?.length > 0) {
          get().setActiveClub(json.data[0].slug);
        }
      }
    } catch {
      // silent — non-critical
    }
  },

  setActiveClub: (slug) => {
    set({ activeClubSlug: slug });
    // Persisted automatically via zustand/middleware persist
  },

  fetchMembers: async (clubId) => {
    try {
      const res = await fetch(`/api/clubs/${clubId}/members`);
      const json = await res.json();
      if (res.ok) set({ members: json });
    } catch { /* silent */ }
  },

  joinClub: async (clubId) => {
    const res = await fetch(`/api/clubs/${clubId}/members`, { method: 'POST' });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? 'Erreur adhésion');
    }
    await get().fetchMyClubs();
  },

  updateMember: async (clubId, userId, data) => {
    const res = await fetch(`/api/clubs/${clubId}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? 'Erreur mise à jour');
    }
    await get().fetchMembers(clubId);
  },

  fetchEvents: async (clubId) => {
    try {
      const res = await fetch(`/api/clubs/${clubId}/events`);
      const json = await res.json();
      if (res.ok) set({ events: json });
    } catch { /* silent */ }
  },

  createEvent: async (clubId, data) => {
    const res = await fetch(`/api/clubs/${clubId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? 'Erreur création');
    }
    await get().fetchEvents(clubId);
  },

  registerForEvent: async (clubId, eventId) => {
    const res = await fetch(`/api/clubs/${clubId}/events/${eventId}/register`, { method: 'POST' });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? 'Erreur inscription');
    }
    await get().fetchEvents(clubId);
  },

  cancelEventRegistration: async (clubId, eventId) => {
    const res = await fetch(`/api/clubs/${clubId}/events/${eventId}/register`, { method: 'DELETE' });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? 'Erreur annulation');
    }
    await get().fetchEvents(clubId);
  },

  fetchAnnouncements: async (clubId) => {
    try {
      const res = await fetch(`/api/clubs/${clubId}/announcements`);
      const json = await res.json();
      if (res.ok) set({ announcements: json });
    } catch { /* silent */ }
  },

  postAnnouncement: async (clubId, data) => {
    const res = await fetch(`/api/clubs/${clubId}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? 'Erreur publication');
    }
    await get().fetchAnnouncements(clubId);
  },
}),
    {
      name: 'pulse-clubs',
      partialize: (state) => ({ activeClubSlug: state.activeClubSlug }),
    },
  ),
);
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json src/stores/clubs.ts
git commit -m "feat(clubs): Zustand store + install rrule"
```

---

### Task 3: API — Club CRUD + Discovery

**Files:**
- Create: `src/app/api/clubs/route.ts`
- Create: `src/app/api/clubs/[id]/route.ts`
- Create: `src/lib/clubs/slug.ts`

- [ ] **Step 1: Write slug generator utility**

```typescript
// src/lib/clubs/slug.ts
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function uniqueSlug(name: string): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const base = generateSlug(name);
  let slug = base;
  let suffix = 2;

  while (true) {
    const { data } = await supabase.from('clubs').select('id').eq('slug', slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${suffix}`;
    suffix++;
  }
}
```

- [ ] **Step 2: Write GET /api/clubs (list + search + mine)**

```typescript
// src/app/api/clubs/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { uniqueSlug } from '@/lib/clubs/slug';

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdminClient();
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  const url = req.nextUrl;
  const mine = url.searchParams.get('mine') === 'true';
  const sport = url.searchParams.get('sport');
  const city = url.searchParams.get('city');
  const search = url.searchParams.get('q');
  const page = Number(url.searchParams.get('page') || '1');
  const limit = Number(url.searchParams.get('limit') || '20');

  try {
    if (mine && user) {
      // Fetch clubs the user belongs to with their role
      const { data: memberships } = await supabase
        .from('club_members')
        .select('role, clubs(*)')
        .eq('user_id', user.id)
        .eq('status', 'active');

      const data = (memberships || []).map((m: any) => ({ ...m.clubs, role: m.role }));
      return NextResponse.json({ data, count: data.length });
    }

    let query = supabase
      .from('clubs')
      .select('*, club_members(count)', { count: 'exact' })
      .eq('is_active', true);

    if (sport) query = query.contains('sports', [sport]);
    if (city) query = query.ilike('city', `%${city}%`);
    if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);

    query = query.range((page - 1) * limit, page * limit - 1).order('created_at', { ascending: false });

    const { data, count } = await query;

    const clubs = (data || []).map((c: any) => ({
      ...c,
      member_count: c.club_members?.[0]?.count || 0,
      club_members: undefined,
    }));

    return NextResponse.json({ data: clubs, count: count || 0 });
  } catch (err: any) {
    console.error('Clubs API error:', err);
    return NextResponse.json({ data: [], count: 0 });
  }
}

export async function POST(req: NextRequest) {
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  // Coach-only check
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['coach', 'both'].includes(profile.role)) {
    return NextResponse.json({ error: 'Seuls les coachs peuvent créer un club' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const slug = await uniqueSlug(body.name);

    const { data: club, error } = await supabase
      .from('clubs')
      .insert({
        name: body.name,
        slug,
        description: body.description || '',
        logo_url: body.logo_url || null,
        banner_url: body.banner_url || null,
        sports: body.sports || [],
        levels: body.levels || [],
        city: body.city || null,
        postal_code: body.postal_code || null,
        lat: body.lat || null,
        lng: body.lng || null,
        address: body.address || null,
        join_mode: body.join_mode || 'open',
      })
      .select('*')
      .single();

    if (error) throw error;

    // Creator becomes founder
    await supabase.from('club_members').insert({
      club_id: club.id,
      user_id: user.id,
      role: 'founder',
      status: 'active',
    });

    return NextResponse.json(club, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
```

- [ ] **Step 3: Write GET/PATCH /api/clubs/[id]**

```typescript
// src/app/api/clubs/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = getSupabaseAdminClient();

  try {
    const bySlug = req.nextUrl.searchParams.get('by') === 'slug';
    let query = supabase
      .from('clubs')
      .select('*, club_members(count)');

    query = bySlug ? query.eq('slug', id) : query.eq('id', id);

    // Only filter inactive clubs for non-members (admins/founders can see their inactive club)
    // RLS handles read access; we filter is_active in list endpoints, not detail

    const { data, error } = await query.single();
    if (error || !data) return NextResponse.json({ error: 'Club introuvable' }, { status: 404 });

    return NextResponse.json({
      ...data,
      member_count: data.club_members?.[0]?.count || 0,
      club_members: undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const authClient = await getSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const supabase = getSupabaseAdminClient();

  try {
    const body = await req.json();
    const allowed = ['name', 'description', 'logo_url', 'banner_url', 'sports', 'levels',
      'city', 'postal_code', 'lat', 'lng', 'address', 'join_mode'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }

    const { data, error } = await supabase
      .from('clubs')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
```

- [ ] **Step 4: Verify build**

Run: `npx next build`

- [ ] **Step 5: Commit**

```bash
git add src/lib/clubs/slug.ts src/app/api/clubs/route.ts src/app/api/clubs/[id]/route.ts
git commit -m "feat(clubs): API — club CRUD + discovery + slug generation"
```

---

### Task 4: API — Members (join, approve, roles, leave)

**Files:**
- Create: `src/app/api/clubs/[id]/members/route.ts`
- Create: `src/app/api/clubs/[id]/members/[uid]/route.ts`

- [ ] **Step 1: Write GET/POST /api/clubs/[id]/members**

Members list + join/request endpoint. POST auto-sets status based on club's `join_mode`. Include full code following the pattern from Task 3.

- [ ] **Step 2: Write PATCH/DELETE /api/clubs/[id]/members/[uid]**

Role changes, approval, suspension, leave/kick. Admin check via `is_club_member` query. Include full code.

- [ ] **Step 3: Verify build**

Run: `npx next build`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/clubs/[id]/members/
git commit -m "feat(clubs): API — members join/approve/roles/leave"
```

---

### Task 5: API — Events + Recurrence

**Files:**
- Create: `src/app/api/clubs/[id]/events/route.ts`
- Create: `src/app/api/clubs/[id]/events/[eid]/route.ts`
- Create: `src/app/api/clubs/[id]/events/[eid]/register/route.ts`
- Create: `src/lib/clubs/recurrence.ts`

- [ ] **Step 1: Write recurrence helper**

```typescript
// src/lib/clubs/recurrence.ts
import { RRule } from 'rrule';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export async function generateOccurrences(
  parentEvent: { id: string; club_id: string; title: string; description: string; event_type: string; sport: string | null; level: string; location: string | null; lat: number | null; lng: number | null; starts_at: string; ends_at: string | null; max_participants: number | null; is_members_only: boolean; created_by: string | null; recurrence_rule: string },
  weeksAhead: number = 8,
  afterDate?: Date,
) {
  const supabase = getSupabaseAdminClient();
  const rule = RRule.fromString(parentEvent.recurrence_rule);

  const from = afterDate || new Date();
  const until = new Date(Date.now() + weeksAhead * 7 * 24 * 60 * 60 * 1000);
  const dates = rule.between(from, until, !afterDate); // exc=true if afterDate to avoid dup

  // Calculate duration from parent
  const parentStart = new Date(parentEvent.starts_at);
  const parentEnd = parentEvent.ends_at ? new Date(parentEvent.ends_at) : null;
  const durationMs = parentEnd ? parentEnd.getTime() - parentStart.getTime() : null;

  const rows = dates.map((date) => ({
    club_id: parentEvent.club_id,
    title: parentEvent.title,
    description: parentEvent.description,
    event_type: parentEvent.event_type,
    sport: parentEvent.sport,
    level: parentEvent.level,
    location: parentEvent.location,
    lat: parentEvent.lat,
    lng: parentEvent.lng,
    starts_at: date.toISOString(),
    ends_at: durationMs ? new Date(date.getTime() + durationMs).toISOString() : null,
    max_participants: parentEvent.max_participants,
    is_members_only: parentEvent.is_members_only,
    created_by: parentEvent.created_by,
    recurrence_parent_id: parentEvent.id,
  }));

  if (rows.length > 0) {
    await supabase.from('club_events').insert(rows);
  }

  return rows.length;
}
```

- [ ] **Step 2: Write GET/POST /api/clubs/[id]/events**

GET returns upcoming events. POST creates event + generates occurrences if recurring. Include full code.

- [ ] **Step 3: Write PATCH /api/clubs/[id]/events/[eid]**

Edit single event or parent + regenerate. Include full code.

- [ ] **Step 4: Write POST/DELETE /api/clubs/[id]/events/[eid]/register**

RSVP and cancel registration. Include full code.

- [ ] **Step 5: Write GET /api/clubs/[id]/sessions**

Create `src/app/api/clubs/[id]/sessions/route.ts`. Lists session templates from coaches who are active club members. Queries `session_templates` joined with `coach_profiles` joined with `club_members` where `club_id` matches and `club_members.role` is coach+. Returns templates with coach name, price, sport.

- [ ] **Step 6: Verify build**

Run: `npx next build`

- [ ] **Step 7: Commit**

```bash
git add src/lib/clubs/recurrence.ts src/app/api/clubs/[id]/events/ src/app/api/clubs/[id]/sessions/
git commit -m "feat(clubs): API — events with RRULE recurrence + RSVP + club sessions"
```

---

### Task 6: API — Announcements + Feed

**Files:**
- Create: `src/app/api/clubs/[id]/announcements/route.ts`
- Create: `src/app/api/clubs/[id]/feed/route.ts`

- [ ] **Step 1: Write announcements route (GET/POST)**

List announcements (pinned first), create announcement. If `notify_members`, fire push notifications to club members.

- [ ] **Step 2: Write club feed route (GET/POST)**

GET: fetch `feed_posts` where `club_id = :id`. POST: create `feed_post` with `activity_type: 'club_post'` and `club_id`.

- [ ] **Step 3: Verify build + commit**

```bash
git add src/app/api/clubs/[id]/announcements/ src/app/api/clubs/[id]/feed/
git commit -m "feat(clubs): API — announcements + club feed"
```

---

### Task 7: API — Membership Plans + Stripe Subscribe

**Files:**
- Create: `src/app/api/clubs/[id]/plans/route.ts`
- Create: `src/app/api/clubs/[id]/subscribe/route.ts`
- Modify: `src/lib/stripe/webhooks.ts`

- [ ] **Step 1: Write plans route (GET/POST)**

GET: list active plans for club. POST: create plan (founder only), optionally create Stripe Price.

- [ ] **Step 2: Write subscribe route (POST)**

Creates Stripe Checkout Session. Branch on plan interval: `mode: 'subscription'` for month/year, `mode: 'payment'` for once. Set `transfer_data.destination` to club's `stripe_account_id`. Metadata: `{ user_id, club_id, plan_id, club_member_id, payment_type: 'club_membership' }`.

- [ ] **Step 3: Extend webhooks — handleCheckoutCompleted**

Restructure the early-exit guard to branch on `payment_type` BEFORE checking `coach_id`:

```typescript
// At the top of handleCheckoutCompleted, replace the existing guard:
const metadata = session.metadata || {};
const { user_id, coach_id, payment_type } = metadata;

if (payment_type === 'club_membership') {
  return handleClubMembershipCheckout(session, metadata);
}

// Existing flow — guard on coach_id
if (!user_id || !coach_id) {
  console.error('Webhook: metadata missing in checkout.session.completed');
  return;
}
// ... rest of existing logic unchanged
```

Add `handleClubMembershipCheckout` function that creates payment record + club_subscriptions.

- [ ] **Step 4: Refactor handleSubscriptionUpdated + handleSubscriptionDeleted**

**IMPORTANT: This is a refactor of existing functions, not an append.** The current `handleSubscriptionUpdated` fires `.update()` without checking if rows were matched. Must be changed to add `.select('id')` and check the result before falling through to club path:

```typescript
// REFACTOR handleSubscriptionUpdated — replace the existing .update() call:
const { data: updated } = await supabase
  .from('subscriptions')
  .update({
    status: subscription.status,
    current_period_start: new Date(periodStart * 1000).toISOString(),
    current_period_end: new Date(periodEnd * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
  })
  .eq('stripe_subscription_id', subscription.id)
  .select('id');

// Fallthrough: if no coach subscription matched, try club subscriptions
if (!updated?.length) {
  await supabase
    .from('club_subscriptions')
    .update({
      status: subscription.status === 'active' ? 'active'
        : subscription.status === 'past_due' ? 'past_due' : 'cancelled',
    })
    .eq('stripe_subscription_id', subscription.id);
}
```

Apply same refactor pattern to `handleSubscriptionDeleted`: add `.select('id')`, check `!updated?.length`, fallthrough to `club_subscriptions`.

- [ ] **Step 5: Verify build + commit**

```bash
git add src/app/api/clubs/[id]/plans/ src/app/api/clubs/[id]/subscribe/ src/lib/stripe/webhooks.ts
git commit -m "feat(clubs): API — membership plans + Stripe checkout + webhook handling"
```

---

### Task 8: Cron — Recurring Event Generation

**Files:**
- Create: `src/app/api/cron/club-events/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Write the cron endpoint**

```typescript
// src/app/api/cron/club-events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateOccurrences } from '@/lib/clubs/recurrence';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdminClient();
  const fourWeeksFromNow = new Date(Date.now() + 4 * 7 * 24 * 60 * 60 * 1000).toISOString();

  // Find recurring parent events that need more occurrences
  const { data: parents } = await supabase
    .from('club_events')
    .select('*')
    .not('recurrence_rule', 'is', null)
    .is('recurrence_parent_id', null)
    .eq('status', 'upcoming');

  let totalGenerated = 0;

  for (const parent of parents || []) {
    // Check if latest occurrence is within 4 weeks
    const { data: latest } = await supabase
      .from('club_events')
      .select('starts_at')
      .eq('recurrence_parent_id', parent.id)
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest || latest.starts_at < fourWeeksFromNow) {
      // Pass afterDate to avoid duplicating existing occurrences
      const afterDate = latest ? new Date(latest.starts_at) : undefined;
      const count = await generateOccurrences(parent, 8, afterDate);
      totalGenerated += count;
    }
  }

  return NextResponse.json({ generated: totalGenerated });
}
```

- [ ] **Step 2: Add cron to vercel.json**

Add to the `crons` array: `{ "path": "/api/cron/club-events", "schedule": "0 3 * * *" }`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/club-events/route.ts vercel.json
git commit -m "feat(clubs): cron — daily recurring event generation"
```

---

### Task 9: Sidebar Navigation

**Files:**
- Modify: `src/components/pulse/sidebar.tsx`

- [ ] **Step 1: Add clubs to Explorer section**

Add `{ href: '/clubs', icon: '🏟️', label: 'Clubs' }` to `exploreNav` array.

- [ ] **Step 2: Add "Mon club" section**

Import `useClubsStore`. After Explorer section, conditionally render a "Mon club" section when `myClubs.length > 0`. If multiple clubs, add a `<select>` dropdown. Links use `activeClubSlug`.

- [ ] **Step 3: Add "Gérer mon club" to coach section**

Conditionally add manage link when user's role in active club is `founder` or `coach_admin`.

- [ ] **Step 4: Fetch myClubs on mount**

Add `useEffect` that calls `fetchMyClubs()` on component mount.

- [ ] **Step 5: Verify build + commit**

```bash
git add src/components/pulse/sidebar.tsx
git commit -m "feat(clubs): sidebar — clubs link + Mon club section + multi-club selector"
```

---

### Task 10: Pages — Discovery + Create

**Files:**
- Create: `src/app/(app)/clubs/page.tsx`
- Create: `src/app/(app)/clubs/create/page.tsx`
- Create: `src/components/clubs/club-card.tsx`

- [ ] **Step 1: Write ClubCard component**

Card with logo/avatar, name, sports badges, city, member count, join_mode badge. Link to `/clubs/[slug]`.

- [ ] **Step 2: Write discovery page**

Search bar, sport/city filters, grid of ClubCards. Uses `useClubsStore.fetchClubs`. Skeleton loading state.

- [ ] **Step 3: Write create page**

Form with: name, description, sports (multi-select), levels, join_mode, Google Places address. POST to `/api/clubs`, redirect to `/clubs/[slug]` on success. Coach-only guard.

- [ ] **Step 4: Verify build + commit**

```bash
git add src/app/(app)/clubs/page.tsx src/app/(app)/clubs/create/page.tsx src/components/clubs/club-card.tsx
git commit -m "feat(clubs): pages — discovery + create club"
```

---

### Task 11: Pages — Public Club Page (Storefront)

**Files:**
- Create: `src/app/(app)/clubs/[slug]/page.tsx`

- [ ] **Step 1: Write the public page**

Banner, logo, name, description, sports badges, levels, location, member count. If user is not a member: "Rejoindre" button (→ /clubs/[slug]/join). If member: quick links to feed, events, members. Upcoming events preview (3 next). Latest announcement preview.

- [ ] **Step 2: Verify build + commit**

```bash
git add src/app/(app)/clubs/[slug]/page.tsx
git commit -m "feat(clubs): page — public club storefront"
```

---

### Task 12: Pages — Feed + Announcements

**Files:**
- Create: `src/app/(app)/clubs/[slug]/feed/page.tsx`
- Create: `src/app/(app)/clubs/[slug]/announcements/page.tsx`

- [ ] **Step 1: Write feed page**

Activity feed using existing `FeedCard` component. Post form at top for club_post. Members-only guard.

- [ ] **Step 2: Write announcements page**

List of announcements, pinned first. Coach+ can post via form. Members-only guard.

- [ ] **Step 3: Verify build + commit**

```bash
git add src/app/(app)/clubs/[slug]/feed/ src/app/(app)/clubs/[slug]/announcements/
git commit -m "feat(clubs): pages — club feed + announcements"
```

---

### Task 13: Pages — Events + Members

**Files:**
- Create: `src/app/(app)/clubs/[slug]/events/page.tsx`
- Create: `src/app/(app)/clubs/[slug]/members/page.tsx`
- Create: `src/components/clubs/club-event-card.tsx`

- [ ] **Step 1: Write event card component**

Event type badge, title, date/time, location, participant count / max, RSVP button.

- [ ] **Step 2: Write events page**

Calendar-style list of upcoming events. RSVP inline. Coach+ sees "Créer un événement" button.

- [ ] **Step 3: Write members page**

Grid/list of members with avatar, name, role badge, joined date. Sorted by role hierarchy.

- [ ] **Step 4: Verify build + commit**

```bash
git add src/app/(app)/clubs/[slug]/events/ src/app/(app)/clubs/[slug]/members/ src/components/clubs/
git commit -m "feat(clubs): pages — events calendar + member directory"
```

---

### Task 14: Pages — Join + Sessions

**Files:**
- Create: `src/app/(app)/clubs/[slug]/join/page.tsx`
- Create: `src/app/(app)/clubs/[slug]/sessions/page.tsx`

- [ ] **Step 1: Write join page**

Show membership plans (free and paid). For free/open: instant join button. For paid: select plan → Stripe checkout. For approval mode: request button → pending state.

- [ ] **Step 2: Write sessions page**

List coaching sessions available from club coaches. Reuse existing session template card pattern. Filter by sport/coach.

- [ ] **Step 3: Verify build + commit**

```bash
git add src/app/(app)/clubs/[slug]/join/ src/app/(app)/clubs/[slug]/sessions/
git commit -m "feat(clubs): pages — join flow + coaching sessions"
```

---

### Task 15: Pages — Admin Dashboard

**Files:**
- Create: `src/app/(app)/clubs/[slug]/manage/page.tsx`
- Create: `src/app/(app)/clubs/[slug]/manage/members/page.tsx`
- Create: `src/app/(app)/clubs/[slug]/manage/events/page.tsx`
- Create: `src/app/(app)/clubs/[slug]/manage/plans/page.tsx`
- Create: `src/app/(app)/clubs/[slug]/manage/settings/page.tsx`
- Create: `src/app/(app)/clubs/[slug]/manage/stripe/page.tsx`

- [ ] **Step 1: Write admin dashboard**

Overview: member count, pending requests, upcoming events count, active subscriptions count. Quick links to sub-pages.

- [ ] **Step 2: Write manage members page**

List with pending requests at top. Approve/reject buttons. Change role dropdown. Suspend/kick actions.

- [ ] **Step 3: Write manage events page**

Create event form (title, type, sport, level, location, date/time, recurrence selector, max participants). List of upcoming events with edit/cancel.

- [ ] **Step 4: Write manage plans page**

Founder-only. Create membership plan form (name, price, interval, includes coaching, max sessions). List active plans with toggle.

- [ ] **Step 5: Write settings page**

Edit club info form: name, description, logo upload, banner upload, sports, levels, join mode, address (Google Places).

- [ ] **Step 6: Write Stripe onboarding page**

Reuse pattern from existing coach Stripe onboarding. Create Connect account for club, show onboarding link, auto-refresh status.

- [ ] **Step 7: Verify build + commit**

```bash
git add src/app/(app)/clubs/[slug]/manage/
git commit -m "feat(clubs): pages — admin dashboard (members, events, plans, settings, stripe)"
```

---

### Task 16: Explore Page Integration

**Files:**
- Modify: `src/app/(app)/explore/page.tsx`

- [ ] **Step 1: Add 'clubs' tab to Explore page**

The existing explore page uses a tab type (`'coaches' | 'events'`). Extend to `'coaches' | 'events' | 'clubs'`. Add a third tab button "Clubs". When selected, render a simplified clubs discovery grid using `ClubCard` component. Fetch from `/api/clubs` with same sport/city filters.

- [ ] **Step 2: Verify build + commit**

```bash
git add src/app/(app)/explore/page.tsx
git commit -m "feat(clubs): integrate clubs tab into Explore page"
```

---

### Task 17: Final Build + Deploy

- [ ] **Step 1: Verify full build**

Run: `npx next build`
Expected: Build succeeds with no new errors.

- [ ] **Step 2: Push to deploy**

```bash
git push origin master
```

- [ ] **Step 3: Run migration on production Supabase**

Apply `20260412010000_clubs.sql` via Supabase dashboard SQL editor.

- [ ] **Step 4: Verify on prod**

Open https://pulse-eight-sigma.vercel.app/clubs — confirm discovery page loads. Create a test club. Verify sidebar shows "Mon club" section.
