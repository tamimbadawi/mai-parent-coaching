-- Migration: A family case is a spinoff of a real client account, not a standalone record.
-- Every household must be linked to a profiles row from creation onward.
-- (No existing rows violate this at the time of writing -- verified before applying.)

alter table public.households
  alter column primary_contact_profile_id set not null;
