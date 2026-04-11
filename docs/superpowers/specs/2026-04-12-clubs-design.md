# Clubs — Phase 1 Design Spec

## Overview

Clubs are branded sports organizations within Pulse where multiple coaches associate to manage coaching, events, and community for their members. A club has its own identity (logo, banner, sports, location), governance (founder + coach admins + coaches + captains + members), configurable join mode, and optional paid membership via Stripe Connect transfers.

## Scope — Phase 1

Phase 1 delivers the core club infrastructure:
- Club creation, identity, and public page
- Role-based governance (founder, coach_admin, coach, captain, member)
- Configurable join modes (open / approval / invite)
- Member directory
- Club activity feed (reuses existing feed_posts with club_id filter + new activity_type)
- Official announcements with push notifications
- Club events with recurrence (RRULE) and RSVP
- Club coaching sessions (coaches propose slots to members)
- Membership plans with Stripe Connect transfers
- Club discovery integrated into Explore page

### Out of scope (Phase 2+)
- Group chat, challenges, leaderboard, badges (Phase 2)
- Multi-site, photo gallery, external events, training programs, seasonal planning, exercise library, club stats, club reviews (Phase 3)

## Data Model

### New tables

**clubs**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | text NOT NULL | "CrossFit Lyon" |
| slug | text UNIQUE NOT NULL | URL-friendly: "crossfit-lyon", auto-generated from name |
| description | text | |
| logo_url | text | |
| banner_url | text | |
| sports | text[] | ['running', 'trail'] |
| levels | text[] | ['débutant', 'intermédiaire', 'avancé'] |
| city | text | |
| postal_code | text | |
| lat | float | |
| lng | float | |
| address | text | Google Places autocomplete |
| join_mode | text | CHECK ('open', 'approval', 'invite') |
| stripe_account_id | text | Stripe Connect account for the club (nullable if free) |
| is_active | boolean | DEFAULT true |
| founded_at | timestamptz | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Indexes: slug (unique), sports (GIN), city, (lat, lng).

**club_members**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| club_id | uuid FK → clubs | |
| user_id | uuid FK → profiles | |
| role | text | CHECK ('founder', 'coach_admin', 'coach', 'captain', 'member') |
| status | text | CHECK ('active', 'pending', 'suspended', 'left') |
| joined_at | timestamptz | |

Constraints: UNIQUE (club_id, user_id). Indexes: club_id, user_id.

**club_membership_plans**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| club_id | uuid FK → clubs | |
| name | text | "Gratuit", "Premium", "Annuel" |
| description | text | |
| price_cents | integer | 0 = free |
| interval | text | CHECK ('month', 'year', 'once') |
| includes_coaching | boolean | Access to club coaching sessions |
| max_sessions_per_month | integer | null = unlimited |
| stripe_price_id | text | null for free plans, recurring Price for month/year, one-time Price for once |
| is_active | boolean | DEFAULT true |
| sort_order | integer | |

**club_subscriptions**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| club_id | uuid FK → clubs | Denormalized for fast lookups |
| user_id | uuid FK → profiles | Denormalized for fast lookups |
| club_member_id | uuid FK → club_members | |
| plan_id | uuid FK → club_membership_plans | |
| stripe_subscription_id | text | null for one-time plans |
| stripe_checkout_session_id | text | For idempotency |
| status | text | CHECK ('active', 'cancelled', 'past_due', 'lifetime') |
| current_period_end | timestamptz | null for lifetime (once) plans |
| created_at | timestamptz | |

Indexes: (club_id, user_id), stripe_subscription_id.

Note: `status = 'lifetime'` is used for one-time payment plans (interval = 'once'). These have no `stripe_subscription_id` and no `current_period_end`.

**club_events**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| club_id | uuid FK → clubs | |
| title | text | |
| description | text | |
| event_type | text | CHECK ('training', 'competition', 'social', 'workshop') |
| sport | text | |
| level | text | |
| location | text | |
| lat | float | |
| lng | float | |
| starts_at | timestamptz | |
| ends_at | timestamptz | |
| max_participants | integer | |
| is_members_only | boolean | DEFAULT true |
| created_by | uuid FK → profiles | |
| recurrence_rule | text | null = one-shot, otherwise RRULE (RFC 5545) |
| recurrence_parent_id | uuid FK → club_events | null if parent or non-recurring |
| status | text | CHECK ('upcoming', 'cancelled', 'completed') |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Indexes: club_id, starts_at, recurrence_parent_id.

