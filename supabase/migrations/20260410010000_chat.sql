-- Chat: conversations & messages between coaches and athletes

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coach_profiles(id) on delete cascade,
  athlete_id uuid not null references profiles(id) on delete cascade,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (coach_id, athlete_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) > 0 and char_length(content) <= 5000),
  read_at timestamptz,
  created_at timestamptz default now()
);

-- Indexes
create index idx_conversations_coach on conversations(coach_id);
create index idx_conversations_athlete on conversations(athlete_id);
create index idx_conversations_last_msg on conversations(last_message_at desc);
create index idx_messages_conversation on messages(conversation_id, created_at desc);
create index idx_messages_sender on messages(sender_id);
create index idx_messages_unread on messages(conversation_id, read_at) where read_at is null;

-- RLS
alter table conversations enable row level security;
alter table messages enable row level security;

-- Conversations: only participants can see/create
create policy "conversations_select" on conversations
  for select using (
    athlete_id = auth.uid()
    or coach_id in (select id from coach_profiles where user_id = auth.uid())
  );

create policy "conversations_insert" on conversations
  for insert with check (
    athlete_id = auth.uid()
    or coach_id in (select id from coach_profiles where user_id = auth.uid())
  );

-- Messages: only conversation participants can read/write
create policy "messages_select" on messages
  for select using (
    conversation_id in (
      select id from conversations
      where athlete_id = auth.uid()
         or coach_id in (select id from coach_profiles where user_id = auth.uid())
    )
  );

create policy "messages_insert" on messages
  for insert with check (
    sender_id = auth.uid()
    and conversation_id in (
      select id from conversations
      where athlete_id = auth.uid()
         or coach_id in (select id from coach_profiles where user_id = auth.uid())
    )
  );

create policy "messages_update" on messages
  for update using (
    -- Only recipient can mark as read
    sender_id != auth.uid()
    and conversation_id in (
      select id from conversations
      where athlete_id = auth.uid()
         or coach_id in (select id from coach_profiles where user_id = auth.uid())
    )
  );

-- Enable Realtime on messages table
alter publication supabase_realtime add table messages;
