-- Migration: Create crm_deliveries table and expand whatsapp_messages message_type check
-- Date: 2026-09-21

create extension if not exists pgcrypto;

-- 1. Update whatsapp_messages check constraint to allow 'crm_nurture' and 'inbound'
alter table public.whatsapp_messages
  drop constraint if exists whatsapp_messages_message_type_check;

alter table public.whatsapp_messages
  add constraint whatsapp_messages_message_type_check check (
    message_type in (
      'onboarding',
      'booking_confirmation',
      'reminder_24h',
      'reminder_1h',
      'follow_up',
      'manual',
      'crm_nurture',
      'inbound'
    )
  );

-- Add related_content_id to whatsapp_messages for direct CRM tracking
alter table public.whatsapp_messages
  add column if not exists related_content_id uuid references public.crm_content_library(id) on delete set null;

create index if not exists idx_whatsapp_messages_content_id
  on public.whatsapp_messages (related_content_id);

-- 2. Create crm_deliveries table
create table if not exists public.crm_deliveries (
  id uuid primary key default gen_random_uuid(),
  recipient_phone text not null,
  client_id uuid references public.profiles(id) on delete set null,
  content_id uuid not null references public.crm_content_library(id) on delete cascade,
  whatsapp_message_id uuid references public.whatsapp_messages(id) on delete set null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Partial Unique Index: Strictly prevents delivering the same content piece twice to the same phone
create unique index if not exists idx_crm_deliveries_unique_recipient_content
  on public.crm_deliveries (recipient_phone, content_id);

-- Performance indexes for lookup and cadence checks
create index if not exists idx_crm_deliveries_recipient_sent
  on public.crm_deliveries (recipient_phone, sent_at desc);

create index if not exists idx_crm_deliveries_client_id
  on public.crm_deliveries (client_id);

-- 3. Enable Row Level Security
alter table public.crm_deliveries enable row level security;

-- RLS Policies (Admins only)
create policy "Admins can view crm deliveries"
  on public.crm_deliveries
  for select
  using (public.is_admin());

create policy "Admins can manage crm deliveries"
  on public.crm_deliveries
  for all
  using (public.is_admin())
  with check (public.is_admin());
