# Client Interaction — Database Schema (Planned)

All changes go in timestamped migrations under `supabase/migrations/`. Every new table gets RLS enabled with four admin-only policies (`select`, `insert`, `update`, `delete`) using `public.is_admin()`, matching `20260922150000_create_family_client_system.sql`.

Not yet applied. Column names may be adjusted during the stage that builds them; update this file when they are.

---

## `household_members` — persona columns (Stage 1)

```sql
alter table public.household_members
  add column if not exists persona_summary      text,
  add column if not exists temperament_traits   text[] not null default '{}',
  add column if not exists known_triggers       text[] not null default '{}',
  add column if not exists strengths            text[] not null default '{}',
  add column if not exists concern_level        text,   -- options supplied by Mai; free text until then
  add column if not exists family_dynamic_role  text;   -- options supplied by Mai; free text until then
```

The existing `notes` column is kept for backward compatibility; longitudinal notes move to `member_notes`.

## `member_notes` (Stage 1)

```sql
create table if not exists public.member_notes (
  id                  uuid primary key default gen_random_uuid(),
  household_member_id uuid not null references public.household_members(id) on delete cascade,
  session_id          uuid references public.case_sessions(id) on delete set null,
  note_type           text not null default 'observation'
                        check (note_type in ('observation', 'concern', 'progress', 'follow_up')),
  body                text not null,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.member_notes (household_member_id, created_at desc);
```

## `member_action_items` (Stage 1)

```sql
create table if not exists public.member_action_items (
  id                  uuid primary key default gen_random_uuid(),
  household_member_id uuid not null references public.household_members(id) on delete cascade,
  session_id          uuid references public.case_sessions(id) on delete set null,
  task                text not null,
  status              text not null default 'open'
                        check (status in ('suggested', 'open', 'done', 'dropped')),
  priority            text not null default 'normal' check (priority in ('normal', 'high')),
  due_date            date,
  source              text not null default 'coach' check (source in ('coach', 'ai')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index on public.member_action_items (household_member_id, status);
```

AI-extracted items are inserted with `source = 'ai'`, `status = 'suggested'`; Mai accepts (`open`) or drops them.

## `case_sessions` — recording link (Stage 3)

```sql
alter table public.case_sessions
  add column if not exists drive_web_view_url text;
```

That's all. The transcript itself lives in `session_content` (below); "has a transcript" = a `live_transcript` row exists.

## Consent

No consent columns. Recording consent is collected off-platform by Mai's assistant (see decisions.md §3). `bookings` is not changed by this feature.

## Transcript storage

No new table. Transcripts are stored in `session_content` with `content_type = 'live_transcript'`, JSON body per [decisions.md §5](file:///d:/Cursor/Mai_Website/project-plan/client-interaction/decisions.md).
