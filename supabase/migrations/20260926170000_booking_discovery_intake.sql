-- Discovery Call intake answers on bookings (ids defined in src/data/content.ts and
-- supabase/functions/_shared/booking-scheduling.ts). No RLS change: existing bookings
-- policies cover all columns.
alter table public.bookings
  add column if not exists intake_topics text[],
  add column if not exists intake_need text,
  add column if not exists intake_duration text,
  add column if not exists intake_suggested_package text;
