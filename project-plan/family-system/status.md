# Family / Household Client Management System — Status

## Current Status: 🟢 Stages 0–5 Complete and Live-Verified, plus Stage 6 & 7 corrections. Family Case pages merged into Session Notes.

> [!IMPORTANT]
> - Branch: `feature/client-interaction` (family cases consolidated into Session Notes).
> - Session Notes (`/admin/sessions`) is now the single consolidated workspace for family cases. `HouseholdDossier.tsx` and `AdminFamilies.tsx` are retired and deleted. Routes `/admin/families` and `/admin/families/:householdId` redirect to `/admin/sessions`.
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
| **Stage 3** | Session workspace (4 content slots) | ✅ Complete (recap/transcript ingestion deferred — see below) | `src/pages/admin/AdminSessions.tsx`. All 4 slots persist independently to `session_content` via upsert on `(session_id, content_type)`. Post-session notes: freely editable. Handwritten notes: photo upload → Gemini vision OCR (via extended `gemini-generate` Edge Function) → transcribed text appended to the record. Pre-session recap and live-transcript ingestion are intentionally left as empty/manual slots — see "Deferred" below. |
| **Stage 4** | Multi-session analysis (AI layer) | ✅ Complete | New Edge Function `family-session-analysis` + migration `20260922160000_create_clinical_analysis_rules.sql` (empty by default, admin-only RLS). Live end-to-end test (`scripts/verify-family-system-stage4.js`) against the real deployed function confirms: with zero rows in `clinical_analysis_rules`, the response explicitly states "No clinical framework configured yet" rather than inventing one. UI: `MultiSessionAnalysisPanel.tsx`, session multi-select lives in `HouseholdDossier.tsx`. |
| **Stage 5** | Cleanup | ✅ Complete | Superseded prototype fully removed (see branch-ancestry correction above). `grep` confirms zero remaining references to `SuperAdminGate`, `mockSessions`, `useSessionChat`, or `session-intelligence` anywhere in `src/` or `project-plan/`. |

---

## Correction on record: household-to-client relationship (Stage 6)

The first version of Stages 2-5 built `households` as a standalone entity with an *optional* `primary_contact_profile_id`, and a manual "type a family name" creation form. The user flagged this directly: a family case is a spinoff of a real client account, not a parallel record — every household, session, and member must trace back to Clients & Users, and all client interactions must be visible from the case, not just linkable.

Fixed:
- **Migration `20260922170000_require_household_client_link.sql`**: `households.primary_contact_profile_id` is now `NOT NULL`. A household cannot exist without a real client. Verified live: inserting one without it fails with a constraint violation (see `scripts/verify-family-system-client-link.js`).
- **`AdminFamilies.tsx` creation flow rebuilt**: picking an existing client (search over `profiles`) is now step one and mandatory. Step two shows that client's *real* bookings and lets the admin choose which become case sessions. On create: household members (parent, and any named child) and case sessions (with real `session_date`, `google_meet_url`, `booking_id`) are auto-seeded from the selected bookings' actual data, and every seeded member is linked as an attendee on every seeded session — not typed in blind.
- **`AdminUsers.tsx`**: added a "Family Case" deep-link next to the existing "CRM Dossier" link on every client row, matching the established pattern, so the connection works from both directions.
- **`HouseholdDossier.tsx`**: now shows a "Client Account" panel at the top — the linked profile's name/email/phone, a link to their CRM dossier, their `customer_journey_state` engagement snapshot, and their full booking history (not just the ones converted to sessions). Bookings not yet turned into a session are surfaced as one-click "add session from booking" prompts instead of a blank manual form.
- **Attendee visibility**: `session_attendees` connects household members to sessions. Attendee toggling lives in `MemberStudyModal.tsx`'s dedicated Attendance tab, with attendee chips visible across session lists and dossiers.
- Live-verified end to end in `scripts/verify-family-system-client-link.js`: real client + real booking -> household -> seeded members -> seeded session (with `booking_id`) -> attendees -> cross-checked against `customer_journey_state`. All assertions pass against the actual deployed database.

## Correction on record: session workspace UI (Stage 7)

The user pointed at the deleted `feature/session-intelligence-ui` prototype's screenshot (tabbed content + fixed "Session Intelligence" chat panel, client/session dropdowns in the header) as the layout they actually wanted, and said the Stage 3 grid-of-4-panels version wasn't good. Rebuilt `AdminSessions.tsx` around that layout, on the real data:

