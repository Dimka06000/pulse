-- 014: Row Level Security
alter table public.profiles enable row level security;
alter table public.coach_profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.ratings enable row level security;
alter table public.user_credits enable row level security;
alter table public.payments enable row level security;
alter table public.nutrition_plans enable row level security;
alter table public.session_reports enable row level security;

create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Anyone reads coach profiles" on public.coach_profiles for select using (true);
create policy "Coach updates own profile" on public.coach_profiles for update using (auth.uid() = user_id);
create policy "Coach inserts own profile" on public.coach_profiles for insert with check (auth.uid() = user_id);

create policy "Athlete sees own bookings" on public.bookings for select
  using (auth.uid() = athlete_id);
create policy "Coach sees own bookings" on public.bookings for select
  using (auth.uid() = (select user_id from public.coach_profiles where id = coach_id));

create policy "Anyone reads ratings" on public.ratings for select using (true);
create policy "Athlete creates rating" on public.ratings for insert
  with check (auth.uid() = athlete_id);

create policy "User sees own credits" on public.user_credits for select using (auth.uid() = user_id);

create policy "User sees own payments" on public.payments for select using (auth.uid() = user_id);

create policy "User sees own nutrition" on public.nutrition_plans for select using (auth.uid() = user_id);
create policy "Coach sees assigned nutrition" on public.nutrition_plans for select
  using (auth.uid() = (select user_id from public.coach_profiles where id = coach_id));

create policy "Coach reads session reports" on public.session_reports for select
  using (auth.uid() = (select cp.user_id from public.coach_profiles cp join public.bookings b on b.coach_id = cp.id where b.id = booking_id));
create policy "Coach creates session reports" on public.session_reports for insert
  with check (auth.uid() = (select cp.user_id from public.coach_profiles cp join public.bookings b on b.coach_id = cp.id where b.id = booking_id));
