create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  read_at timestamptz
);

alter table public.admin_notifications enable row level security;

alter table public.profiles add column if not exists approval_status text;
alter table public.profiles add column if not exists approved_at timestamptz;

update public.profiles
set approval_status = 'approved',
    approved_at = coalesce(approved_at, now())
where approval_status is null;

alter table public.profiles alter column approval_status set default 'pending';
alter table public.profiles alter column approval_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_approval_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_approval_status_check
      check (approval_status in ('pending', 'approved', 'rejected'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_notifications'
      and policyname = 'Admins can view all notifications'
  ) then
    create policy "Admins can view all notifications"
      on public.admin_notifications
      for select
      to authenticated
      using (public.is_admin());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_notifications'
      and policyname = 'Admins can update notifications'
  ) then
    create policy "Admins can update notifications"
      on public.admin_notifications
      for update
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_profile_id uuid;
begin
  insert into public.profiles (id, email, full_name, role, approval_status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    'student',
    'pending'
  )
  on conflict (id) do nothing
  returning id into inserted_profile_id;

  if inserted_profile_id is not null then
    insert into public.admin_notifications (type, title, message, entity_type, entity_id)
    values (
      'new_user_registration',
      'New user awaiting approval',
      coalesce(new.raw_user_meta_data->>'full_name', new.email) || ' registered and is waiting for approval.',
      'profile',
      inserted_profile_id
    );
  end if;

  return new;
end;
$$;