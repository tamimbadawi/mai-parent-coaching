# Family / Household Client Management System — Status

## Current Status: 🟢 Stages 0–4 Complete and Live-Verified. Stage 5 Complete.

> [!IMPORTANT]
> - Branch: `feature/family-client-system`, correctly based on `main` (see note below — this needed a fix).
> - Mai is the only administrator; all admin routes use standard `ProtectedRoute requiredRole="admin"`. There is no separate "Super Admin" tier anywhere in this module.
> - Not yet merged to `main`. Not yet pushed to the remote branch.

---

## Overview & Purpose
Core clinical and client-management system for Mai (child psychologist & parent coach): households with mother/father/children as linked records (birth-year only, not full DOB, for minor privacy), sessions with a flexible per-session attendee list, four distinct session content streams (pre-session recap, live transcript, handwritten-notes OCR via Gemini, post-session notes), and cross-session pattern analysis that is explicitly forbidden from inventing a clinical framework until Mai's real one is captured.

---

## Correction on record: branch ancestry

Stage 0 was originally marked complete as "branched fresh from `main`," but that was inaccurate — the branch had actually been cut from `feature/session-intelligence-ui` (an earlier, unrelated mock prototype with a client-side passcode "Super Admin" gate and no real persistence). This was caught during review, before any of this stage's work was committed. Fix applied directly: `git reset --mixed main` to move the branch base back to the correct point, then the superseded prototype files were removed from the working tree (`SuperAdminGate.tsx`, `AdminSessions.tsx`, `mockSessions.ts`, `useSessionChat.ts`, `src/components/sessions/*`, `src/types/session.ts`, `project-plan/session-intelligence/*`), and `src/App.tsx` / `AdminLayout.tsx` / `ClientDossierModal.tsx` were manually reverted to drop the old prototype's route, nav item, and CRM deep-link before the new ones were added. Nothing from that prototype remains in this branch or its history.

---

## Stage Progress Tracker

| Stage | Focus | Status | Verified |
| :--- | :--- | :--- | :--- |
| **Stage 0** | Branch setup & access model | ✅ Complete | Branch correctly based on `main` (see correction above). No passcode/mock tier — standard `requiredRole="admin"` only. |
| **Stage 1** | Household & family data model | ✅ Complete | Migration `20260922150000_create_family_client_system.sql` — `households`, `household_members`, `case_sessions`, `session_attendees`, `session_content`. RLS uses `public.is_admin()` with 4 per-operation policies per table (20 policies total), matching the `crm_content_library` convention. Applied to the real Supabase project via `supabase db push` (local Docker unavailable on this machine). Live-verified with real authenticated Admin vs. Student JWTs in `scripts/verify-family-system-rls.js` — admin gets full CRUD, student is denied on all 5 tables. |
| **Stage 2** | Household list & dossier UI | ✅ Complete | `src/pages/admin/AdminFamilies.tsx` (searchable/filterable list, create-household flow, deep-link bridge from the CRM dossier's "View Family Case" link) and `src/pages/admin/family/HouseholdDossier.tsx` (members with computed age, inline-editable case fields, session list, session creation). All reads/writes hit real Supabase tables — no mock/in-memory-only state. |
| **Stage 3** | Session workspace (4 content slots) | ✅ Complete (recap/transcript ingestion deferred — see below) | `src/pages/admin/family/SessionWorkspace.tsx`. All 4 slots persist independently to `session_content` via upsert on `(session_id, content_type)`. Post-session notes: freely editable. Handwritten notes: photo upload → Gemini vision OCR (via extended `gemini-generate` Edge Function) → transcribed text appended to the record. Pre-session recap and live-transcript ingestion are intentionally left as empty/manual slots — see "Deferred" below. |
| **Stage 4** | Multi-session analysis (AI layer) | ✅ Complete | New Edge Function `family-session-analysis` + migration `20260922160000_create_clinical_analysis_rules.sql` (empty by default, admin-only RLS). Live end-to-end test (`scripts/verify-family-system-stage4.js`) against the real deployed function confirms: with zero rows in `clinical_analysis_rules`, the response explicitly states "No clinical framework configured yet" rather than inventing one. UI: `MultiSessionAnalysisPanel.tsx`, session multi-select lives in `HouseholdDossier.tsx`. |
| **Stage 5** | Cleanup | ✅ Complete | Superseded prototype fully removed (see branch-ancestry correction above). `grep` confirms zero remaining references to `SuperAdminGate`, `mockSessions`, `AdminSessions`, `useSessionChat`, or `session-intelligence` anywhere in `src/` or `project-plan/`. |

---

## Deferred (explicitly, not silently dropped)

- **Pre-session recap auto-generation**: not built. Needs a decision on what should trigger generation and what it should draw from — flagged rather than guessed.
- **Live-transcript ingestion from the Google Meet → Drive → Gemini pipeline**: not built. Needs the actual output format/location of that existing pipeline before wiring it — flagged rather than guessed. Until then, `live_transcript` is a manually-empty slot in the UI.
- **CORS wildcard** on `gemini-generate` and `family-session-analysis` matches the existing repo-wide convention (`Access-Control-Allow-Origin: '*'`) — same as every other Edge Function in `supabase/functions/`. Not tightened here; that's a repo-wide change, not scoped to this module.

## Verification artifacts (real, not mocked)
- `scripts/verify-family-system-rls.js` — Stage 1 RLS, real admin/student JWTs, full CRUD.
- `scripts/verify-family-system-stage4.js` — Stage 4 no-hallucination guard, real deployed Edge Function call.
- `npm run build` and `npm run typecheck` both pass; the handful of typecheck errors present in the repo are pre-existing, unrelated to this module (confirmed by filtering typecheck output for this module's files — zero matches).
