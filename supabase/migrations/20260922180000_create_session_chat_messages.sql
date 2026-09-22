-- Migration: Real, persisted multi-turn chat for the Session Intelligence panel.
-- Scoped per household (a continuous conversation about one family, visible from any
-- of their sessions), tagged with the session that was active when each message was sent.

create table if not exists public.session_chat_messages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  session_id uuid references public.case_sessions(id) on delete set null,
  sender text not null check (sender in ('admin', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_session_chat_household on public.session_chat_messages(household_id, created_at asc);

alter table public.session_chat_messages enable row level security;

create policy "Admins can view session chat messages"
  on public.session_chat_messages
  for select
  using (public.is_admin());

create policy "Admins can insert session chat messages"
  on public.session_chat_messages
  for insert
  with check (public.is_admin());

create policy "Admins can update session chat messages"
  on public.session_chat_messages
  for update
  using (public.is_admin());

create policy "Admins can delete session chat messages"
  on public.session_chat_messages
  for delete
  using (public.is_admin());
