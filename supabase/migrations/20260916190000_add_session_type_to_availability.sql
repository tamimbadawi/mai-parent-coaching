-- Migration: Add appointment_type_id to coach_availability_rules for session-specific availability
alter table public.coach_availability_rules
add column if not exists appointment_type_id text not null default 'all';
