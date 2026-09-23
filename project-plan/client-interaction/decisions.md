# Client Interaction, Voice Session Pipeline & Family Personas — Decisions

Reviewed and revised version of the Antigravity draft plan (2026-09-23). This file records what is settled. Treat these as decisions unless the user explicitly revisits them.

---

## 1. Goals (from the user's brief)

1. Every communication with a client (WhatsApp, website inquiries, bookings, case sessions, recordings, notes) is **accessible live from the client card**.
2. Sessions are **Google Meet voice calls** (not video-focused).
3. Booked meetings are **recorded automatically and stored in Google Drive**, never in Supabase Storage.
4. The website **opens the Drive recording from a link** on the session / client card.
5. Recordings are **transcribed automatically**, at zero cost during testing, with the best achievable Arabic quality.
6. Transcripts follow a **conversational, speaker-attributed standard** (who said what, with timestamps) rendered by the existing `TranscriptViewer`.
7. Family members get a **real persona**: Mai's notes over time, whether the member is a source of difficulty, and what is required from them.
8. The Arabic audio in `Mockup/` is used to test the transcription pipeline.

---

## 2. Build on what already exists (do not duplicate)

| Existing piece | Location | How this plan uses it |
| :--- | :--- | :--- |
| Households, members, case sessions, attendees, 4 content slots | `supabase/migrations/20260922150000_create_family_client_system.sql` | Extend, don't replace. |
| `session_content.content_type = 'live_transcript'` | same migration | **This is where transcripts land.** Listed as "deferred" in `family-system/status.md` — this plan fills it. |
| `session_attendees` | same migration | Supplies the speaker roster to the transcription prompt. |
| Meet link creation | `supabase/functions/_shared/google-calendar.ts` (`conferenceData` / `hangoutsMeet`) | Recording settings and Drive lookup attach here. |
| Google OAuth for the coach | `supabase/functions/google-calendar-auth` (Calendar scopes only today) | Extended with Drive/Meet read scopes in Stage 6. |
| Gemini client | `supabase/functions/_shared/gemini.ts` | Reused for transcription; model fallback list respected. |
| Text analysis over session content | `family-session-analysis`, `session-chat` | Analysis runs on the **saved transcript text**, not the audio. |
| Member study | `src/pages/admin/family/MemberStudyModal.tsx`, `supabase/functions/family-member-study` (uncommitted) | **Extend this** into the persona editor; do not create a parallel `MemberPersonaModal`. |
| Transcript rendering | `src/components/sessions/TranscriptViewer.tsx`, `src/types/session.ts` | `TranscriptUtterance.speaker` is currently `'Mai (Coach)' \| 'Parent'` — must be widened (see §5). |
| Clinical-framework guard | `clinical_analysis_rules` (Stage 4) | Still applies: AI must not invent a clinical framework. Persona categories/severity labels come from Mai. |

---

## 3. Google Meet recording → Google Drive

