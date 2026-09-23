# Client Interaction, Voice Session Pipeline & Family Personas — Status

## Current Status: 🟢 Stages 1–3b Complete & Verified — Transcription parked as a future feature
- Plan revised from the Antigravity draft on 2026-09-23 after review. See [decisions.md](file:///d:/Cursor/Mai_Website/project-plan/client-interaction/decisions.md), [schema.md](file:///d:/Cursor/Mai_Website/project-plan/client-interaction/schema.md), [next-steps.md](file:///d:/Cursor/Mai_Website/project-plan/client-interaction/next-steps.md).
- **Stage 0 Spike (⚠️ Partial, 2026-09-23)**: Audio slice (3 min from `Mockup/` MP3) tested via `scripts/spike-arabic-transcription.js`. Dialectal Arabic accuracy near-verbatim in 19.1s. Note: Workspace recording capability and calendar auto-record checks remain open.
- **Stage 1 Complete (2026-09-23)**: Family persona model, `member_notes`, `member_action_items`, migration pushed, `MemberStudyModal` 5-tab redesign, `HouseholdDossier` persona badges, RLS verified.
- **Stage 2 Complete (2026-09-23)**: `ClientDossierModal` unified client card: household & case sessions integrated into touchpoint history, sub-filters (All, Sessions & Recordings, WhatsApp, Inquiries, Family Unit), Family Unit & Personas Hub with member concern badges, open task counters, Google Drive recording links, and Session Workspace deep-links.
- **Stage 3 Complete (2026-09-23)**: Added `case_sessions.drive_web_view_url`, pushed migration `20260923120000_add_drive_web_view_url_to_case_sessions.sql` to live DB, updated `CaseSession` and `SessionTranscript` types, added Drive recording link input bar with `https://drive.google.com/` validation, Save, and Clear buttons in `AdminSessions.tsx`, and verified "Open Voice Recording in Google Drive" button displays in `ClientDossierModal` (`target="_blank" rel="noopener noreferrer"`).
- **Stage 3b Complete (2026-09-23)**: Restructured Session Notes into three workflow steps: **Before · Session · After** (`SessionWorkflowTabs.tsx`, `SessionBeforeStep.tsx`, `SessionDuringStep.tsx`, `SessionAfterStep.tsx`, `TranscriptViewer.tsx`). Per-section discrete saves (`pre_session_recap`, `handwritten_notes`, `post_session_notes`, `drive_web_view_url`), active household lazy queries (3 queries in `Promise.all`), browser canvas photo downscaling (max 1600px, JPEG 0.8) for Gemini OCR note transcription, local time date evaluation (`isToday` / `isFuture`) for default step assignment on first session open, removal of mock fallback data on real DB sessions, and labeling of demo clients as `<name> (Demo)`.
- **Verification**: Verified with strict TypeScript checks (`npm run build` passing with 0 errors across all touched files).
- Branch for implementation: `feature/client-interaction`.

## Stage Progress

| Stage | Focus | Status |
| :--- | :--- | :--- |
| 0 | Feasibility checks (Workspace, auto-record, API tier, Arabic spike) | ⚠️ Partial |
| 1 | Family persona model + editor | ✅ Complete |
| 2 | Unified client card | ✅ Complete |
| 3 | Recording link (consent handled off-platform) | ✅ Complete |
| 3b | Session page: Before → Session → After | ✅ Complete |
| 4 | Transcribe button | 💤 Future feature (parked 2026-09-23; spike findings in next-steps.md) |
| 5 | Summary & action items (optional) | 💤 Future feature (depends on transcription) |
| — | Automatic recording lookup | Dropped (not needed at this scale) |

## Open questions
- Which Google Workspace edition is Mai's account on?
- Concern-level and family-role option lists (to be supplied by Mai).