**club_event_participants**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK → club_events | |
| user_id | uuid FK → profiles | |
| status | text | CHECK ('registered', 'attended', 'no_show', 'cancelled') |
| registered_at | timestamptz | |

Constraints: UNIQUE (event_id, user_id).

**club_announcements**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| club_id | uuid FK → clubs | |
| author_id | uuid FK → profiles | |
| title | text | |
| body | text | |
| is_pinned | boolean | DEFAULT false |
| notify_members | boolean | DEFAULT true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### Modified tables

**feed_posts** — two changes:
1. Add nullable `club_id` (uuid FK → clubs). When set, post appears in the club feed. When null, post appears in the global feed (existing behavior).
2. ALTER the `activity_type` CHECK constraint to add `'club_post'` value. Migration: `ALTER TABLE feed_posts DROP CONSTRAINT feed_posts_activity_type_check; ALTER TABLE feed_posts ADD CONSTRAINT feed_posts_activity_type_check CHECK (activity_type IN ('solo_session', 'booking', 'synced', 'goal_completed', 'record', 'streak', 'club_post'));`

**payments** — ALTER the `payment_type` CHECK constraint to add `'club_membership'` value. Migration: `ALTER TABLE payments DROP CONSTRAINT payments_payment_type_check; ALTER TABLE payments ADD CONSTRAINT payments_payment_type_check CHECK (payment_type IN ('one_time', 'subscription', 'manual', 'club_membership'));`

## Pages

All club pages use `[slug]` in the URL for SEO-friendly public URLs.

```
app/(app)/clubs/
  ├── page.tsx                    — Discovery: list + search + map
  ├── create/
  │   └── page.tsx                — Create club (coaches only)
  └── [slug]/
      ├── page.tsx                — Public club page (storefront)
      ├── feed/
      │   └── page.tsx            — Activity feed (members only)
      ├── events/
      │   └── page.tsx            — Club events calendar
      ├── members/
      │   └── page.tsx            — Member directory
      ├── sessions/
      │   └── page.tsx            — Available coaching sessions
      ├── announcements/
      │   └── page.tsx            — Announcements (members only)
      ├── join/
      │   └── page.tsx            — Join + select membership plan
      └── manage/
          ├── page.tsx            — Admin dashboard
          ├── members/
          │   └── page.tsx        — Manage members (approve/reject/roles)
          ├── events/
          │   └── page.tsx        — Create/edit events
          ├── plans/
          │   └── page.tsx        — Manage membership plans
          ├── settings/
          │   └── page.tsx        — Club settings
          └── stripe/
              └── page.tsx        — Stripe onboarding for club
```

## API Endpoints

All API routes use the club `id` (UUID) for consistency with existing API patterns. Pages resolve slug → id via a single query on first load (cached in Zustand store).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/clubs | public | List + search clubs (sport, city, filters) |
| POST | /api/clubs | coach | Create a club |
| GET | /api/clubs/[id] | public | Club detail (also accepts ?slug=xxx) |
| PATCH | /api/clubs/[id] | admin+ | Update club info |
| GET | /api/clubs/[id]/members | member+ | List members |
| POST | /api/clubs/[id]/members | auth | Join / request to join |
| PATCH | /api/clubs/[id]/members/[uid] | admin+ | Change role / approve / suspend |
| DELETE | /api/clubs/[id]/members/[uid] | self or admin+ | Leave / kick |
| GET | /api/clubs/[id]/events | member+ | Club events |
| POST | /api/clubs/[id]/events | coach+ | Create event (+ generate occurrences if recurring) |
| PATCH | /api/clubs/[id]/events/[eid] | coach+ | Edit event |
| POST | /api/clubs/[id]/events/[eid]/register | member+ | RSVP |
| DELETE | /api/clubs/[id]/events/[eid]/register | member+ | Cancel RSVP |
| GET | /api/clubs/[id]/announcements | member+ | List announcements |
| POST | /api/clubs/[id]/announcements | coach+ | Post announcement |
| GET | /api/clubs/[id]/feed | member+ | Club-scoped feed |
| POST | /api/clubs/[id]/feed | member+ | Post to club feed |
| GET | /api/clubs/[id]/plans | public | List membership plans |
| POST | /api/clubs/[id]/plans | founder | Create plan |
| POST | /api/clubs/[id]/subscribe | auth | Subscribe to plan (Stripe checkout) |
| GET | /api/clubs/[id]/sessions | member+ | Coaching sessions for club members |

