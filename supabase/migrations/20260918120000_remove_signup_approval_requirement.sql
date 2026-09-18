-- Migration: Remove approval requirement for new signups and set default approval_status to 'approved'

-- 1. Change default approval_status on public.profiles to 'approved'
alter table public.profiles alter column approval_status set default 'approved';

-- 2. Approve any existing pending profiles
update public.profiles
set approval_status = 'approved',
    approved_at = coalesce(approved_at, now())
where approval_status = 'pending';

-- 3. Update handle_new_user() trigger function to create approved profiles immediately
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
