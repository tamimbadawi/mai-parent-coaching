create extension if not exists btree_gist;

alter table public.bookings
  add column if not exists time_zone text,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists reserved_until timestamptz,
  add column if not exists google_calendar_event_id text,
  add column if not exists google_meet_url text;

update public.bookings
set
  time_zone = coalesce(time_zone, 'Africa/Cairo'),
  starts_at = coalesce(
    starts_at,
    ((appointment_date::text || ' ' || appointment_time)::timestamp at time zone 'Africa/Cairo')
  ),
  ends_at = coalesce(
    ends_at,
    ((appointment_date::text || ' ' || appointment_time)::timestamp at time zone 'Africa/Cairo')
      + case appointment_type_id
          when 'initial' then interval '75 minutes'
          when 'coaching-60' then interval '60 minutes'
          when 'intensive-90' then interval '90 minutes'
          when 'family' then interval '75 minutes'
          when 'follow-up' then interval '45 minutes'
          else interval '60 minutes'
        end
  ),
  reserved_until = coalesce(
    reserved_until,
    ((appointment_date::text || ' ' || appointment_time)::timestamp at time zone 'Africa/Cairo')
      + case appointment_type_id
          when 'initial' then interval '90 minutes'
          when 'coaching-60' then interval '75 minutes'
          when 'intensive-90' then interval '120 minutes'
          when 'family' then interval '90 minutes'
          when 'follow-up' then interval '60 minutes'
          else interval '75 minutes'
        end
  )
where time_zone is null or starts_at is null or ends_at is null or reserved_until is null;

alter table public.bookings
  alter column time_zone set not null,
  alter column starts_at set not null,
  alter column ends_at set not null,
  alter column reserved_until set not null;

alter table public.bookings
  add constraint bookings_time_zone_not_blank check (length(trim(time_zone)) > 0),
  add constraint bookings_interval_is_valid check (starts_at < ends_at and ends_at <= reserved_until);

alter table public.bookings
  add constraint bookings_no_active_overlap
  exclude using gist (
    tstzrange(starts_at, reserved_until, '[)') with &&
  )
  where (status in ('pending', 'confirmed', 'pending_calendar_sync'));

create index if not exists bookings_starts_at_idx on public.bookings (starts_at);
