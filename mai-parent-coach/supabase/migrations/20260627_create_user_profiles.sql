create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  full_name text,
  role text not null default 'member',
  can_access_courses boolean not null default false,
  can_access_dashboard boolean not null default false,
  preferences jsonb default '{}'::jsonb
);

alter table public.user_profiles enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'Users can view their own profile'
  ) then
    create policy "Users can view their own profile"
      on public.user_profiles
      for select
      to authenticated
      using (auth.uid() = id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'Users can update their own profile'
  ) then
    create policy "Users can update their own profile"
      on public.user_profiles
      for update
      to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end
$$;
