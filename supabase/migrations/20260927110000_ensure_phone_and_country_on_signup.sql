-- Migration: Enforce phone number and country of residence requirement for user profiles
-- Rule: No student profile can be added without BOTH a valid phone (min 7 digits) and country of residence.

-- 1. Remove any invalid/incomplete student profiles from public.profiles
delete from public.admin_notifications
where entity_id in (
  select id from public.profiles
  where role != 'admin'
    and (
      phone is null
      or length(regexp_replace(phone, '\D', '', 'g')) < 7
      or country is null
      or length(trim(country)) = 0
    )
);

delete from public.profiles
where role != 'admin'
  and (
    phone is null
    or length(regexp_replace(phone, '\D', '', 'g')) < 7
    or country is null
    or length(trim(country)) = 0
  );

-- 2. Add database-level CHECK constraint to prevent ANY incomplete student profile from ever being inserted or updated
alter table public.profiles
  drop constraint if exists check_student_phone_and_country;

alter table public.profiles
  add constraint check_student_phone_and_country
  check (
    role = 'admin' or (
      phone is not null
      and length(regexp_replace(phone, '\D', '', 'g')) >= 7
      and country is not null
      and length(trim(country)) > 0
    )
  );

-- 3. Update handle_new_user() trigger function
-- If a student signs up without phone or country (e.g. Google OAuth, Magic link), DO NOT create a profile or notification.
-- Profile creation will be handled when they submit /auth/complete-profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_phone text := coalesce(new.raw_user_meta_data->>'phone', null);
  raw_country text := coalesce(new.raw_user_meta_data->>'country', null);
  clean_phone text := regexp_replace(coalesce(raw_phone, ''), '\D', '', 'g');
  is_admin boolean := coalesce(new.raw_user_meta_data->>'role', '') = 'admin' or new.email = 'admin@admin.com';
  inserted_profile_id uuid;
begin
  -- Rule: No student profile can be added without BOTH valid phone (min 7 digits) and country
  if not is_admin and (raw_phone is null or length(clean_phone) < 7 or raw_country is null or length(trim(raw_country)) = 0) then
    -- Do NOT create profile or admin notification
    -- The user will be prompted to complete their profile via /auth/complete-profile
    return new;
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    country,
    role,
    approval_status,
    approved_at,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    raw_phone,
    raw_country,
    case when is_admin then 'admin' else 'student' end,
    'approved',
    now(),
    now(),
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

-- 4. Create complete_user_profile RPC function
-- Called when user submits /auth/complete-profile
create or replace function public.complete_user_profile(
  p_phone text,
  p_country text,
  p_full_name text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_meta_name text;
  clean_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  res public.profiles;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_phone is null or length(clean_phone) < 7 then
    raise exception 'A valid phone number with at least 7 digits is required.';
  end if;

  if p_country is null or length(trim(p_country)) = 0 then
    raise exception 'Country of residence is required.';
  end if;

  select email, raw_user_meta_data->>'full_name'
  into v_user_email, v_meta_name
  from auth.users
  where id = v_user_id;

  insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    country,
    role,
    approval_status,
    approved_at,
    created_at,
    updated_at
  )
  values (
    v_user_id,
    v_user_email,
    coalesce(nullif(trim(p_full_name), ''), v_meta_name, v_user_email),
    p_phone,
    p_country,
    'student',
    'approved',
    now(),
    now(),
    now()
  )
  on conflict (id) do update
    set phone = excluded.phone,
        country = excluded.country,
        full_name = coalesce(nullif(trim(excluded.full_name), ''), profiles.full_name),
        updated_at = now()
  returning * into res;

  -- Create admin notification now that the user has fully registered
  if not exists (
    select 1 from public.admin_notifications
    where entity_id = v_user_id and type = 'new_user_registration'
  ) then
    insert into public.admin_notifications (type, title, message, entity_type, entity_id)
    values (
      'new_user_registration',
      'New user registered',
      coalesce(res.full_name, res.email) || ' created a new account.',
      'profile',
      res.id
    );
  end if;

  return res;
end;
$$;

grant execute on function public.complete_user_profile(text, text, text) to authenticated;

-- 5. RLS policy to allow users to insert their own complete profile
drop policy if exists "Users can insert own complete profile" on public.profiles;

create policy "Users can insert own complete profile"
  on public.profiles
  for insert
  to authenticated
  with check (
    auth.uid() = id
    and (role = 'student' or role is null)
    and phone is not null
    and length(regexp_replace(phone, '\D', '', 'g')) >= 7
    and country is not null
    and length(trim(country)) > 0
  );
