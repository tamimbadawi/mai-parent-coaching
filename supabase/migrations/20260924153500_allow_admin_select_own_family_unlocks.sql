-- Migration: Allow admins to select own family_unlocks rows
-- Required by PostgreSQL so WHERE clauses in DELETE / UPDATE queries can match own rows
create policy "Admins can view own family unlocks"
  on public.family_unlocks
  for select
  using (admin_id = auth.uid());
