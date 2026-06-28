-- Add country of residency column to profiles table
alter table public.profiles
  add column if not exists country text default null;
