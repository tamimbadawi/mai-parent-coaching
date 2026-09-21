-- Migration: Create whatsapp_messages table, RLS policies, duplicate prevention indexes, and stale sweeper
-- Date: 2026-09-21

create extension if not exists pgcrypto;

-- 1. Create whatsapp_messages table
create table if not exists public.whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  recipient_phone text not null,
  recipient_name text,
  message_type text not null check (
    message_type in (
      'onboarding',
      'booking_confirmation',
      'reminder_24h',
      'reminder_1h',
      'follow_up',
      'manual'
    )
  ),
  message_content text not null,
  related_booking_id uuid references public.bookings(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  whatsapp_message_id text,
  created_at timestamptz not null default now()
);

-- 2. Partial Unique Indexes for strict DB-level duplicate prevention
-- Ensures only ONE 'sent' reminder/confirmation can ever exist per booking
create unique index if not exists idx_whatsapp_messages_booking_sent
  on public.whatsapp_messages (related_booking_id, message_type)
  where status = 'sent' and related_booking_id is not null;

-- Ensures only ONE 'sent' onboarding message can ever exist per recipient phone
create unique index if not exists idx_whatsapp_messages_onboarding_sent
  on public.whatsapp_messages (recipient_phone, message_type)
  where status = 'sent' and message_type = 'onboarding';

-- General indexes for admin filtering and querying
create index if not exists idx_whatsapp_messages_created_at
  on public.whatsapp_messages (created_at desc);

create index if not exists idx_whatsapp_messages_status
  on public.whatsapp_messages (status);

create index if not exists idx_whatsapp_messages_type
  on public.whatsapp_messages (message_type);

create index if not exists idx_whatsapp_messages_booking_id
  on public.whatsapp_messages (related_booking_id);

-- 3. Enable Row Level Security
alter table public.whatsapp_messages enable row level security;

-- Admins can view all WhatsApp message history
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'whatsapp_messages'
      and policyname = 'Admins can view all whatsapp messages'
  ) then
    create policy "Admins can view all whatsapp messages"
      on public.whatsapp_messages
      for select
      to authenticated
      using (public.is_admin());
  end if;
end
$$;

-- Admins can insert/update (e.g. for manual message dispatches or testing)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'whatsapp_messages'
      and policyname = 'Admins can insert and update whatsapp messages'
  ) then
    create policy "Admins can insert and update whatsapp messages"
      on public.whatsapp_messages
      for all
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end
$$;

-- Disallow public/anonymous access explicitly (default deny with RLS enabled)

-- 4. Stale Pending Sweeper Function (Timeout recovery)
-- Sweeps any message stuck in 'pending' for longer than the timeout into 'failed'
create or replace function public.sweep_stale_whatsapp_messages(timeout_minutes integer default 5)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer;
begin
  update public.whatsapp_messages
  set status = 'failed',
      error_message = coalesce(error_message, 'Dispatch timed out while in pending state (exceeded ' || timeout_minutes || ' minutes)')
  where status = 'pending'
    and created_at < now() - (timeout_minutes || ' minutes')::interval;

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;
