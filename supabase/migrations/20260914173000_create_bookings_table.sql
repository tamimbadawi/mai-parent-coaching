-- Enable pgcrypto if not already enabled
create extension if not exists pgcrypto;

-- 1. Create Bookings Table
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  appointment_type_id text not null,
  appointment_type_title text not null,
  appointment_date date not null,
  appointment_time text not null,
  parent_name text not null,
  email text not null,
  phone text,
  country text,
  child_name text,
  child_age text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'pending_calendar_sync')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Enable Row Level Security
alter table public.bookings enable row level security;

-- 3. RLS Policies

-- Public / Anonymous + Authenticated Insert
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
      and policyname = 'Allow public to insert bookings'
  ) then
    create policy "Allow public to insert bookings"
      on public.bookings
      for insert
      to anon, authenticated
      with check (true);
  end if;
end
$$;

-- Users can view their own bookings via user_id
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
      and policyname = 'Users can view own bookings'
  ) then
    create policy "Users can view own bookings"
      on public.bookings
      for select
      to authenticated
      using (auth.uid() is not null and auth.uid() = user_id);
  end if;
end
$$;

-- Admins can view all bookings
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
      and policyname = 'Admins can view all bookings'
  ) then
    create policy "Admins can view all bookings"
      on public.bookings
      for select
      to authenticated
      using (public.is_admin());
  end if;
end
$$;

-- Admins can update all bookings
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
      and policyname = 'Admins can update all bookings'
  ) then
    create policy "Admins can update all bookings"
      on public.bookings
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end
$$;

-- 4. Create trigger to keep updated_at in sync
create or replace function public.handle_bookings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
  before update on public.bookings
  for each row
  execute function public.handle_bookings_updated_at();
