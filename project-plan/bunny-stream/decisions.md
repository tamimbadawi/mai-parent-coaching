# Bunny Stream — Architectural Decisions

These decisions govern Antigravity's implementation unless the owner explicitly revises them.

## Delivery and access

- Bunny Stream remains the video host; Supabase Auth, `course_enrollments`, and Edge Functions control website access.
- Paid lesson playback requires a signed-in user with an **active** enrollment for the matching course. A suspended or refunded enrollment grants no access.
- The server resolves the requested course and lesson to its configured Bunny video ID. A client-supplied Bunny GUID alone is never sufficient authorization.
- The server creates a short-lived signed embed URL using Bunny's **Embed View Token Authentication** key. Enable the corresponding setting on the Bunny library before publishing paid videos. Keep the token key and Bunny API key only in Supabase secrets.
- Verify the signing algorithm and player URL against current official Bunny documentation during implementation. CDN pull-zone token signing is a different mechanism and must not be substituted without verification.
- Public course pages show curriculum metadata; paid playback appears only after the server confirms access. A preview needs an explicitly designated public preview video and separate approval.

## Content mapping

- `src/data/content.ts` remains the course catalog source of truth for this phase. Preserve existing course, module, and lesson IDs.
- Map each published lesson to a Bunny video GUID through its `bunnyVideoId`. Make the same mapping available to the server from a single shared source or a protected database mapping; do not maintain unrelated duplicate lists.
- Admin inventory is read-only until a deliberate mapping workflow is built. Never auto-match videos to lessons by title.
- Missing, unprocessed, or unmapped videos show an unavailable state. They must never silently fall back to a different video.

## Student experience and progress

- Students select lessons from enrolled course curriculum. The player has loading, locked, unavailable, and error states, with a retry path.
- `video_progress` records the signed-in user's lesson ID, course ID, last watched position, completion, and update time. Validate that the lesson belongs to the course and that enrollment is active before accepting progress writes; tighten RLS or use an authenticated Edge Function as needed.
- Respect reduced motion, keyboard navigation, and accessible player labels. Do not log student or family details.

## Boundaries

- Do not add checkout, payments, CMS migration, bulk upload, or Bunny credential management to this phase.
- Do not expose service role, Bunny API, or embed token keys in Vite variables or browser bundles.
- All schema or RLS changes require timestamped migrations under `supabase/migrations`.
- Preserve existing WhatsApp work and all unrelated uncommitted changes on `feature/whatsapp-service`.
