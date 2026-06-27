-- Temporary debugging policy for the test_connection table.
-- Run this in the Supabase SQL Editor.

alter table public.test_connection enable row level security;

create policy if not exists "Allow anonymous select for test_connection"
on public.test_connection
for select
to anon
using (true);

create policy if not exists "Allow anonymous insert for test_connection"
on public.test_connection
for insert
to anon
with check (true);
