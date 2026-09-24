create or replace function public.get_unlock_policies()
returns table (
  schemaname text,
  tablename text,
  policyname text,
  permissive text,
  roles name[],
  cmd text,
  qual text,
  with_check text
)
language sql
security definer
as $$
  select schemaname::text, tablename::text, policyname::text, permissive::text, roles, cmd::text, qual::text, with_check::text
  from pg_policies
  where tablename = 'family_unlocks';
$$;
