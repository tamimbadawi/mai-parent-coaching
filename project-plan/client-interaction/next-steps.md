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
STAGE 3: Recording link + consent (manual Drive link)
   ▼
STAGE 4: Transcription job (Drive/upload → Gemini → live_transcript)
   ▼
STAGE 5: Transcript analysis → notes & member action items
   ▼
STAGE 6: Automatic recording lookup (Meet API + scheduled job)
```

---

## Stage 0 — Feasibility checks
Rules out the whole approach cheaply before UI work.
- [ ] Confirm Mai's Google account is on a Workspace edition that can record Meet (Business Standard+).
- [ ] Confirm whether "Record automatically" can be set on events created by `_shared/google-calendar.ts`; otherwise document the manual Record fallback.
- [x] Confirm Gemini API capability for dialectal Arabic audio with speaker diarization.
- [x] Script `scripts/spike-arabic-transcription.js`: sent a 3-minute slice of the `Mockup/` MP3 to Gemini with a two-speaker roster; saved the JSON output to `Mockup/output/spike_transcript_result.json`.
- [x] Judge: Arabic accuracy is near-verbatim, speaker attribution is distinct, timestamps track properly, completed in 19.1s. Recorded findings in `status.md`.
- **Exit:** Stage 0 spike passed. User to confirm branch before Stage 1 begins.

## Stage 1 — Family persona
- [ ] Migration: persona columns on `household_members`, `member_notes`, `member_action_items`, RLS (schema.md).
- [ ] Types in `src/types/family.ts`.
- [ ] Extend `MemberStudyModal.tsx` (don't duplicate) into tabs: **Persona** / **Notes timeline** / **What's required**.
- [ ] `HouseholdDossier.tsx` member cards: persona summary, concern level, triggers/strengths chips, open action count.
- [ ] Verification script: admin full CRUD, student denied on both new tables.

## Stage 2 — Unified client card
- [ ] `ClientDossierModal.tsx`: add case sessions (via the client's household), attendees, recording link, transcript status.
- [ ] Timeline filters: All / Sessions & Recordings / WhatsApp / Inquiries / Family.
- [ ] Family section with member personas + open action items; deep links to `HouseholdDossier` and the session workspace.
- [ ] Loading / empty / error states.

## Stage 3 — Recording link & consent
- [ ] Migration: recording/transcription columns on `case_sessions`, `recording_consent` on `bookings`.
- [ ] Booking form: consent checkbox (clear Arabic/English label), persisted on insert.
- [ ] Session workspace + client card: "Paste Drive link" field (parse file ID, validate), "Open in Google Drive" button.

## Stage 4 — Transcription job
- [ ] Edge Function `session-transcribe` (admin-only, validates JWT + `is_admin`):
  - Input: `session_id`. Refuses if `recording_consent` is false (free-tier phase: also refuses unless explicitly flagged as test data).
  - Gets audio (Stage 4: admin file upload of the recording; Drive download added in Stage 6 when Drive scope exists).
  - Uploads to Gemini Files API, chunked ~10–15 min; prompt includes attendee roster + Mai's name; returns utterance JSON (decisions.md §5).
  - Sets `transcription_status` through `pending → processing → done | failed`; writes `live_transcript`.
- [ ] Widen `TranscriptUtterance` in `src/types/session.ts`; `TranscriptViewer` renders RTL, lets Mai reassign a speaker and edit text.
- [ ] Verify against the Mockup audio and one self-recorded dialect role-play.

## Stage 5 — Analysis
- [ ] Run existing text analysis (`family-session-analysis`) on the saved transcript for summary/insights (clinical-framework guard still applies).
- [ ] Extract action items per member → `member_action_items` with `source='ai'`, `status='suggested'`; Mai accepts or drops in the persona "What's required" tab.

## Stage 6 — Automatic recording lookup
- [ ] Extend `google-calendar-auth` scopes (Drive read-only + Meet read-only); Mai re-consents once.
- [ ] Scheduled job: for completed sessions without `drive_file_id`, look up the Meet conference recording → Drive file ID/link; optionally enqueue transcription.
- [ ] `session-transcribe` can pull audio directly from Drive by file ID.

## Before real client audio is processed
- [ ] Revisit decisions.md §4 (free vs paid Gemini API tier) with the user.
