-- Campus Hub: backend migration for Gmail ingestion, relevance and duplicate consolidation.
-- Run AFTER the base schema + seed. Safe to run more than once.

-- Students need a year for relevance matching.
alter table students add column if not exists year int;
update students s set year = v.y
  from users u join (values ('S101',2),('S102',2),('S103',3),('S104',2),('S105',4)) as v(login, y) on u.login_id = v.login
 where s.user_id = u.id and s.year is null;

-- institutional_updates keeps `tag` as the category, and gains structured fields.
alter table institutional_updates
  add column if not exists sender text,
  add column if not exists received_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists audience jsonb not null default '{}'::jsonb,   -- {"departments":[],"years":[],"sections":[],"roles":[]}
  add column if not exists keywords text[] not null default '{}',
  add column if not exists urgent boolean not null default false,
  add column if not exists duplicate_count int not null default 1,
  add column if not exists norm_subject text,
  add column if not exists source text not null default 'manual';

update institutional_updates
   set received_at = coalesce(received_at, created_at), last_seen_at = coalesce(last_seen_at, created_at)
 where received_at is null;

create index if not exists idx_updates_received on institutional_updates (received_at desc);

-- One row per email. message_id is unique, which makes ingestion idempotent.
-- Duplicates are linked to the single consolidated update they were merged into.
create table if not exists update_sources (
  id bigserial primary key,
  update_id bigint not null references institutional_updates(id) on delete cascade,
  message_id text not null unique,
  sender text,
  subject text,
  received_at timestamptz,
  similarity numeric,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_sources_update on update_sources (update_id);

create table if not exists ingest_runs (
  id bigserial primary key,
  source text,
  started_at timestamptz,
  finished_at timestamptz,
  fetched int, created int, merged int, skipped int, failed int,
  status text,
  error text
);

-- Only the backend (service role, which bypasses RLS) touches these two tables.
alter table update_sources enable row level security;
alter table ingest_runs enable row level security;

-- OPTIONAL hardening: the base schema lets any signed-in user read every update directly.
-- Once your frontend reads updates only through GET /api/updates (which applies the relevance
-- rules), remove direct access so students cannot bypass the filter:
--   drop policy if exists "read updates" on institutional_updates;
