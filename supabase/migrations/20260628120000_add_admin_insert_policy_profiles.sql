-- Add INSERT policy for admins to create profiles manually
-- This is needed for the admin-user-manager Edge Function to work properly

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Admins can insert profiles'
  ) then
    create policy "Admins can insert profiles"
      on public.profiles
      for insert
      to authenticated
      with check (public.is_admin());
  end if;
end
$$;