## Sidebar Navigation

**Section "Explorer"** — add:
- 🏟️ Clubs → /clubs

**New section "Mon club"** (visible if user is active member of ≥1 club):

If user belongs to exactly 1 club, links go directly to that club. If multiple clubs, a dropdown selector appears at the top of the section. The selected club slug is stored in the Zustand clubs store (`activeClubSlug`), persisted to localStorage. Defaults to the most recently joined club.

- 🏠 Mon club → /clubs/[slug]
- 📰 Fil → /clubs/[slug]/feed
- 📅 Événements → /clubs/[slug]/events
- 👥 Membres → /clubs/[slug]/members
- 📢 Annonces → /clubs/[slug]/announcements

**Section "Espace coach"** — add (if coach_admin or founder):
- ⚙️ Gérer mon club → /clubs/[slug]/manage

## Permissions Matrix

| Action | Visitor | Member | Captain | Coach | Coach Admin | Founder |
|--------|---------|--------|---------|-------|-------------|---------|
| View public page | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View feed / announcements | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Post in feed | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| RSVP to events | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create event | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Post announcement | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Approve members | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage roles | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Edit club settings | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage Stripe / plans | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Delete club | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

## RLS Policies

All club tables have RLS enabled. Core helper pattern used in policies:

```sql
-- Helper: check if current user is an active member of a club with minimum role
CREATE OR REPLACE FUNCTION public.is_club_member(p_club_id uuid, p_min_role text DEFAULT 'member')
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.club_members
    WHERE club_id = p_club_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = ANY(
        CASE p_min_role
          WHEN 'member' THEN ARRAY['founder', 'coach_admin', 'coach', 'captain', 'member']
          WHEN 'captain' THEN ARRAY['founder', 'coach_admin', 'coach', 'captain']
          WHEN 'coach' THEN ARRAY['founder', 'coach_admin', 'coach']
          WHEN 'coach_admin' THEN ARRAY['founder', 'coach_admin']
          WHEN 'founder' THEN ARRAY['founder']
        END
      )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

**clubs**: SELECT for all (public page). INSERT/UPDATE/DELETE via `is_club_member(id, 'coach_admin')`.

**club_members**: SELECT for active members of the same club. INSERT for authenticated users (join). UPDATE/DELETE via `is_club_member(club_id, 'coach_admin')` or own row.

**club_events, club_announcements**: SELECT via `is_club_member(club_id, 'member')`. INSERT/UPDATE via `is_club_member(club_id, 'coach')`.

**club_event_participants**: SELECT via `is_club_member((SELECT club_id FROM club_events WHERE id = event_id), 'member')`. INSERT for own row via same subquery check. Note: `club_event_participants` has no direct `club_id` column — RLS policies must use a subquery through `club_events` to resolve the club.

**club_membership_plans**: SELECT for all (public). INSERT/UPDATE/DELETE via `is_club_member(club_id, 'founder')`.

**club_subscriptions**: SELECT for own rows (`user_id = auth.uid()`). INSERT/UPDATE via admin client only (webhook handler).

**feed_posts** (modified): existing policies unchanged. Add: SELECT where `club_id IS NOT NULL` requires `is_club_member(club_id, 'member')`. INSERT with `club_id` requires `is_club_member(club_id, 'member')`.

## Stripe Integration

Clubs use Stripe Connect with transfers (option C), consistent with the existing marketplace model.

### Onboarding
Club founder onboards a Stripe Connect Custom account for the club (separate from personal coach account). Reuses existing Stripe onboarding page pattern (`/clubs/[slug]/manage/stripe`).

### Checkout flows

**Recurring plans (month/year):**
- `POST /api/clubs/[id]/subscribe` creates a Stripe Checkout Session with `mode: 'subscription'`
- Metadata: `{ user_id, club_id, plan_id, club_member_id, payment_type: 'club_membership' }`
- `stripe_price_id` from `club_membership_plans` used as the line item
- `transfer_data.destination` set to club's `stripe_account_id`
- `application_fee_percent: 5` for platform fee

**One-time plans (once):**
- `POST /api/clubs/[id]/subscribe` creates a Stripe Checkout Session with `mode: 'payment'`
- Same metadata fields
- `stripe_price_id` from `club_membership_plans` (one-time Stripe Price)
- On success, creates `club_subscriptions` with `status: 'lifetime'`, no `stripe_subscription_id`, no `current_period_end`

### Webhook handling

Extend `handleCheckoutCompleted` in `src/lib/stripe/webhooks.ts`:

**CRITICAL: The existing early-exit guard must be restructured.** Currently the function exits if `!coach_id`, which will always be true for club checkouts. The guard must be split by `payment_type`:

```
1. Extract metadata: { user_id, club_id, coach_id, plan_id, club_member_id, payment_type }
2. Branch on payment_type BEFORE the guard:
   a. If payment_type === 'club_membership':
      - Guard: require user_id AND club_id (exit if missing)
      - Create payment record with payment_type: 'club_membership'
      - Look up plan interval from club_membership_plans
      - If interval is 'once': create club_subscriptions with status 'lifetime'
      - If interval is 'month'/'year': create club_subscriptions with stripe_subscription_id
   b. Else (existing flow):
      - Guard: require user_id AND coach_id (exit if missing)
      - Existing coach payment logic (unchanged)
