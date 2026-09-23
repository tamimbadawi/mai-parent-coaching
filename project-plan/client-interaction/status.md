# Client Interaction, Voice Session Pipeline & Family Personas — Status

## Current Status: 🟢 Stage 0 Complete & Verified — Ready for Stage 1

- Plan revised from the Antigravity draft on 2026-09-23 after review. See [decisions.md](file:///d:/Cursor/Mai_Website/project-plan/client-interaction/decisions.md), [schema.md](file:///d:/Cursor/Mai_Website/project-plan/client-interaction/schema.md), [next-steps.md](file:///d:/Cursor/Mai_Website/project-plan/client-interaction/next-steps.md).
- **Stage 0 Spike Completed (2026-09-23)**:
  - Audio slice (3 min from `Mockup/` MP3) tested via `scripts/spike-arabic-transcription.js`.
  - Processed in 19.1 seconds.
  - 17 structured conversational utterances correctly attributed between `المحاور` and `د. هبة حريري` with timestamps.
  - Arabic dialect and psychological terms (e.g. "بيج تي تروما وليتل تي تروما", "عطب", "أورجانيك ماركتينج") transcribed verbatim.
  - Full output JSON saved in `Mockup/output/spike_transcript_result.json`.
- Branch for implementation: `feature/session-notes-restored` (or ready to branch `feature/client-interaction`).

## Main changes from the original draft
- Free Gemini tier kept for **testing only, with non-client audio**; revisit before real client recordings.
- Transcription split from analysis; runs as a background job with status tracking and chunking.
- Transcripts stored in the existing `session_content.live_transcript` slot, not a new format.
- Member notes and action items are separate tables, not JSON columns.
- Drive linking is manual first; automatic Meet API lookup is the last stage.
- Recording consent added to bookings.
- Extends existing `MemberStudyModal` instead of adding a parallel persona modal.

## Stage Progress

| Stage | Focus | Status |
| :--- | :--- | :--- |
| 0 | Feasibility checks (Workspace, auto-record, API tier, Arabic spike) | ✅ Complete |
| 1 | Family persona model + editor | ✅ Complete |
| 2 | Unified client card | ⬜ Ready |
| 3 | Recording link + consent | ⬜ |
| 4 | Transcription job | ⬜ |
| 5 | Transcript analysis → member action items | ⬜ |
| 6 | Automatic recording lookup | ⬜ |

## Open questions
- Which Google Workspace edition is Mai's account on?
- Concern-level and family-role option lists (to be supplied by Mai).