- **Prerequisite (verify first):** Meet recording requires a paid **Google Workspace** edition (Business Standard or higher) on the organizer account. A personal Gmail account cannot record. A consumer "Gemini Pro / Google AI Pro" subscription does **not** add Meet recording.
- Meet recordings are always **MP4** (even for voice-only calls with cameras off). The pipeline accepts MP4 and sends audio to Gemini; no conversion is required for Gemini.
- **Auto-record:** set per meeting ("Record automatically" in the Calendar event's meeting settings), with the Workspace admin allowing it. Whether it can be set programmatically on events created by `_shared/google-calendar.ts` must be **verified in Stage 0**, not assumed. Fallback: Mai presses Record at call start.
- Recordings land in the organizer's `My Drive/Meet Recordings/`. **Nothing is copied into Supabase Storage.** The database stores only the Drive file ID and link.
- **Linking is manual:** Mai pastes the Drive link on the session (Stage 3). Automatic Meet/Drive lookup was dropped as unnecessary at this scale (2026-09-23); revisit only if session volume makes pasting painful.
- **Access:** the Drive link opens in Google Drive under Mai's Google account. Drive's own sharing stays private (organizer only). The website never makes files public.
- **Consent (decided by user, 2026-09-23):** recording consent is collected **outside the website** — Mai's assistant obtains it from the client verbally or in writing. The system stores **no consent flag**: no booking checkbox, no `recording_consent` column, and transcription is not gated on consent in code.

---

## 4. Transcription engine & data-handling decision

> **Parked as a future feature (user, 2026-09-23).** Everything below still applies when it resumes; spike results and the recommended chunked design are in next-steps.md.

- **Engine:** Gemini (Flash-class model via the Gemini API), called only from Edge Functions using `_shared/gemini.ts`. `GEMINI_API_KEY` stays server-side.
- **Decision (user, 2026-09-23): stay on the free Gemini API tier for the testing phase.**
  - Known trade-off, accepted: on the free tier Google may use submitted content to improve its products. Free-tier limits are low (repo comment in `_shared/gemini.ts`: ~20 requests/day for Flash/Pro models).
  - **Guardrail while on the free tier:** test only with non-client audio — the `Mockup/` podcast file and self-recorded role-play sessions. Real client/child recordings are not sent until this decision is revisited.
  - **Revisit before go-live:** switching to the paid API tier (billing linked to the AI Studio / Cloud project) is expected to cost roughly cents per session-hour and changes the data-use terms. Note: the user's Gemini Pro (consumer app) subscription is separate from API billing — confirm in AI Studio which tier the API key's project is on.
- **Two-step pipeline (decided):**
  1. **Transcribe only** → structured utterances saved to `session_content` (`live_transcript`). Mai can review/correct.
  2. **Analyse text** → summary, insights, and action items from the saved transcript, via the existing analysis functions. A failure in step 2 never loses the transcript.
- **Keep it simple (user, 2026-09-23):** one "Transcribe" button → one Edge Function request → transcript saved. No job queue or status tracking. Chunking is added **only if** a real 60-minute recording fails or times out. No automatic Drive/Meet lookup; Mai pastes the Drive link.
- **Speaker attribution:** the prompt receives the session's attendee roster (from `session_attendees`: name + role) and Mai's name, so speakers are labelled as real people. Diarization is model-inferred, not acoustic — Mai can reassign a speaker in the viewer.

---

## 5. Transcript format standard

Stored as JSON in `session_content.content` for `live_transcript`:

```json
{
  "version": 1,
  "language": "ar",
  "source": { "drive_file_id": "...", "model": "...", "chunks": 4 },
  "utterances": [
    { "t": "00:15", "speaker_label": "أ. مي", "speaker_member_id": null, "speaker_role": "coach", "text": "..." },
    { "t": "00:32", "speaker_label": "الأم", "speaker_member_id": "<uuid>", "speaker_role": "mother", "text": "..." }
  ]
}
```

- `speaker_member_id` links to `household_members.id` when known; `null` for Mai or unknown speakers.
- `TranscriptUtterance.speaker` in `src/types/session.ts` is widened from the `'Mai (Coach)' | 'Parent'` union to a label + optional member id + role.
- The viewer renders RTL for Arabic text and keeps the existing search.

---

## 6. Family member persona model

Structured fields on `household_members` (single-valued facts about the member) plus **separate tables** for anything that accumulates over time.

- On `household_members`: `persona_summary` (Mai's write-up), `temperament_traits text[]`, `known_triggers text[]`, `strengths text[]`, `concern_level`, `family_dynamic_role`.
  - `concern_level` / `family_dynamic_role` option lists are **provided by Mai**, not invented by the AI or the developer (consistent with the clinical-framework guard). Until provided, they are free text.
- New table `member_notes`: dated, longitudinal notes per member, optionally tied to a session. Covers "this member is a problem", observations, and follow-ups.
- New table `member_action_items`: "what is required from him/her" — task, status, due date, source session, and whether it was created by Mai or extracted by AI (AI-extracted items start as `suggested` until Mai accepts them).
- All new tables: admin-only RLS using `public.is_admin()`, four per-operation policies, matching the family-system convention.

Full schema: [schema.md](file:///d:/Cursor/Mai_Website/project-plan/client-interaction/schema.md).

---

## 7. Unified client card

`ClientDossierModal.tsx` becomes the single place to see a client's interactions:

- Timeline filters: **All / Sessions & Recordings / WhatsApp / Inquiries / Family**.
- Sessions show date, attendees, recording link (Open in Google Drive), transcript status, and a deep link into the session workspace.
- Family section: members with persona summary, concern level, and open action items count; deep link into `HouseholdDossier`.
- Reads only real DB rows; loading, empty, and error states required (AGENTS.md §12).

---

## 8. Test data

- `Mockup/كيف تؤثر ضغوطنا ... [6QBocv9Xjik].mp3` is a public podcast: 2 speakers, mostly formal Arabic, little overlap. Good for a first pass; **it overstates real-session accuracy**.
- Add at least one self-recorded role-play in dialect with 3 speakers and interruptions before judging quality.
- Mockup audio stays local and is not committed to git.

---

## 9. Session page follows Mai's workflow: Prep → Session → Write-up (user, 2026-09-23)

The session page is organised around Mai's three moments, not by content type. Replaces the Notes / Action Plan / Dynamics / Transcript tabs.

| Step | Purpose | Contents | Storage |
| :--- | :--- | :--- | :--- |
| **Prep** | Recap just before the call ("Your recap before the call — the client doesn't see this") | Auto-assembled (no AI needed): presenting issue + working plan, last session's write-up, open `member_action_items` per member, member concern levels + recent `member_notes`. Plus "My prep notes". | Recap assembled live; prep notes → `session_content.pre_session_recap` |
| **Session** | Raw capture during the call | Handwritten notes (typed, or photo → Gemini OCR **autosaved & appended**), Drive recording link, transcript when available. | `handwritten_notes`, `case_sessions.drive_web_view_url`, `live_transcript` |
| **Write-up** | Fresh analysis right after | Write-up, key insights, dynamics, action items assigned per member, quick member note per attendee. | `post_session_notes`, `member_action_items`, `member_notes` |

- Default step: future session → Prep; today → Session; past without a write-up → Write-up.
- Chat panel stays visible on all steps.
- **Action items live only in `member_action_items`** (with `session_id`), never inside `post_session_notes.source_metadata`. This is what lets "Write-up" feed the next session's "Prep" and the member persona.
- Existing action items in `source_metadata` are demo/seed data; no migration of them needed unless real ones exist.

