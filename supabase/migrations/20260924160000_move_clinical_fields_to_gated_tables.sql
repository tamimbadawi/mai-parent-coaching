-- Migration: Move Clinical & Persona Fields Behind Family Unlock
-- Separates clinical/persona columns from public.households and public.household_members
-- into gated tables: public.household_clinical and public.member_personas
-- Security: Gated by (public.is_admin() AND public.has_family_unlock())

-- 1. Create household_clinical table
create table if not exists public.household_clinical (
  household_id uuid primary key references public.households(id) on delete cascade,
  presenting_issue text,
  working_plan text,
  next_step text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create member_personas table
create table if not exists public.member_personas (
  household_member_id uuid primary key references public.household_members(id) on delete cascade,
  persona_summary text,
  temperament_traits text[] not null default '{}',
  known_triggers text[] not null default '{}',
  strengths text[] not null default '{}',
  concern_level text,
  family_dynamic_role text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Copy existing clinical data from households
insert into public.household_clinical (
  household_id,
  presenting_issue,
  working_plan,
  next_step,
  updated_at
)
select
  id,
  presenting_issue,
  working_plan,
  next_step,
  coalesce(updated_at, now())
from public.households
where presenting_issue is not null
   or working_plan is not null
   or next_step is not null
on conflict (household_id) do update set
  presenting_issue = excluded.presenting_issue,
  working_plan = excluded.working_plan,
  next_step = excluded.next_step,
  updated_at = excluded.updated_at;

-- 4. Copy existing persona & notes data from household_members
insert into public.member_personas (
  household_member_id,
  persona_summary,
  temperament_traits,
  known_triggers,
  strengths,
  concern_level,
  family_dynamic_role,
  notes,
  updated_at
)
select
  id,
  persona_summary,
  coalesce(temperament_traits, '{}'),
  coalesce(known_triggers, '{}'),
  coalesce(strengths, '{}'),
  concern_level,
  family_dynamic_role,
  notes,
  coalesce(updated_at, now())
from public.household_members
where persona_summary is not null
   or notes is not null
   or concern_level is not null
   or family_dynamic_role is not null
   or (temperament_traits is not null and array_length(temperament_traits, 1) > 0)
   or (known_triggers is not null and array_length(known_triggers, 1) > 0)
   or (strengths is not null and array_length(strengths, 1) > 0)
on conflict (household_member_id) do update set
  persona_summary = excluded.persona_summary,
  temperament_traits = excluded.temperament_traits,
  known_triggers = excluded.known_triggers,
  strengths = excluded.strengths,
  concern_level = excluded.concern_level,
  family_dynamic_role = excluded.family_dynamic_role,
  notes = excluded.notes,
  updated_at = excluded.updated_at;

-- 5. Drop old columns from households
alter table public.households
  drop column if exists presenting_issue,
  drop column if exists working_plan,
  drop column if exists next_step;

-- 6. Drop old columns from household_members
alter table public.household_members
  drop column if exists persona_summary,
  drop column if exists temperament_traits,
  drop column if exists known_triggers,
  drop column if exists strengths,
  drop column if exists concern_level,
  drop column if exists family_dynamic_role,
  drop column if exists notes;

-- 7. Enable RLS on new tables
alter table public.household_clinical enable row level security;
alter table public.member_personas enable row level security;

-- 8. Policies for household_clinical (Requires Admin + Family Unlock)
create policy "Admins with family unlock can select household_clinical"
  on public.household_clinical for select to authenticated
  using (public.is_admin() and public.has_family_unlock());

create policy "Admins with family unlock can insert household_clinical"
  on public.household_clinical for insert to authenticated
  with check (public.is_admin() and public.has_family_unlock());

create policy "Admins with family unlock can update household_clinical"
  on public.household_clinical for update to authenticated
  using (public.is_admin() and public.has_family_unlock())
  with check (public.is_admin() and public.has_family_unlock());

create policy "Admins with family unlock can delete household_clinical"
  on public.household_clinical for delete to authenticated
  using (public.is_admin() and public.has_family_unlock());

-- 9. Policies for member_personas (Requires Admin + Family Unlock)
create policy "Admins with family unlock can select member_personas"
  on public.member_personas for select to authenticated
  using (public.is_admin() and public.has_family_unlock());

create policy "Admins with family unlock can insert member_personas"
  on public.member_personas for insert to authenticated
  with check (public.is_admin() and public.has_family_unlock());

create policy "Admins with family unlock can update member_personas"
  on public.member_personas for update to authenticated
  using (public.is_admin() and public.has_family_unlock())
  with check (public.is_admin() and public.has_family_unlock());

create policy "Admins with family unlock can delete member_personas"
  on public.member_personas for delete to authenticated
  using (public.is_admin() and public.has_family_unlock());

-- 10. Table permissions
grant all on public.household_clinical to authenticated;
grant all on public.member_personas to authenticated;
