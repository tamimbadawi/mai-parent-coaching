-- Migration: Cascade household deletion when client profile is deleted
-- Fixes "Database error deleting user" caused by NOT NULL constraint on primary_contact_profile_id
-- clashing with previous ON DELETE SET NULL foreign key.

alter table public.households
  drop constraint if exists households_primary_contact_profile_id_fkey;

alter table public.households
  add constraint households_primary_contact_profile_id_fkey
  foreign key (primary_contact_profile_id)
  references public.profiles(id)
  on delete cascade;
