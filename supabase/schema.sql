-- Authentication schema for Mai Parent Coach
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  phone text,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null,
  enrolled_at timestamptz default now(),
  payment_intent_id text,
  amount_paid integer,
  status text not null default 'active' check (status in ('active', 'refunded', 'suspended')),
  unique (user_id, course_id)
);

create table if not exists public.video_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null,
  video_id text not null,
  progress_seconds integer default 0,
  completed boolean default false,
  last_watched_at timestamptz default now(),
  unique (user_id, video_id)
);

alter table public.profiles enable row level security;
alter table public.course_enrollments enable row level security;
alter table public.video_progress enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.profiles
  for select
  using (public.is_admin());

create policy "Users can view own enrollments"
  on public.course_enrollments
  for select
  using (auth.uid() = user_id);

create policy "Admins can view all enrollments"
  on public.course_enrollments
  for select
  using (public.is_admin());

create policy "Users can view own video progress"
  on public.video_progress
  for select
  using (auth.uid() = user_id);

create policy "Users can create own video progress"
  on public.video_progress
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own video progress"
  on public.video_progress
  for update
  using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null), 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
