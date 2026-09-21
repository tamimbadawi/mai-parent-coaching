-- Migration: Create crm_content_library table with RLS and seed initial pieces
-- Date: 2026-09-21

create extension if not exists pgcrypto;

-- 1. Create table crm_content_library
create table if not exists public.crm_content_library (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body_template text not null,
  content_type text not null check (content_type in ('prompt', 'tip', 'worksheet', 'check_in')),
  target_track text not null check (target_track in ('track_a', 'track_b', 'all')),
  tags text[] not null default '{}',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

-- 2. Performance & filtering indexes
create index if not exists idx_crm_content_library_track_active
  on public.crm_content_library (target_track, is_active, sort_order);

create index if not exists idx_crm_content_library_type
  on public.crm_content_library (content_type);

create index if not exists idx_crm_content_library_created_at
  on public.crm_content_library (created_at desc);

-- 3. Enable Row Level Security
alter table public.crm_content_library enable row level security;

-- RLS Policies (Admins only)
create policy "Admins can view crm content library"
  on public.crm_content_library
  for select
  using (public.is_admin());

create policy "Admins can insert crm content library"
  on public.crm_content_library
  for insert
  with check (public.is_admin());

create policy "Admins can update crm content library"
  on public.crm_content_library
  for update
  using (public.is_admin());

create policy "Admins can delete crm content library"
  on public.crm_content_library
  for delete
  using (public.is_admin());

-- 4. Seed initial realistic starter pieces for Track A and Track B
insert into public.crm_content_library (
  title,
  body_template,
  content_type,
  target_track,
  tags,
  is_active,
  sort_order
)
values
  (
    'The 3-Second Pause for Tantrums',
    'Hello {parentName},

When a storm hits and your child is overwhelmed, remember: their nervous system looks to yours first.

Before reacting, take a 3-second inhale. Drop your shoulders. Say to yourself: "My child is not giving me a hard time; they are having a hard time."

You don''t need to fix the tantrum instantly. Your calm presence is the anchor.

Warmly,
Mai',
    'tip',
    'track_a',
    array['tantrums', 'nervous-system', 'regulation'],
    true,
    1
  ),
  (
    'Evening Connection Prompt',
    'Hi {parentName},

As this day comes to a close, here is a gentle question to hold:

"What is one small moment today where I felt truly connected to my child — even if it lasted only thirty seconds?"

Parenting isn''t measured in perfection, but in these quiet micro-moments of attunement.

Wishing you and your home a peaceful evening,
Mai',
    'prompt',
    'track_a',
    array['reflection', 'connection', 'evening-ritual'],
    true,
    2
  ),
  (
    'Emotion Thermometer Tool',
    'Hello {parentName},

I wanted to share a simple visual tool many of my families find helpful: The Emotion Thermometer.

It helps children (and parents!) name sensations before anger turns into a storm (Blue = Calm, Yellow = Stirring, Red = Overwhelmed).

You can save or print this guide whenever you need a shared vocabulary at home:
🔗 https://maiparentcoaching.com/resources/emotion-thermometer

With care,
Mai',
    'worksheet',
    'track_a',
    array['worksheet', 'tools', 'emotional-regulation'],
    true,
    3
  ),
  (
    'Post-Session Integration Check-In',
    'Dear {parentName},

I''ve been thinking about our recent coaching conversation. Changing family habits takes courage, and new patterns often feel unfamiliar at first.

How has the core strategy we discussed been settling into your daily rhythm this week?

Remember that small, consistent shifts matter far more than dramatic overhauls.

Warmly,
Mai',
    'check_in',
    'track_b',
    array['coaching-integration', 'follow-up', 'habit-building'],
    true,
    4
  ),
  (
    'Protecting Parental Reserves',
    'Hi {parentName},

Following up on our work together: Are you remembering to protect your own reserves this week?

When parents are running on empty, even minor friction feels catastrophic. What is one small boundary you can hold for your own rest today?

Holding space for you,
Mai',
    'prompt',
    'track_b',
    array['burnout', 'parental-reserves', 'boundaries'],
    true,
    5
  );
