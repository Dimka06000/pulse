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