- Header: client and session dropdown pills (matching the old `SessionControlBar` pattern) live in `AdminLayout`'s action slot, so switching family or session is one click, same as the reference.
- Content pane: tab bar restored visually (`FileText`/`MessageSquare`/`Camera`/`Pencil` icons, active-tab underline), but mapped to what actually exists — **Pre-Session Recap / Live Transcript / Handwritten Notes / Post-Session Notes** — not the old prototype's `Clinical Summary` / `Action Plan` / `Emotional Dynamics` / `Raw Transcript`. Deliberately did not restore the checklist/dropdown clinical fields: those require Mai's real assessment framework, which still doesn't exist (see the `clinical_analysis_rules` guard in Stage 4). Live transcript tab has the old raw-transcript search box back.
- Chat panel: this is now a **real, persisted, multi-turn conversation**, not the old prototype's `isMockMode` simulation. New table `session_chat_messages` (migration `20260922180000`) and Edge Function `session-chat`: scoped to the household (continuous conversation about one family across all their sessions, matching "Context-scoped to {family}" from the old UI), grounded in that family's real case fields + all session content, applies the same no-invented-framework guard as Stage 4, and persists both turns. `SessionChatPanel.tsx` reuses the old prototype's message-bubble/markdown styling almost verbatim (it was well built) but loads/sends against the real backend.
- Live-verified end to end in `scripts/verify-session-chat.js`: a real admin JWT asks a real question about the seeded Jenkins family, gets a reply that correctly cites the actual seeded session content (meltdown duration trend), and both turns are confirmed persisted in `session_chat_messages`.

## Deferred (explicitly, not silently dropped)

- **Pre-session recap auto-generation**: not built. Needs a decision on what should trigger generation and what it should draw from — flagged rather than guessed.
- **Live-transcript ingestion from the Google Meet → Drive → Gemini pipeline**: not built. Needs the actual output format/location of that existing pipeline before wiring it — flagged rather than guessed. Until then, `live_transcript` is a manually-empty slot in the UI.
- **CORS wildcard** on `gemini-generate` and `family-session-analysis` matches the existing repo-wide convention (`Access-Control-Allow-Origin: '*'`) — same as every other Edge Function in `supabase/functions/`. Not tightened here; that's a repo-wide change, not scoped to this module.

## Verification artifacts (real, not mocked)
- `scripts/verify-family-system-rls.js` — Stage 1 RLS, real admin/student JWTs, full CRUD.
- `scripts/verify-family-system-stage4.js` — Stage 4 no-hallucination guard, real deployed Edge Function call.
- `scripts/verify-family-system-client-link.js` — Stage 6 correction: mandatory client link, booking-derived seeding, attendee connections, CRM cross-reference.
- `scripts/verify-session-chat.js` — Stage 7 correction: real multi-turn chat, grounded in actual seeded session content, persisted correctly.
- `scripts/seed-family-system-demo-data.js` / `scripts/remove-family-system-demo-data.js` — extensive realistic demo data (4 families, real auth accounts, bookings, sessions, rich session content) seeded into the live project, clearly tagged (`@demo-family.test` emails, `[DEMO] ` household prefix) so it can be found and removed without touching real clients.
- `npm run build` and `npm run typecheck` both pass; the handful of typecheck errors present in the repo are pre-existing, unrelated to this module (confirmed by filtering typecheck output for this module's files — zero matches).

---

## Family Case Pages Merged into Session Notes (Consolidation)

Session Notes (`/admin/sessions`) is now the single consolidated workspace for a family case:
- `HouseholdDossier.tsx` and `AdminFamilies.tsx` are retired and deleted.
- Routes `/admin/families` and `/admin/families/:householdId` redirect seamlessly to `/admin/sessions?client=<primary_contact_profile_id>` (or `/admin/sessions`).
- Family at a glance panel in Session Notes handles editing family case fields (`presenting_issue`, `working_plan`, `next_step`, `status`) and adding members.
- `MemberStudyModal` Persona tab supports editing core member identity (name, role, birth year) and removing members with confirmation.
- "+ New session" button next to session dropdown allows creating blank sessions or converting unconverted bookings.
- "Start family case" modal is available from Users CRM, Client Dossier, and Session Notes when a client has no household.
