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
