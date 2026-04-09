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
