-- Add city and address fields to profiles for physical product shipping
-- Both are optional (nullable) -- not required during onboarding
alter table public.profiles
  add column if not exists city text default null,
  add column if not exists address text default null;
