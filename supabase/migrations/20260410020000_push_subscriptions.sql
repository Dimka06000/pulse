-- Push notification subscriptions (Web Push API)

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);

create index idx_push_subscriptions_user on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

create policy "push_subscriptions_select" on push_subscriptions
  for select using (user_id = auth.uid());

create policy "push_subscriptions_insert" on push_subscriptions
  for insert with check (user_id = auth.uid());

create policy "push_subscriptions_delete" on push_subscriptions
  for delete using (user_id = auth.uid());
