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
