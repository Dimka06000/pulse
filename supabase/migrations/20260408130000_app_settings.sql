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
