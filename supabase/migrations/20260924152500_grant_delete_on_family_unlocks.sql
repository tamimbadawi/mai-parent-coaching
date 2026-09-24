-- Grant delete and select to authenticated so PostgREST can evaluate where clause and execute delete
grant delete, select on public.family_unlocks to authenticated;
