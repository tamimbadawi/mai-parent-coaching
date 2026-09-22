# Gemini AI Integration — Status

## Current Status: 🟢 Wired and Verified

Shared, server-side Gemini client + one general-purpose callable Edge Function. Any future feature (family-system multi-session analysis, handwritten-note OCR, chat, etc.) builds on this rather than re-wiring the API key or auth pattern from scratch.

---

## What exists

| Piece | Location | Purpose |
| :--- | :--- | :--- |
| Shared client | `supabase/functions/_shared/gemini.ts` | `generateText()` and `generateFromImage()` helpers. Reads `GEMINI_API_KEY` from Edge Function environment only. |
| Callable endpoint | `supabase/functions/gemini-generate/index.ts` | Admin-only (`profiles.role = 'admin'`), verifies a real Supabase session via `auth.getUser(token)` — no service-role-token shortcuts. Generic error responses to the client; full detail logged server-side only. |
| Secret | Supabase Edge Function secret `GEMINI_API_KEY` | Set via `supabase secrets set`. Never in any `.env` file, never `VITE_`-prefixed, never reaches the browser. |

## Verified

- End-to-end call through the deployed function returns real Gemini output (confirmed with a live round-trip test).
- Unauthenticated requests are rejected (401).
- Default model is `gemini-3.6-flash` (the prior default, `gemini-2.0-flash`, was confirmed deprecated by the API itself during testing — 404 "no longer available").

## Consumers (updated)

- `family-system` Stage 3 (handwritten-note OCR) and Stage 4 (multi-session pattern analysis) both consume this now — see `project-plan/family-system/status.md`. `gemini-generate` was extended to accept an optional `imageBase64`/`imageMimeType` for the OCR path. A second, purpose-built function `family-session-analysis` (not just `gemini-generate`) handles Stage 4, since it needs to gather `session_content` across multiple sessions and enforce the "no invented clinical framework" guard server-side.

## Deliberately out of scope here

- CORS on `gemini-generate` currently matches this codebase's existing wildcard convention (`Access-Control-Allow-Origin: '*'`), same as every other Edge Function here. This is a known, pre-existing pattern across the whole `supabase/functions/` directory, not something introduced by this module — tightening it is a repo-wide change, not scoped to Gemini specifically.
