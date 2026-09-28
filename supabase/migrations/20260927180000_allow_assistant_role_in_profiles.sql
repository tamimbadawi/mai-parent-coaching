-- Allow 'assistant' role in profiles check constraint
-- Supports dedicated Assistant role for practice management and calendar scheduling.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'admin', 'assistant'));

-- Update public.is_admin() to allow both admin and assistant roles for operational data access,
-- while preserving strict administrative role segregation where needed.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'assistant')
  );
$$;

-- Helper function to specifically check if user is an Assistant
create or replace function public.is_assistant()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'assistant'
  );
$$;
