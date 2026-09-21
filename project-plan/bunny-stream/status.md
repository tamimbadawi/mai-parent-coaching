# Bunny Stream — Status

## Current Status: Admin example playback verified in production

## Completed on 20 September 2026

- Created Bunny Stream library `757619` (`Mai Website Courses`) and uploaded the approved example video, `Karim Waving` (`fd9e91b3-4a79-4f2f-8b16-ac07b8818642`). The example remains admin-only and is not mapped to a paid course lesson.
- Disabled direct play and enabled Embed View token authentication in the Bunny library.
- Deployed the updated `bunny-stream-manager` Edge Function to Supabase project `qqnthevakllugdlioalm`. It checks admin or active enrollment access before issuing a one-hour signed embed URL. An unauthenticated request returned HTTP 401.
- Applied migration `20260920120000_secure_video_progress.sql` to prevent direct client progress writes and scope the uniqueness constraint by course. The owner explicitly approved this migration.
- Added the admin preview UI, secured student playback path, and progress save and resume path. `npm run build` passes. A Vercel preview is ready at `https://mai-parent-coaching-o3jtw1ibm-asacontracting.vercel.app`.
- Verified both Bunny private secret names in Supabase. Added the exact Vercel preview callback URL to the Supabase auth redirect allowlist with owner approval.
- Signed in as an admin on the Vercel preview. `/admin/courses` reported the Bunny connection as ready, listed `Karim Waving.mp4` with processing status `4`, and loaded a signed embed. The video played and its seek position advanced past three seconds.
- Prepared a separate main-based release worktree containing only Bunny changes. Its production build passes and its diff excludes the unrelated WhatsApp branch.
- Published the Bunny-only release to the live Vercel site with owner approval. Signed in as an admin at `https://mai-parent-coaching.vercel.app/admin/courses`; the page listed the processed example and the signed player advanced past four seconds.

## Remaining gates

1. After a real course lesson video and enrollment test account are available, map its GUID in `src/data/courseVideoIds.ts`, verify active and inactive student cases, and verify progress survives reload. The example clip remains admin-only as requested.
2. The exact preview callback URL remains in Supabase's auth redirect allowlist at the owner's request, so the preview continues to support Google sign-in.

## Coding Agent

**Antigravity** remains the designated coding agent in the project plan. Continue from this status and record evidence after each gate.
