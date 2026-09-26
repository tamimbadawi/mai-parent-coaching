-- Server-only store for the coach's Google Calendar refresh token.
-- RLS on with NO policies: only the service role (Edge Functions) can read or write.
create table if not exists public.google_calendar_tokens (
  id text primary key default 'coach' check (id = 'coach'),
  refresh_token text not null,
  google_email text not null,
  updated_at timestamptz not null default now()
);
alter table public.google_calendar_tokens enable row level security;
