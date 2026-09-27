-- Migration: Ensure phone and country are captured and persisted on user signup
-- Updates handle_new_user() trigger to always persist phone and country from raw_user_meta_data
-- Backfills existing profiles where phone/country exists in user_metadata but not in profiles table

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_profile_id uuid;
begin
  insert into public.profiles (id, email, full_name, phone, country, role, approval_status, approved_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    coalesce(new.raw_user_meta_data->>'phone', null),
    coalesce(new.raw_user_meta_data->>'country', null),
    'student',
    'approved',
    now()
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, profiles.full_name),
        phone = coalesce(excluded.phone, profiles.phone),
        country = coalesce(excluded.country, profiles.country),
        updated_at = now()
  returning id into inserted_profile_id;

  if inserted_profile_id is not null then
    insert into public.admin_notifications (type, title, message, entity_type, entity_id)
    values (
      'new_user_registration',
      'New user registered',
      coalesce(new.raw_user_meta_data->>'full_name', new.email) || ' created a new account.',
      'profile',
      inserted_profile_id
    );
  end if;

  return new;
end;
$$;

-- Backfill profiles missing phone or country from auth.users raw_user_meta_data if present
update public.profiles p
set phone = coalesce(p.phone, u.raw_user_meta_data->>'phone'),
    country = coalesce(p.country, u.raw_user_meta_data->>'country'),
    updated_at = now()
from auth.users u
where p.id = u.id
  and (p.phone is null or p.country is null)
  and (u.raw_user_meta_data->>'phone' is not null or u.raw_user_meta_data->>'country' is not null);
