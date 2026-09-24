-- Migration: Allow admins to delete their own family_unlocks rows on sign-out or manual lock
create policy "Admins can delete own family unlocks"
  on public.family_unlocks
  for delete
  using (admin_id = auth.uid());
