# Bunny.net Stream Setup

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
```

## Deploy the Bunny manager function

```powershell
npx supabase functions deploy bunny-stream-manager --project-ref qqnthevakllugdlioalm --use-api
```

## What this enables

- Admin-side Bunny Stream configuration status in the courses panel
- Admin-side Bunny video listing via Supabase Edge Function
- Frontend embed support for course videos with `bunnyVideoId`