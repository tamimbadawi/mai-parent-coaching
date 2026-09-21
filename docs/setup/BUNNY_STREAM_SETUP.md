# Bunny.net Stream Setup

The example library is **Mai Website Courses** (ID `757619`). The example video is **Karim Waving.mp4** (ID `fd9e91b3-4a79-4f2f-8b16-ac07b8818642`). It is a 10-second test clip in the admin inventory, not a parenting lesson. The library CDN hostname is `vz-53b7328c-fd4.b-cdn.net`.

## Frontend env

Add these to your root `.env` file:

```env
VITE_BUNNY_STREAM_LIBRARY_ID=your_library_id
VITE_BUNNY_STREAM_CDN_HOSTNAME=your_pull_zone_hostname.b-cdn.net
```

## Supabase function secrets

Set these secrets on the hosted project:

```powershell
npx supabase secrets set BUNNY_STREAM_LIBRARY_ID=your_library_id --project-ref qqnthevakllugdlioalm
npx supabase secrets set BUNNY_STREAM_API_KEY=your_stream_api_key --project-ref qqnthevakllugdlioalm
npx supabase secrets set BUNNY_STREAM_CDN_HOSTNAME=your_pull_zone_hostname.b-cdn.net --project-ref qqnthevakllugdlioalm
npx supabase secrets set BUNNY_STREAM_EMBED_TOKEN_KEY=your_embed_view_token_key --project-ref qqnthevakllugdlioalm
```

Find the API key under **Stream → Mai Website Courses → API** and the token key under **Security → General → Token authentication key**. Never put either key in `.env`, screenshots, commits, or browser JavaScript. Supabase provides `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions.

In Bunny **Security → General**, turn on **Embed view token authentication** after the Edge Function and secrets are deployed. Turn off **Enable direct play** so a bare video ID cannot bypass the signed player. Follow [Bunny's signing specification](https://github.com/BunnyWay/documentation/blob/main/stream/token-authentication.mdx); the embed token is SHA-256 hex of key + video ID + Unix expiration seconds.

## Deploy the Bunny manager function

```powershell
npx supabase functions deploy bunny-stream-manager --project-ref qqnthevakllugdlioalm --use-api
```

## What this enables

- Admin-side Bunny Stream configuration status in the courses panel
- Admin-side Bunny video listing via Supabase Edge Function
- Secure admin preview of processed library videos in `/admin/courses`
- Enrolled-student playback for lesson IDs listed in `src/data/courseVideoIds.ts`
- Edge Function progress reads and writes for mapped lessons

The example clip is intentionally not mapped to the course curriculum. Add a real lesson video GUID to `src/data/courseVideoIds.ts` when that lesson is ready. Deploy the matching frontend and Edge Function together. Apply migration `20260920120000_secure_video_progress.sql` before testing progress.

## Verification

1. Confirm `/admin/courses` lists the example and **Preview securely** plays it for an admin.
2. Confirm an unauthenticated caller and a student cannot invoke admin preview.
3. Confirm an active student enrollment can play a mapped lesson and a suspended/refunded enrollment cannot.
4. Confirm seeking and completing a lesson save progress across reloads.
5. Confirm a direct unsigned Bunny embed and direct play URL are denied after security settings are enabled.
