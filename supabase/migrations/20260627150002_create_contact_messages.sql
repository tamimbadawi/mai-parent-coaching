create extension if not exists "uuid-ossp" schema extensions;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  name text not null,
  email text not null,
  phone text,
  subject text not null,
  message text not null
);

alter table public.contact_messages enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'contact_messages'
      and policyname = 'Allow anyone to insert contact messages'
  ) then
    create policy "Allow anyone to insert contact messages"
      on public.contact_messages
      for insert
      to anon
      with check (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'contact_messages'
      and policyname = 'Allow authenticated admins to select contact messages'
  ) then
    create policy "Allow authenticated admins to select contact messages"
      on public.contact_messages
      for select
      to authenticated
      using (true);
  end if;
end
$$;
