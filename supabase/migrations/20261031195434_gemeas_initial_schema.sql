-- Gemeas: initial schema. It lives next to other apps in one Supabase project, so every
-- statement names `gemeas.` and nothing here touches another schema.
--
-- Every table has user_id, filled in automatically from the logged-in user. Row Level
-- Security (RLS) is on everywhere: a logged-in user can only see and change their own rows,
-- and anonymous visitors can't see anything. Free-text columns (kind, body_area, sport, test)
-- are left open, so new kinds mean new rows, not new tables.

create schema gemeas;
revoke all on schema gemeas from public, anon;
grant usage on schema gemeas to authenticated;

-- Video library. One row per person and video, so two people can keep the same video.
create table gemeas.videos (
  yt_id        text not null,
  title        text not null,
  published_at timestamptz,
  duration_s   integer check (duration_s >= 0),
  views        bigint check (views >= 0),
  playlists    text[] not null default '{}',
  tags         text[] not null default '{}',
  notes        text,
  flags        text,
  available    boolean not null default true,
  synced_at    timestamptz,
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, yt_id)
);

-- What's planned, per day and slot. position orders a pill before or after a workout.
-- exercises holds slugs from src/exercises/catalog.ts; an unknown slug shows nothing.
create table gemeas.plan_sessions (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  slot         text not null check (slot in ('am', 'pm')),
  position     integer not null default 0,
  kind         text not null, -- trainer | strength | mobility | foot | pill | test | ...
  title        text not null,
  video_ids    text[] not null default '{}',
  exercises    text[] not null default '{}',
  instructions text,
  block        text,
  user_id      uuid not null default auth.uid() references auth.users on delete cascade,
  created_at   timestamptz not null default now()
);

-- What actually happened: one log per planned session (logging again updates it)
create table gemeas.session_logs (
  id              uuid primary key default gen_random_uuid(),
  plan_session_id uuid not null unique references gemeas.plan_sessions on delete cascade,
  status          text not null check (status in ('done', 'partial', 'skipped')),
  effort          text check (effort in ('light', 'medium', 'hard')),
  comment         text,
  logged_at       timestamptz not null default now(),
  user_id         uuid not null default auth.uid() references auth.users on delete cascade
);

-- Scores by body area. The app records 5 levels: 0, 2, 5, 8, 10.
create table gemeas.symptoms (
  id             uuid primary key default gen_random_uuid(),
  date           date not null default current_date,
  body_area      text not null,
  side           text check (side in ('L', 'R', 'C')),
  score          smallint not null check (score between 0 and 10),
  timing         text not null default 'general' check (timing in ('during', 'next_morning', 'general')),
  context        text,
  session_log_id uuid references gemeas.session_logs on delete cascade,
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  created_at     timestamptz not null default now(),
  -- a NULL session_log_id (a morning check-in) never conflicts here
  constraint symptoms_one_per_log_area_timing unique (session_log_id, body_area, timing)
);

-- Check-ins (no session) hold one answer per day, body area and timing
create unique index symptoms_one_per_day_area_timing
  on gemeas.symptoms (user_id, date, body_area, timing)
  where session_log_id is null;

-- Walks and other activities. external_id: the id at the source, so a re-sync updates.
create table gemeas.activities (
  id              uuid primary key default gen_random_uuid(),
  date            date not null default current_date,
  sport           text not null,
  duration_s      integer check (duration_s >= 0),
  distance_m      integer check (distance_m >= 0),
  hr_avg          smallint check (hr_avg between 20 and 250),
  elevation_m     integer,
  load            numeric check (load >= 0),
  source          text not null default 'manual' check (source in ('manual', 'intervals')),
  external_id     text,
  raw             jsonb,
  notes           text,
  plan_session_id uuid unique references gemeas.plan_sessions on delete set null,
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  created_at      timestamptz not null default now(),
  unique (user_id, external_id)
);

-- Test results. One value per session, test and side, so a correction overwrites.
create table gemeas.tests (
  id              uuid primary key default gen_random_uuid(),
  date            date not null default current_date,
  test            text not null,
  side            text check (side in ('L', 'R', 'C')),
  value           numeric not null,
  unit            text,
  notes           text,
  plan_session_id uuid references gemeas.plan_sessions on delete cascade,
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  created_at      timestamptz not null default now(),
  constraint tests_session_test_side unique (plan_session_id, test, side)
);

-- The coach's weekly note
create table gemeas.reviews (
  id         uuid primary key default gen_random_uuid(),
  week_start date not null,
  summary    text,
  decisions  text,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- Body weight: one value per day, so re-entering corrects it
create table gemeas.weights (
  id         uuid primary key default gen_random_uuid(),
  date       date not null default current_date,
  kg         numeric(5, 2) not null check (kg between 30 and 250),
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

-- Indexes for the common lookups ("this user's rows for this date range")
create index on gemeas.plan_sessions (user_id, date);
create index on gemeas.session_logs (user_id);
create index on gemeas.symptoms (user_id, date);
create index on gemeas.activities (user_id, date);
create index on gemeas.tests (user_id, date);

-- Security: RLS on, one "own rows only" policy per table, and no access for anonymous visitors
do $$
declare
  t text;
begin
  foreach t in array array['videos', 'plan_sessions', 'session_logs', 'symptoms', 'activities', 'tests', 'reviews', 'weights']
  loop
    execute format('alter table gemeas.%I enable row level security', t);
    execute format('revoke all on gemeas.%I from public, anon', t);
    execute format('grant select, insert, update, delete on gemeas.%I to authenticated', t);
    execute format(
      'create policy "Own rows only" on gemeas.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t
    );
  end loop;
end
$$;
