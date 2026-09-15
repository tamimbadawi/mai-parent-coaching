-- Migration: Booking Blackouts & Availability Settings
-- Allows admin to manage vacation days/blackouts and coach working schedule

-- 1. Create booking_blackouts table
create table if not exists public.booking_blackouts (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  reason text not null default 'Unavailable / Day Off',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  constraint booking_blackouts_dates_valid check (start_date <= end_date)
);

alter table public.booking_blackouts enable row level security;

-- Blackout RLS: Everyone can read blackouts (needed to compute open slots); Admins can insert/update/delete
create policy "Allow public read booking blackouts"
  on public.booking_blackouts for select
  using (true);

create policy "Allow admin full access to booking blackouts"
  on public.booking_blackouts for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- 2. Create booking_settings table
create table if not exists public.booking_settings (
  id text primary key default 'default',
  working_days integer[] not null default '{0,1,2,3,4}',
  work_start_hour integer not null default 9,
  work_end_hour integer not null default 17,
  slot_interval_minutes integer not null default 30,
  booking_notice_hours integer not null default 1,
  time_zone text not null default 'Africa/Cairo',
  updated_at timestamptz not null default now()
);

alter table public.booking_settings enable row level security;

create policy "Allow public read booking settings"
  on public.booking_settings for select
  using (true);

create policy "Allow admin update booking settings"
  on public.booking_settings for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Insert default row if not exists
insert into public.booking_settings (id, working_days, work_start_hour, work_end_hour, slot_interval_minutes, booking_notice_hours, time_zone)
values ('default', '{0,1,2,3,4}', 9, 17, 30, 1, 'Africa/Cairo')
on conflict (id) do nothing;
