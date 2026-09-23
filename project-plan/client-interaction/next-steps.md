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
STAGE 4: Transcribe button (upload → Gemini → live_transcript)
   ▼
STAGE 5: Summary & action items (optional)
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

## Stage 3b — Session page: Before → Session → After (decisions.md §9)
- [x] Replace the Notes / Action Plan / Dynamics / Transcript tabs with three steps: Before, Session, After. Default step chosen by session date.
- [x] Before: auto recap from existing data + "My prep notes" (`pre_session_recap`).
- [x] Session: handwritten notes (typed + photo upload that appends via Gemini OCR), Drive link, transcript.
- [x] After: write-up, insights, dynamics, per-member action items (`member_action_items`), quick member notes.
- [x] Real save status (check Supabase errors); no demo/mock fallback text on real DB sessions; demo clients labeled with `(Demo)`.

## Stage 4 — Transcribe button
- [ ] Edge Function `session-transcribe` (admin-only, same auth pattern as `gemini-generate`): Mai uploads the recording file for a session → Gemini → transcript JSON (decisions.md §5) saved into `session_content` `live_transcript`. The prompt includes the attendee names.
- [ ] Try one plain request first. Only add chunking if a real 60-minute recording actually fails or times out.
- [ ] `TranscriptViewer`: show Arabic right-to-left, with real speaker names. Editing text uses the existing edit pattern.
- [ ] Test with the Mockup audio.

## Stage 5 — Summary & action items (optional)
- [ ] "Summarise" button reusing `family-session-analysis` on the saved transcript. Suggested action items can be added to a member with one click.

## Dropped (not needed at this scale)
- Automatic Drive/Meet recording lookup, scheduled jobs, extra Google OAuth scopes. Pasting the link takes seconds. Revisit only if session volume makes it painful.

## Before real client audio is processed
- [ ] Revisit decisions.md §4 (free vs paid Gemini API tier) with the user.
