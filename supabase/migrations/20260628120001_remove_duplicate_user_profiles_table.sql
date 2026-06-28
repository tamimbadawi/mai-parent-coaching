-- Remove the duplicate user_profiles table that was created by mistake
-- The application uses the 'profiles' table, not 'user_profiles'

drop table if exists public.user_profiles cascade;