```

Extend `handleSubscriptionUpdated` and `handleSubscriptionDeleted`:

```
1. Try existing subscriptions table lookup first with .select() to get the result
2. Check if rows were matched (data !== null)
3. If 0 rows matched, try club_subscriptions by stripe_subscription_id
4. Update status accordingly
```

### Checkout session creation

The `/api/clubs/[id]/subscribe` route calls `stripe.checkout.sessions.create()` directly (does NOT reuse `createCheckoutSession` from `src/lib/stripe/checkout.ts`, which has coach-specific logic). This avoids coupling club checkout to the existing coach flow:

```ts
// Recurring plans (month/year)
stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
  subscription_data: { transfer_data: { destination: club.stripe_account_id }, application_fee_percent: 5 },
  metadata: { user_id, club_id, plan_id, club_member_id, payment_type: 'club_membership' },
  success_url, cancel_url,
})

// One-time plans (once)
stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
  payment_intent_data: { transfer_data: { destination: club.stripe_account_id }, application_fee_amount: Math.round(plan.price_cents * 0.05) },
  metadata: { user_id, club_id, plan_id, club_member_id, payment_type: 'club_membership' },
  success_url, cancel_url,
})
```

## Recurrence Model

Club events use RRULE (RFC 5545) for recurrence. Use the `rrule` npm package for parsing and occurrence generation.

### How it works:
1. **On event creation** with `recurrence_rule`: the API route immediately generates occurrences for the next **8 weeks** as individual `club_events` rows with `recurrence_parent_id` set to the parent event's id
2. **Cron job** (`/api/cron/club-events`): runs daily, generates occurrences for all recurring events that don't have occurrences past 4 weeks from now (rolling window). This ensures there are always 4-8 weeks of future occurrences visible. The endpoint must be guarded with `CRON_SECRET` bearer token (same pattern as `/api/cron/reminders` and `/api/cron/digest`) and registered in `vercel.json` under the `crons` array: `{ "path": "/api/cron/club-events", "schedule": "0 3 * * *" }` (daily at 3 AM UTC).
3. **Editing a single occurrence**: updates only that row (detaches from parent pattern)
4. **Editing parent + "all future"**: updates the parent's RRULE, deletes all future occurrences (`starts_at >= now()` AND `recurrence_parent_id = parent_id` AND no participants registered), regenerates for 8 weeks
5. **Deleting a recurring event**: cancel parent + all future unpopulated occurrences

### Events page display:
The events page queries `club_events` with `starts_at >= now()` ordered by date. Recurring occurrences are already materialized rows, so no client-side RRULE parsing needed. The page shows a simple chronological list/calendar.

## Sidebar Multi-Club Selector

Users can be members of multiple clubs. The Zustand clubs store tracks:
- `myClubs`: list of clubs the user belongs to (fetched on auth)
- `activeClubSlug`: the currently selected club (persisted to localStorage)

If `myClubs.length === 1`, the sidebar links directly. If `> 1`, a compact dropdown appears above the "Mon club" section links. Selecting a different club updates `activeClubSlug` and all section links.

## Key Patterns

- Follow existing API patterns: `getSupabaseServerClient()` for auth, `getSupabaseAdminClient()` for privileged ops
- RLS policies on all club tables (see RLS section above)
- Zustand store for club state (`src/stores/clubs.ts`)
- Components in `src/components/clubs/`
- Reuse existing components: Button, Input, Select, Badge, EmptyState, Google Places autocomplete
- Slug generation: `name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')` with uniqueness check (append -2, -3 if taken)
- UI labels in French, code in English
