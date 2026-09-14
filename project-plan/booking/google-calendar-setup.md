# Google Calendar OAuth Connection Guide

This guide walks through configuring Google Calendar API access for the Mai Parent Coaching booking system.

---

## 1. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `Mai Website Booking` (or select your existing project).
3. In the sidebar, navigate to **APIs & Services > Library**.
4. Search for **Google Calendar API** and click **Enable**.

---

## 2. Configure OAuth Consent Screen

1. In the sidebar, navigate to **APIs & Services > OAuth consent screen**.
2. Select User Type: **External** and click **Create**.
3. Fill in the App details:
   - **App name**: `Mai Parent Coaching Calendar`
   - **User support email**: Your coaching email.
   - **Developer contact information**: Your developer email.
4. Click **Save and Continue**.
5. Under **Scopes**, click **Add or Remove Scopes** and add:
   - `https://www.googleapis.com/auth/calendar.events` (Manage calendar events)
   - `https://www.googleapis.com/auth/calendar.readonly` (Read calendar availability)
6. Under **Test Users**, add your coach Google account email address.
7. Click **Save and Continue**.

---

## 3. Create OAuth 2.0 Client Credentials

1. Navigate to **APIs & Services > Credentials**.
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
3. Set Application type: **Web application**.
4. Set Name: `Mai Booking Edge Function`.
5. Under **Authorized redirect URIs**, add:
   - `https://qqnthevakllugdlioalm.supabase.co/functions/v1/google-calendar-auth?action=callback`
   - `http://localhost:54321/functions/v1/google-calendar-auth?action=callback` (for local development)
6. Click **Create**.
7. Copy your **Client ID** and **Client Secret**.

---

## 4. Set Supabase Edge Function Secrets

Run the following commands using the Supabase CLI:

```bash
# 1. Set Google OAuth Client ID and Secret
supabase secrets set GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
supabase secrets set GOOGLE_CLIENT_SECRET="your-client-secret"

# 2. Set Calendar ID (default is 'primary')
supabase secrets set GOOGLE_CALENDAR_ID="primary"
```

---

## 5. Authorize the Coach Account (Generate Refresh Token)

1. Open your browser and navigate to:
   ```
   https://qqnthevakllugdlioalm.supabase.co/functions/v1/google-calendar-auth?action=auth-url
   ```
2. Copy the `authUrl` returned in the JSON response, open it in your browser, and sign in with the coach's Google Account.
3. Grant calendar access permissions.
4. Google will redirect back to the callback URL, which displays your **`GOOGLE_REFRESH_TOKEN`**.
5. Save the refresh token in Supabase secrets:
   ```bash
   supabase secrets set GOOGLE_REFRESH_TOKEN="your-refresh-token"
   ```

---

## 6. Verify Connection

Test that the Edge Function can connect and read calendar availability:

```bash
# Invoke the test endpoint with admin auth token
curl -X POST https://qqnthevakllugdlioalm.supabase.co/functions/v1/google-calendar-auth \
  -H "Authorization: Bearer <ADMIN_USER_JWT>" \
  -H "Content-Type: application/json"
```

Once configured, the `get-availability` and `create-booking` Edge Functions will operate autonomously in real time.
