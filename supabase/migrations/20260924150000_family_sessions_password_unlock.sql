-- Migration: Family Sessions Shared Password Unlock & Brute-Force Protection
-- Tables: family_unlocks, family_unlock_attempts
-- Function: has_family_unlock()
-- RLS update: case_sessions, session_attendees, session_content, member_notes, member_action_items, session_chat_messages

-- 1. Family Unlocks Table (Service role only writes & reads)
create table if not exists public.family_unlocks (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_family_unlocks_admin_expires
  on public.family_unlocks (admin_id, expires_at desc);

alter table public.family_unlocks enable row level security;
-- No client policies created: only service role can access family_unlocks.

-- 2. Family Unlock Attempts Table (Service role only writes & reads)
create table if not exists public.family_unlock_attempts (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete cascade,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_family_unlock_attempts_admin_created
  on public.family_unlock_attempts (admin_id, created_at desc);

alter table public.family_unlock_attempts enable row level security;
-- No client policies created: only service role can access family_unlock_attempts.

-- 3. SQL function has_family_unlock()
-- Security definer so it can check unexpired rows in family_unlocks for auth.uid()
create or replace function public.has_family_unlock()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.family_unlocks
    where admin_id = auth.uid()
      and expires_at > now()
  );
end;
$$;

grant execute on function public.has_family_unlock() to authenticated;
grant execute on function public.has_family_unlock() to anon;

-- 4. Update RLS policies on session-content tables to require is_admin() AND has_family_unlock()
-- (households and household_members remain admin-only)

-- 4a. case_sessions
drop policy if exists "Admins can view case sessions" on public.case_sessions;
drop policy if exists "Admins can insert case sessions" on public.case_sessions;
drop policy if exists "Admins can update case sessions" on public.case_sessions;
drop policy if exists "Admins can delete case sessions" on public.case_sessions;

create policy "Admins can view case sessions"
  on public.case_sessions
  for select
  using (public.is_admin() and public.has_family_unlock());

create policy "Admins can insert case sessions"
  on public.case_sessions
  for insert
  with check (public.is_admin() and public.has_family_unlock());

create policy "Admins can update case sessions"
  on public.case_sessions
  for update
  using (public.is_admin() and public.has_family_unlock());

create policy "Admins can delete case sessions"
  on public.case_sessions
  for delete
  using (public.is_admin() and public.has_family_unlock());

-- 4b. session_attendees
drop policy if exists "Admins can view session attendees" on public.session_attendees;
drop policy if exists "Admins can insert session attendees" on public.session_attendees;
drop policy if exists "Admins can update session attendees" on public.session_attendees;
drop policy if exists "Admins can delete session attendees" on public.session_attendees;

create policy "Admins can view session attendees"
  on public.session_attendees
  for select
  using (public.is_admin() and public.has_family_unlock());

create policy "Admins can insert session attendees"
  on public.session_attendees
  for insert
  with check (public.is_admin() and public.has_family_unlock());

create policy "Admins can update session attendees"
  on public.session_attendees
  for update
  using (public.is_admin() and public.has_family_unlock());

create policy "Admins can delete session attendees"
  on public.session_attendees
  for delete
  using (public.is_admin() and public.has_family_unlock());

-- 4c. session_content
drop policy if exists "Admins can view session content" on public.session_content;
drop policy if exists "Admins can insert session content" on public.session_content;
drop policy if exists "Admins can update session content" on public.session_content;
drop policy if exists "Admins can delete session content" on public.session_content;

create policy "Admins can view session content"
  on public.session_content
  for select
  using (public.is_admin() and public.has_family_unlock());

create policy "Admins can insert session content"
  on public.session_content
  for insert
  with check (public.is_admin() and public.has_family_unlock());

create policy "Admins can update session content"
  on public.session_content
  for update
  using (public.is_admin() and public.has_family_unlock());

create policy "Admins can delete session content"
  on public.session_content
  for delete
  using (public.is_admin() and public.has_family_unlock());

-- 4d. member_notes
drop policy if exists "Admins can view member notes" on public.member_notes;
drop policy if exists "Admins can insert member notes" on public.member_notes;
drop policy if exists "Admins can update member notes" on public.member_notes;
drop policy if exists "Admins can delete member notes" on public.member_notes;

create policy "Admins can view member notes"
  on public.member_notes
  for select
  using (public.is_admin() and public.has_family_unlock());

create policy "Admins can insert member notes"
  on public.member_notes
  for insert
  with check (public.is_admin() and public.has_family_unlock());

create policy "Admins can update member notes"
  on public.member_notes
  for update
  using (public.is_admin() and public.has_family_unlock());

create policy "Admins can delete member notes"
  on public.member_notes
  for delete
  using (public.is_admin() and public.has_family_unlock());

-- 4e. member_action_items
drop policy if exists "Admins can view member action items" on public.member_action_items;
drop policy if exists "Admins can insert member action items" on public.member_action_items;
drop policy if exists "Admins can update member action items" on public.member_action_items;
drop policy if exists "Admins can delete member action items" on public.member_action_items;

create policy "Admins can view member action items"
  on public.member_action_items
  for select
  using (public.is_admin() and public.has_family_unlock());

create policy "Admins can insert member action items"
  on public.member_action_items
  for insert
  with check (public.is_admin() and public.has_family_unlock());

create policy "Admins can update member action items"
  on public.member_action_items
  for update
  using (public.is_admin() and public.has_family_unlock());

create policy "Admins can delete member action items"
  on public.member_action_items
  for delete
  using (public.is_admin() and public.has_family_unlock());

-- 4f. session_chat_messages
drop policy if exists "Admins can view session chat messages" on public.session_chat_messages;
drop policy if exists "Admins can insert session chat messages" on public.session_chat_messages;
drop policy if exists "Admins can update session chat messages" on public.session_chat_messages;
drop policy if exists "Admins can delete session chat messages" on public.session_chat_messages;

create policy "Admins can view session chat messages"
  on public.session_chat_messages
  for select
  using (public.is_admin() and public.has_family_unlock());

create policy "Admins can insert session chat messages"
  on public.session_chat_messages
  for insert
  with check (public.is_admin() and public.has_family_unlock());

create policy "Admins can update session chat messages"
  on public.session_chat_messages
  for update
  using (public.is_admin() and public.has_family_unlock());

create policy "Admins can delete session chat messages"
  on public.session_chat_messages
  for delete
  using (public.is_admin() and public.has_family_unlock());
