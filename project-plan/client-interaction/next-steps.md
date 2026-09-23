# Client Interaction — Staged Implementation Plan

> [!IMPORTANT]
> - Each stage is its own confirmed step. Do not batch stages.
> - Before Stage 1 touches code: commit or park the current uncommitted work on `feature/session-notes-restored`, then confirm the branch for this feature (e.g. `feature/client-interaction`) with the user.
> - Free Gemini API tier during testing: **non-client audio only** (see decisions.md §4).
> - Suggest a commit at the end of every stage.

```
STAGE 0: Feasibility checks (no app code)
   ▼
STAGE 1: Family persona data model + editor
   ▼
STAGE 2: Unified client card
   ▼
STAGE 3: Recording link (manual Drive link)
   ▼
STAGE 3b: Session page — Prep → Session → Write-up
   ▼
FUTURE: Transcription + summary (parked, see below)
```

---

## Stage 0 — Feasibility checks (⚠️ Partial)
Rules out the whole approach cheaply before UI work.
- [ ] Confirm Mai's Google account is on a Workspace edition that can record Meet (Business Standard+).
- [ ] Confirm whether "Record automatically" can be set on events created by `_shared/google-calendar.ts`; otherwise document the manual Record fallback.
- [x] Confirm Gemini API capability for dialectal Arabic audio with speaker diarization.
- [x] Script `scripts/spike-arabic-transcription.js`: sent a 3-minute slice of the `Mockup/` MP3 to Gemini with a two-speaker roster; saved the JSON output to `Mockup/output/spike_transcript_result.json`.
- [x] Judge: Arabic accuracy is near-verbatim, speaker attribution is distinct, timestamps track properly, completed in 19.1s. Recorded findings in `status.md`.
- **Exit:** Stage 0 spike passed on Arabic transcription; Workspace & event auto-record checks remain open.

## Stage 1 — Family persona
- [x] Migration: persona columns on `household_members`, `member_notes`, `member_action_items`, RLS (`20260923110000_create_family_personas_and_member_notes.sql` pushed to live DB).
- [x] Types in `src/types/family.ts`.
- [x] Extend `MemberStudyModal.tsx` into tabs: **Persona & Profile** / **Longitudinal Notes** / **What is Required** / **Observational Study** / **Attendance**.
- [x] `HouseholdDossier.tsx` member cards: persona summary, concern level, triggers/strengths chips, open action count.
- [x] Verification script: `scripts/verify-family-persona-and-notes-rls.js` confirms admin full CRUD + strict student deny on all tables.

## Stage 2 — Unified client card
- [x] `ClientDossierModal.tsx`: add case sessions (via the client's household), attendees, recording link, transcript status. (Note: "Open in Google Drive" button appears once Stage 3 adds `drive_web_view_url`).
- [x] Timeline filters: All / Sessions & Recordings / WhatsApp / Inquiries / Family.
- [x] Family section with member personas + open action items; deep links to `HouseholdDossier` and the session workspace.
- [x] Loading / empty / error states.
- [x] Verification: Checked with `tsc` (`npx tsc --noEmit -p tsconfig.app.json` - 0 errors in touched files) and `vite build`.

## Stage 3 — Recording link (keep it simple)
- [x] Migration: one column, `case_sessions.drive_web_view_url text`. No consent columns (decisions.md §3).
- [x] Session view (`AdminSessions.tsx`): paste a Drive link, save it, clear it. Only accept links starting with `https://drive.google.com/`.
- [x] Client card: the existing "Open in Google Drive" button shows when the link is set.

## Stage 3b — Session page: Prep → Session → Write-up (decisions.md §9)
- [x] Replace the Notes / Action Plan / Dynamics / Transcript tabs with three steps: Prep, Session, Write-up. Default step chosen by session date.
- [x] Prep: auto recap from existing data ("Your recap before the call — the client doesn't see this") + "My prep notes" (`pre_session_recap`).
- [x] Session: handwritten notes (typed + photo upload that autosaves & appends via Gemini OCR), Drive link, transcript.
- [x] Write-up: consultation write-up, insights, dynamics, per-member action items (`member_action_items`), quick member notes.
- [x] Real save status (check Supabase errors); no demo/mock fallback text on real DB sessions; demo clients labeled with `(Demo)`.

## Future feature (parked 2026-09-23, user decision): automatic transcription + summary
Parked because it was taking too much effort for now. Mai pastes the Drive link, and writes notes / uploads photos of notes as today. Resume from here — **do not repeat the spikes below**.

**Already built and committed (7adc6c0), not wired into any UI:**
- Edge Function `session-transcribe` (deployed; admin-only; refuses anything without `test_mode=true`).
- `scripts/spike-stage4-transcribe.js`; outputs in `Mockup/output/stage4_*.json` (gitignored). Test recordings in `Mockup/test_session_*.mp4|m4a` (Arabic podcast, non-client).

**Spike 1 findings (single request per file):**
| File | Result |
| :--- | :--- |
| 10-min MP4 (14 MB) | ✅ 54 s, valid JSON, near-verbatim dialect Arabic, **2 speakers correctly separated** |
| 60-min audio-only M4A (22 MB) | ✅ 107 s, 7,759 words, timestamps 00:01→57:36 monotonic — but ❌ **all 476 lines labelled as the coach** (speaker separation collapses on long files) |
| 60-min MP4 (82 MB) | ❌ timed out at 305 s |
- Video is token-heavy: 10 min of MP4 = 54,600 input tokens vs 60 min of audio = 90,000.
- 60-min output used 29,581 of 32,768 max output tokens (near the cap).

**Recommended design when resumed (untested — run "spike 2" first):**
1. Upload the recording to the Gemini Files API once (own request).
2. Transcribe in ~10-minute windows (`videoMetadata.startOffset/endOffset`, low fps + `mediaResolution: LOW` for video), absolute timestamps, `maxOutputTokens` 65536; UI shows progress and merges windows into `session_content.live_transcript`.
3. Fallback if windows don't work: extract audio in the browser before upload.
- Free tier ≈ 20 requests/day → ~6 requests per 1-hour session. Revisit decisions.md §4 (paid tier) before any real client audio.
- Then: optional "Summarise" button reusing `family-session-analysis` on the transcript → suggested action items per member.

## Dropped (not needed at this scale)
- Automatic Drive/Meet recording lookup, scheduled jobs, extra Google OAuth scopes. Pasting the link takes seconds. Revisit only if session volume makes it painful.

## Before real client audio is processed
- [ ] Revisit decisions.md §4 (free vs paid Gemini API tier) with the user.
