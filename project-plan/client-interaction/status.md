# Client Interaction, Voice Session Pipeline & Family Personas — Status

## Current Status: 🟢 Stage 2 Complete & Verified — Ready for Stage 3

- Plan revised from the Antigravity draft on 2026-09-23 after review. See [decisions.md](file:///d:/Cursor/Mai_Website/project-plan/client-interaction/decisions.md), [schema.md](file:///d:/Cursor/Mai_Website/project-plan/client-interaction/schema.md), [next-steps.md](file:///d:/Cursor/Mai_Website/project-plan/client-interaction/next-steps.md).
- **Stage 0 Spike Completed (2026-09-23)**: Audio slice (3 min from `Mockup/` MP3) tested via `scripts/spike-arabic-transcription.js`. Dialectal Arabic accuracy near-verbatim in 19.1s.
- **Stage 1 Complete (2026-09-23)**: Family persona model, `member_notes`, `member_action_items`, migration pushed, `MemberStudyModal` 5-tab redesign, `HouseholdDossier` persona badges, RLS verified.
- **Stage 2 Complete (2026-09-23)**: `ClientDossierModal` unified client card: household & case sessions integrated into touchpoint history, sub-filters (All, Sessions & Recordings, WhatsApp, Inquiries, Family Unit), Family Unit & Personas Hub with member concern badges, open task counters, Google Drive recording links, and Session Workspace deep-links.
- Branch for implementation: `feature/client-interaction`.

## Stage Progress

| Stage | Focus | Status |
| :--- | :--- | :--- |
| 0 | Feasibility checks (Workspace, auto-record, API tier, Arabic spike) | ✅ Complete |
| 1 | Family persona model + editor | ✅ Complete |
| 2 | Unified client card | ✅ Complete |
| 3 | Recording link + consent | ⬜ Ready |
| 4 | Transcription job | ⬜ |
| 5 | Transcript analysis → member action items | ⬜ |
| 6 | Automatic recording lookup | ⬜ |

## Open questions
- Which Google Workspace edition is Mai's account on?
- Concern-level and family-role option lists (to be supplied by Mai).
