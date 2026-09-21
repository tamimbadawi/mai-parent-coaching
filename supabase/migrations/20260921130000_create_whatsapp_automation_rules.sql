-- Migration: Create whatsapp_automation_rules table, RLS, and seed default rules
-- Enables admins to view/edit message templates and toggle automated triggers without redeploying.

-- 1. Create table
create table if not exists public.whatsapp_automation_rules (
  id uuid default gen_random_uuid() primary key,
  trigger_type text unique not null,
  title text not null,
  description text,
  template_content text not null,
  is_enabled boolean default true not null,
  available_variables text[] not null default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  updated_by uuid references auth.users(id) on delete set null
);

-- 2. Enable RLS
alter table public.whatsapp_automation_rules enable row level security;

-- 3. RLS Policies (Admins only)
create policy "Admins can view whatsapp automation rules"
  on public.whatsapp_automation_rules
  for select
  using (public.is_admin());

create policy "Admins can update whatsapp automation rules"
  on public.whatsapp_automation_rules
  for update
  using (public.is_admin());

create policy "Admins can insert whatsapp automation rules"
  on public.whatsapp_automation_rules
  for insert
  with check (public.is_admin());

-- 4. Seed 5 core automation rules with default templates
insert into public.whatsapp_automation_rules (trigger_type, title, description, template_content, is_enabled, available_variables)
values
  (
    'onboarding',
    'Welcome & Client Onboarding',
    'Dispatched when a parent completes their profile or an admin approves/creates a client account.',
    'Hello {parentName},

Welcome to Mai''s Parent Coaching. I am truly glad you are here. My focus is to offer you a calm, evidence-based, and compassionate space for your family''s parenting journey.

Feel free to reply to this number whenever you need guidance or have a question.

Warmly,
Mai',
    true,
    array['{parentName}']
  ),
  (
    'booking_confirmation',
    'Booking Confirmation',
    'Dispatched immediately when coach confirms a coaching session and generates the Google Meet video link.',
    'Dear {parentName},

Your coaching session for *{appointmentType}* has been confirmed.

🗓 *Date:* {date}
⏰ *Time:* {time}{timezone}
🔗 *Meeting Link:* {meetingLink}

Please take a few moments before our call to be in a quiet, comfortable space. If you need to reschedule or have questions beforehand, simply reply to this message.

Looking forward to speaking with you,
Mai',
    true,
    array['{parentName}', '{appointmentType}', '{date}', '{time}', '{timezone}', '{meetingLink}']
  ),
  (
    'reminder_24h',
    '24-Hour Session Reminder',
    'Dispatched automatically 24 hours prior to a scheduled session.',
    'Hi {parentName},

This is a gentle reminder that your session for *{appointmentType}* is scheduled for tomorrow at *{time}{timezone}*.

🔗 *Meeting Link:* {meetingLink}

Take a deep breath and give yourself credit for showing up for yourself and your family. See you tomorrow!

Warm regards,
Mai',
    true,
    array['{parentName}', '{appointmentType}', '{time}', '{timezone}', '{meetingLink}']
  ),
  (
    'reminder_1h',
    '1-Hour Session Reminder',
    'Dispatched automatically 1 hour prior to a scheduled session.',
    'Hi {parentName},

Our session (*{appointmentType}*) starts in approximately 1 hour.

Grab a warm drink, make yourself comfortable, and click here when ready to join:
🔗 {meetingLink}

See you shortly,
Mai',
    true,
    array['{parentName}', '{appointmentType}', '{meetingLink}']
  ),
  (
    'follow_up',
    'Post-Session Follow-up',
    'Dispatched automatically after a coaching session completes.',
    'Dear {parentName},

Thank you for sharing your time and vulnerability during our session. Remember that meaningful change happens one small, patient moment at a time.

Wishing you a grounded and calm day ahead.

With care,
Mai',
    true,
    array['{parentName}']
  )
on conflict (trigger_type) do nothing;
