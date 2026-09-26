-- Migration: Seed Mai's real weekly schedule
-- Delete existing recurring availability rules (preserve date_override and date_closed)
delete from public.coach_availability_rules
where rule_type = 'recurring';

-- Insert Mai's real weekly schedule (Africa/Cairo time)
-- Mon (1) and Wed (3): 12:00–13:00 and 13:30–14:30, appointment_type_id 'coaching-60'
-- Tue (2): 11:00–11:30, 11:45–12:15, 12:30–13:00, appointment_type_id 'initial' (Discovery Call)
insert into public.coach_availability_rules (
  rule_type,
  day_of_week,
  start_time,
  end_time,
  appointment_type_id,
  label,
  is_active
)
values
  -- Monday: 60-Minute Coaching
  ('recurring', 1, '12:00', '13:00', 'coaching-60', 'Monday Coaching (12:00-13:00)', true),
  ('recurring', 1, '13:30', '14:30', 'coaching-60', 'Monday Coaching (13:30-14:30)', true),

  -- Tuesday: Discovery Calls (30-min sessions)
  ('recurring', 2, '11:00', '11:30', 'initial', 'Tuesday Discovery Call (11:00-11:30)', true),
  ('recurring', 2, '11:45', '12:15', 'initial', 'Tuesday Discovery Call (11:45-12:15)', true),
  ('recurring', 2, '12:30', '13:00', 'initial', 'Tuesday Discovery Call (12:30-13:00)', true),

  -- Wednesday: 60-Minute Coaching
  ('recurring', 3, '12:00', '13:00', 'coaching-60', 'Wednesday Coaching (12:00-13:00)', true),
  ('recurring', 3, '13:30', '14:30', 'coaching-60', 'Wednesday Coaching (13:30-14:30)', true);
