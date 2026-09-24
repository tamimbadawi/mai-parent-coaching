-- Allow 'parent' role in household_members check constraint
-- Keeps existing values ('mother', 'father', 'child', 'guardian', 'other') and adds 'parent'.

alter table public.household_members
  drop constraint if exists household_members_role_check;

alter table public.household_members
  add constraint household_members_role_check
  check (role in ('parent', 'mother', 'father', 'child', 'guardian', 'other'));
