# Edge Function Setup Guide

## admin-user-manager Edge Function

The `admin-user-manager` Edge Function requires the `SERVICE_ROLE_KEY` environment variable to perform admin operations (create, update, delete users).

### Required Environment Variable

**Variable Name:** `SERVICE_ROLE_KEY`

**How to add it:**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/qqnthevakllugdlioalm/functions
2. Click on the `admin-user-manager` function
3. Navigate to the **Settings** tab
4. Scroll down to the **Environment Variables** section
5. Click **Add Environment Variable**
6. Enter `SERVICE_ROLE_KEY` as the name
7. Get your Service Role Key from:
   - Supabase Dashboard → Project Settings → API
   - Copy the "service_role" key (the secret one, NOT the anon key)
8. Paste the key as the value
9. Save the changes

### Why is this needed?

The Edge Function uses the Service Role Key to:
- Create users via `client.auth.admin.createUser()`
- Update users via `client.auth.admin.updateUserById()`
- Delete users via `client.auth.admin.deleteUser()`
- Bypass RLS policies when updating profiles

The Service Role Key has full admin privileges and should never be exposed in frontend code. It's safe to use in Edge Functions because they run server-side.

### Verification

After adding the environment variable, test the admin user management by:
1. Creating a new user in the admin dashboard
2. Approving a pending user
3. Updating user details
4. Check the browser console for any errors

If the function still fails, check:
- The variable name is exactly `SERVICE_ROLE_KEY`
- The key value is correct (not the anon key)
- The function is deployed (run `supabase functions deploy admin-user-manager`)
