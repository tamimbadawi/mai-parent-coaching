-- Migration: Coach Availability System (Allow-list & Recurring Schedules)
-- Inverts availability from block-list (blackouts) to allow-list (closed by default until opened)

create table if not exists public.coach_availability_rules (
  id uuid primary key default gen_random_uuid(),
  rule_type text not null check (rule_type in ('recurring', 'date_override', 'date_closed')),
  day_of_week integer check (day_of_week between 0 and 6), -- 0=Sunday, 1=Monday, ..., 6=Saturday
  specific_date date,                                      -- Used when rule_type in ('date_override', 'date_closed')
  start_time text,                                         -- 'HH:MM' (24-hour format, e.g. '10:00')
  end_time text,                                           -- 'HH:MM' (24-hour format, e.g. '14:00')
  label text,                                              -- Optional descriptive label
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.coach_availability_rules enable row level security;

-- Public can read active rules to calculate available booking slots
create policy "Allow public read active availability rules"
  on public.coach_availability_rules for select
  using (true);

-- Admins have full access to create, modify, delete rules
create policy "Allow admin manage availability rules"
  on public.coach_availability_rules for all
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

-- Seed initial active recurring slots (Monday, Tuesday, Wednesday, Thursday morning/afternoon)
insert into public.coach_availability_rules (rule_type, day_of_week, start_time, end_time, label, is_active)
values
  ('recurring', 1, '10:00', '14:00', 'Monday Morning', true),
  ('recurring', 1, '16:00', '18:00', 'Monday Afternoon', true),
  ('recurring', 2, '10:00', '14:00', 'Tuesday Morning', true),
  ('recurring', 3, '10:00', '14:00', 'Wednesday Morning', true),
  ('recurring', 3, '16:00', '18:00', 'Wednesday Afternoon', true),
  ('recurring', 4, '10:00', '14:00', 'Thursday Morning', true)
on conflict do nothing;
