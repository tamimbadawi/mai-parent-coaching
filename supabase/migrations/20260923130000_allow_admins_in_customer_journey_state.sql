-- Migration: Allow admins in customer_journey_state view
-- Date: 2026-09-23

create or replace view public.customer_journey_state with (security_invoker = true) as
with client_bookings as (
  select
    coalesce(b.user_id, p.id) as profile_id,
    count(*) filter (
      where b.status = 'completed'
        and b.appointment_type_id != 'initial'
    ) as completed_paid_sessions_count,
    count(*) filter (
      where b.status = 'completed'
        and b.appointment_type_id = 'initial'
    ) as completed_free_sessions_count,
    count(*) filter (
      where b.status in ('confirmed', 'pending', 'pending_calendar_sync')
        and b.starts_at >= now()
    ) as upcoming_sessions_count,
    count(*) filter (
      where b.status = 'cancelled'
    ) as cancelled_sessions_count,
    min(b.starts_at) filter (
      where b.status = 'completed'
        and b.appointment_type_id != 'initial'
    ) as first_completed_paid_session_at,
    max(b.starts_at) filter (
      where b.status = 'completed'
        and b.appointment_type_id != 'initial'
    ) as last_completed_paid_session_at,
    min(b.starts_at) filter (
      where b.status in ('confirmed', 'pending', 'pending_calendar_sync')
        and b.starts_at >= now()
    ) as next_upcoming_session_at,
    max(b.starts_at) filter (
      where b.status = 'completed'
    ) as last_any_completed_session_at,
    max(b.created_at) as latest_booking_created_at
  from public.profiles p
  left join public.bookings b
    on b.user_id = p.id
    or (b.user_id is null and (
      (lower(b.email) = lower(p.email)) or
      (b.phone is not null and p.phone is not null and b.phone = p.phone)
    ))
  group by coalesce(b.user_id, p.id)
),
client_messages as (
  select
    p.id as profile_id,
    max(wm.sent_at) filter (where wm.status = 'sent') as last_whatsapp_sent_at,
    max(wm.created_at) as last_whatsapp_created_at,
    count(*) filter (where wm.status = 'sent') as whatsapp_sent_count
  from public.profiles p
  left join public.whatsapp_messages wm
    on (p.phone is not null and wm.recipient_phone = p.phone)
  group by p.id
),
client_inquiries as (
  select
    p.id as profile_id,
    max(cm.created_at) as last_inquiry_created_at
  from public.profiles p
  left join public.contact_messages cm
    on lower(cm.email) = lower(p.email)
    or (p.phone is not null and cm.phone is not null and cm.phone = p.phone)
  group by p.id
),
base_journey as (
  select
    p.id as client_id,
    coalesce(p.full_name, 'Parent') as parent_name,
    p.email,
    p.phone,
    p.country,
    p.role,
    p.created_at as client_created_at,
    p.engagement_status,
    p.engagement_cadence_days,
    
    coalesce(cb.completed_paid_sessions_count, 0)::integer as completed_paid_sessions_count,
    coalesce(cb.completed_free_sessions_count, 0)::integer as completed_free_sessions_count,
    coalesce(cb.upcoming_sessions_count, 0)::integer as upcoming_sessions_count,
    coalesce(cb.cancelled_sessions_count, 0)::integer as cancelled_sessions_count,
    
    cb.first_completed_paid_session_at,
    cb.last_completed_paid_session_at,
    cb.next_upcoming_session_at,
    
    -- Derive latest touchpoint across profile signup, bookings, messages, inquiries
    greatest(
      p.created_at,
      cb.last_any_completed_session_at,
      cb.latest_booking_created_at,
      cmes.last_whatsapp_sent_at,
      cmes.last_whatsapp_created_at,
      cinq.last_inquiry_created_at
    ) as last_engagement_at,
    
    -- Track determination (strict rule: first paid session marked completed!)
    case
      when coalesce(cb.completed_paid_sessions_count, 0) >= 1 then 'track_b'
      else 'track_a'
    end as current_track
  from public.profiles p
  left join client_bookings cb on cb.profile_id = p.id
  left join client_messages cmes on cmes.profile_id = p.id
  left join client_inquiries cinq on cinq.profile_id = p.id
)
select
  bj.client_id,
  bj.parent_name,
  bj.email,
  bj.phone,
  bj.country,
  bj.role,
  bj.client_created_at,
  bj.engagement_status,
  bj.engagement_cadence_days,
  bj.current_track,
  bj.completed_paid_sessions_count,
  bj.completed_free_sessions_count,
  bj.upcoming_sessions_count,
  bj.cancelled_sessions_count,
  bj.first_completed_paid_session_at,
  bj.last_completed_paid_session_at,
  bj.next_upcoming_session_at,
  bj.last_engagement_at,
  
  -- Recency calculations (in days)
  greatest(0, floor(extract(epoch from (now() - bj.last_engagement_at)) / 86400)::integer) as days_since_last_engagement,
  
  case
    when bj.last_completed_paid_session_at is not null then
      greatest(0, floor(extract(epoch from (now() - bj.last_completed_paid_session_at)) / 86400)::integer)
    else null
  end as days_since_last_session,
  
  -- Lifecycle stage state machine
  case
    when bj.engagement_status = 'opted_out' then 'opted_out'
    when bj.engagement_status = 'paused' then 'paused'
    
    -- Track A state machine
    when bj.current_track = 'track_a' then
      case
        when bj.upcoming_sessions_count > 0 then 'track_a_booked'
        when greatest(0, floor(extract(epoch from (now() - bj.last_engagement_at)) / 86400)::integer) < 60 then 'track_a_active'
        when greatest(0, floor(extract(epoch from (now() - bj.last_engagement_at)) / 86400)::integer) < 90 then 'track_a_taper'
        else 'track_a_inactive'
      end
      
    -- Track B state machine
    when bj.current_track = 'track_b' then
      case
        when bj.upcoming_sessions_count > 0 then 'track_b_active_coaching'
        when bj.last_completed_paid_session_at is not null
          and greatest(0, floor(extract(epoch from (now() - bj.last_completed_paid_session_at)) / 86400)::integer) < 30
          then 'track_b_between_sessions'
        when bj.last_completed_paid_session_at is not null
          and greatest(0, floor(extract(epoch from (now() - bj.last_completed_paid_session_at)) / 86400)::integer) < 45
          then 'track_b_quiet'
        else 'track_b_reengagement_due'
      end
      
    else 'unknown'
  end as lifecycle_stage,
  
  -- Actionable "Next Step" recommendation
  case
    when bj.engagement_status = 'opted_out' then 'Client opted out of automated CRM messaging.'
    when bj.engagement_status = 'paused' then 'Outreach paused by client or admin preference.'
    when bj.current_track = 'track_a' and bj.upcoming_sessions_count > 0
      then 'First paid session booked; awaiting session completion to enter Track B.'
    when bj.current_track = 'track_a' and greatest(0, floor(extract(epoch from (now() - bj.last_engagement_at)) / 86400)::integer) < 60
      then 'Track A nurture active: eligible for next taste content on cadence.'
    when bj.current_track = 'track_a' and greatest(0, floor(extract(epoch from (now() - bj.last_engagement_at)) / 86400)::integer) < 90
      then 'Gone quiet (>60d): tapered outreach cadence in effect.'
    when bj.current_track = 'track_a'
      then 'Inactive (>90d): automated nurture halted to prevent fatigue.'
    when bj.current_track = 'track_b' and bj.upcoming_sessions_count > 0
      then 'Active coaching: upcoming session scheduled.'
    when bj.current_track = 'track_b' and greatest(0, floor(extract(epoch from (now() - bj.last_completed_paid_session_at)) / 86400)::integer) < 30
      then 'Active relationship: continuity care window.'
    when bj.current_track = 'track_b' and greatest(0, floor(extract(epoch from (now() - bj.last_completed_paid_session_at)) / 86400)::integer) < 45
      then 'Approaching 45d threshold with no new booking scheduled.'
    when bj.current_track = 'track_b'
      then 'Gone quiet (>45d): eligible for gentle re-engagement check-in.'
    else 'No action specified.'
  end as next_step_recommendation
from base_journey bj;

-- Grant permissions on view
grant select on public.customer_journey_state to authenticated, service_role, anon;
