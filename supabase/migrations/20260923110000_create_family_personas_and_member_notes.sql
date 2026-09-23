-- Migration: Create Family Personas, Member Notes & Member Action Items
-- Extends household_members with psychological persona attributes.
-- Adds member_notes for longitudinal observations over time.
-- Adds member_action_items for per-member commitments ("What is required from him/her").
-- Security: Admin-only RLS via public.is_admin().

-- 1. Extend household_members with structured persona columns
alter table public.household_members
  add column if not exists persona_summary text,
  add column if not exists temperament_traits text[] not null default '{}',
  add column if not exists known_triggers text[] not null default '{}',
  add column if not exists strengths text[] not null default '{}',
  add column if not exists concern_level text,
  add column if not exists family_dynamic_role text;

-- 2. Member Notes (dated, longitudinal observations per member)
create table if not exists public.member_notes (
  id uuid primary key default gen_random_uuid(),
  household_member_id uuid not null references public.household_members(id) on delete cascade,
  session_id uuid references public.case_sessions(id) on delete set null,
  note_type text not null default 'observation'
    check (note_type in ('observation', 'concern', 'progress', 'follow_up')),
  body text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_member_notes_member on public.member_notes(household_member_id, created_at desc);
create index if not exists idx_member_notes_session on public.member_notes(session_id);

-- 3. Member Action Items ("What is required from him/her")
create table if not exists public.member_action_items (
  id uuid primary key default gen_random_uuid(),
  household_member_id uuid not null references public.household_members(id) on delete cascade,
  session_id uuid references public.case_sessions(id) on delete set null,
  task text not null,
  status text not null default 'open'
    check (status in ('suggested', 'open', 'done', 'dropped')),
  priority text not null default 'normal'
    check (priority in ('normal', 'high')),
  due_date date,
  source text not null default 'coach'
    check (source in ('coach', 'ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_member_actions_member on public.member_action_items(household_member_id, status);
create index if not exists idx_member_actions_session on public.member_action_items(session_id);

-- 4. Triggers for updated_at
drop trigger if exists set_member_notes_updated_at on public.member_notes;
create trigger set_member_notes_updated_at
  before update on public.member_notes
  for each row execute function public.handle_family_system_updated_at();

drop trigger if exists set_member_action_items_updated_at on public.member_action_items;
create trigger set_member_action_items_updated_at
  before update on public.member_action_items
  for each row execute function public.handle_family_system_updated_at();

-- 5. Row Level Security (RLS)
alter table public.member_notes enable row level security;
alter table public.member_action_items enable row level security;

-- Policies for member_notes (Admin only)
create policy "Admins can view member notes"
  on public.member_notes
  for select
  using (public.is_admin());

create policy "Admins can insert member notes"
  on public.member_notes
  for insert
  with check (public.is_admin());

create policy "Admins can update member notes"
  on public.member_notes
  for update
  using (public.is_admin());

create policy "Admins can delete member notes"
  on public.member_notes
  for delete
  using (public.is_admin());

-- Policies for member_action_items (Admin only)
create policy "Admins can view member action items"
  on public.member_action_items
  for select
  using (public.is_admin());

create policy "Admins can insert member action items"
  on public.member_action_items
  for insert
  with check (public.is_admin());

create policy "Admins can update member action items"
  on public.member_action_items
  for update
  using (public.is_admin());

create policy "Admins can delete member action items"
  on public.member_action_items
  for delete
  using (public.is_admin());
