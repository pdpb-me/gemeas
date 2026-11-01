-- The chat with the coach. The server function gemeas-coach-chat writes these tables; the app
-- only reads what it shows. A person has the chat only with an enabled row in coach_profiles:
-- logins are shared with other apps in this project.

create table gemeas.coach_profiles (
  user_id          uuid primary key default auth.uid() references auth.users on delete cascade,
  enabled          boolean not null default false,
  daily_limit      integer not null default 20 check (daily_limit between 0 and 200), -- messages in 24 hours
  instructions     text not null default '', -- private: who this person is, for the coach
  reply_started_at timestamptz, -- a reply is running: only one at a time
  created_at       timestamptz not null default now()
);

-- One conversation. A new one starts after a long pause, or when the coach's instructions,
-- tools or model change (fingerprint): the API needs what came before to stay exactly as it was.
create table gemeas.chat_threads (
  id          uuid primary key default gen_random_uuid(),
  fingerprint text not null,
  closed      boolean not null default false, -- something went wrong: the next message starts anew
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  created_at  timestamptz not null default now()
);

-- Every turn sent to the API. `content` is `json`, not `jsonb`, so it goes back exactly as it came.
-- `text` is what the app shows: empty for the coach's look-ups and for a message that failed.
create table gemeas.chat_messages (
  id                 uuid primary key default gen_random_uuid(),
  seq                bigint generated always as identity,
  thread_id          uuid not null references gemeas.chat_threads on delete cascade,
  role               text not null check (role in ('user', 'assistant')),
  text               text,
  content            json not null,
  model              text,
  input_tokens       integer,
  output_tokens      integer,
  cache_read_tokens  integer,
  cache_write_tokens integer,
  user_id            uuid not null default auth.uid() references auth.users on delete cascade,
  created_at         timestamptz not null default now()
);

create index on gemeas.chat_threads (user_id, created_at);
create index on gemeas.chat_messages (thread_id, seq);
create index on gemeas.chat_messages (user_id, seq);

-- Security: RLS on, own rows only, and only these columns can be read from the app
do $$
declare
  t text;
begin
  foreach t in array array['coach_profiles', 'chat_threads', 'chat_messages']
  loop
    execute format('alter table gemeas.%I enable row level security', t);
    execute format('revoke all on gemeas.%I from public, anon, authenticated', t);
    execute format(
      'create policy "Own rows only" on gemeas.%I for select to authenticated
         using (user_id = (select auth.uid()))',
      t
    );
    execute format('grant select, insert, update on gemeas.%I to service_role', t);
  end loop;
end
$$;

grant select (user_id, enabled, daily_limit) on gemeas.coach_profiles to authenticated;
grant select (id, seq, role, text, user_id, created_at) on gemeas.chat_messages to authenticated;
