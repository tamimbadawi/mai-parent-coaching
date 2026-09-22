-- Migration: Create Family / Household Client Management System tables
-- Tables: households, household_members, case_sessions, session_attendees, session_content
-- Security: Strict Admin-Only Row Level Security (RLS)

create extension if not exists pgcrypto;

-- 1. Households Table (Family unit core)
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  primary_contact_profile_id uuid references public.profiles(id) on delete set null,
  family_name text not null,
  presenting_issue text,
  working_plan text,
  next_step text,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Household Members Table (Mother, father, each child with birth year only for privacy)
create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('mother', 'father', 'child', 'guardian', 'other')),
  birth_year integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Case Sessions Table (Clinical sessions tied to household and optional booking)
create table if not exists public.case_sessions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  session_date timestamptz not null,
  duration_minutes integer,
  google_meet_url text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Session Attendees Table (Flexible multi-member attendance)
create table if not exists public.session_attendees (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.case_sessions(id) on delete cascade,
  household_member_id uuid not null references public.household_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint uq_session_attendee unique (session_id, household_member_id)
);

-- 5. Session Content Table (4 distinct content streams per session)
create table if not exists public.session_content (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.case_sessions(id) on delete cascade,
  content_type text not null check (content_type in ('pre_session_recap', 'live_transcript', 'handwritten_notes', 'post_session_notes')),
  content text,
  source_metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_session_content_type unique (session_id, content_type)
);

-- 6. Indexes for queries & joins
create index if not exists idx_households_status on public.households(status);
create index if not exists idx_households_primary_contact on public.households(primary_contact_profile_id);
create index if not exists idx_household_members_household on public.household_members(household_id);
create index if not exists idx_case_sessions_household on public.case_sessions(household_id);
create index if not exists idx_case_sessions_booking on public.case_sessions(booking_id);
create index if not exists idx_case_sessions_date on public.case_sessions(session_date desc);
create index if not exists idx_session_attendees_session on public.session_attendees(session_id);
create index if not exists idx_session_attendees_member on public.session_attendees(household_member_id);
create index if not exists idx_session_content_session on public.session_content(session_id);

-- 7. Automatic updated_at trigger helper
create or replace function public.handle_family_system_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_households_updated_at on public.households;
create trigger set_households_updated_at
  before update on public.households
  for each row execute function public.handle_family_system_updated_at();

drop trigger if exists set_household_members_updated_at on public.household_members;
create trigger set_household_members_updated_at
  before update on public.household_members
  for each row execute function public.handle_family_system_updated_at();

drop trigger if exists set_case_sessions_updated_at on public.case_sessions;
create trigger set_case_sessions_updated_at
  before update on public.case_sessions
  for each row execute function public.handle_family_system_updated_at();

drop trigger if exists set_session_content_updated_at on public.session_content;
create trigger set_session_content_updated_at
  before update on public.session_content
  for each row execute function public.handle_family_system_updated_at();

-- 8. Enable Row Level Security (RLS) on all 5 tables
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.case_sessions enable row level security;
alter table public.session_attendees enable row level security;
alter table public.session_content enable row level security;

-- 9. Strict Admin-Only Policies (Split per operation using public.is_admin())
-- Households
create policy "Admins can view households"
  on public.households
  for select
  using (public.is_admin());

create policy "Admins can insert households"
  on public.households
  for insert
  with check (public.is_admin());

create policy "Admins can update households"
  on public.households
  for update
  using (public.is_admin());

create policy "Admins can delete households"
  on public.households
  for delete
  using (public.is_admin());

-- Household Members
create policy "Admins can view household members"
  on public.household_members
  for select
  using (public.is_admin());

create policy "Admins can insert household members"
  on public.household_members
  for insert
  with check (public.is_admin());

create policy "Admins can update household members"
  on public.household_members
  for update
  using (public.is_admin());

create policy "Admins can delete household members"
  on public.household_members
  for delete
  using (public.is_admin());

-- Case Sessions
create policy "Admins can view case sessions"
  on public.case_sessions
  for select
  using (public.is_admin());

create policy "Admins can insert case sessions"
  on public.case_sessions
  for insert
  with check (public.is_admin());

create policy "Admins can update case sessions"
  on public.case_sessions
  for update
  using (public.is_admin());

create policy "Admins can delete case sessions"
  on public.case_sessions
  for delete
  using (public.is_admin());

-- Session Attendees
create policy "Admins can view session attendees"
  on public.session_attendees
  for select
  using (public.is_admin());

create policy "Admins can insert session attendees"
  on public.session_attendees
  for insert
  with check (public.is_admin());

create policy "Admins can update session attendees"
  on public.session_attendees
  for update
  using (public.is_admin());

create policy "Admins can delete session attendees"
  on public.session_attendees
  for delete
  using (public.is_admin());

-- Session Content
create policy "Admins can view session content"
  on public.session_content
  for select
  using (public.is_admin());

create policy "Admins can insert session content"
  on public.session_content
  for insert
  with check (public.is_admin());

create policy "Admins can update session content"
  on public.session_content
  for update
  using (public.is_admin());

create policy "Admins can delete session content"
  on public.session_content
  for delete
  using (public.is_admin());
