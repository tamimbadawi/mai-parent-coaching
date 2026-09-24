# Family / Household Client Management System — Architectural Decisions

## Settled Decisions

### 1. Household as the Core Unit of Care
- **Decision**: Coaching and child psychology operate on the family/household level rather than solitary user accounts.
- **Implementation**: The `households` table represents the family unit (e.g. "The Jenkins Family") and links optionally to a `profiles(id)` for primary contact login, allowing households to exist before or without an active client portal login.

### 2. Privacy-Preserving Minor Records
- **Decision**: Minors' precise date of birth is not collected or stored.
- **Implementation**: `household_members` stores `birth_year` (INTEGER) instead of full DOB (`YYYY`). Age is derived as `EXTRACT(YEAR FROM now()) - birth_year`. This minimizes PII storage risks for children while giving full clinical age context.

### 3. Session & Attendee Granularity
- **Decision**: Clinical sessions (`case_sessions`) belong to households and can involve any subset of household members (mother-only, father-only, both parents, child, or whole family).
- **Implementation**: Normalized `case_sessions` table with a `session_attendees` junction table enforcing a unique constraint on `(session_id, household_member_id)`.

### 4. Four Distinct Session Content Slots
- **Decision**: Clinical documentation arrives from disparate streams and must not be mashed into a single blob.
- **Implementation**: `session_content` stores records per `(session_id, content_type)` where `content_type` is one of:
  - `pre_session_recap`
  - `live_transcript`
  - `handwritten_notes` (OCR from image uploads)
  - `post_session_notes` (Mai's typed write-up)

### 5. Access Control: Admin Role + Shared Family Sessions Password
- **Decision (revised 2026-09-24, supersedes "no secondary passcodes")**: Family Sessions content sits behind a single shared password that any admin can enter. Being an admin alone is not enough to read session content or clinical records. No per-admin passwords, no "super-admin" tier.
- **Implementation**:
  - Password lives only as an Edge Function secret (`FAMILY_SESSIONS_PASSWORD`), never in frontend code or env.
  - `family-unlock` Edge Function verifies the admin + password and writes a time-limited row to `family_unlocks` (8h). Basic brute-force guard: 5 failed attempts per admin per 15 min.
  - **Clinical fields segregated**: `households` and `household_members` hold strictly non-clinical data (names, roles, birth years, contact links, status) and remain accessible to any authenticated admin without password, allowing CRM badges and Client Dossier summary views to work without unlocking.
  - All clinical and persona fields reside in dedicated 1-to-1 extension tables:
    - `household_clinical` (`household_id` PK → `households`, `presenting_issue`, `working_plan`, `next_step`, `updated_at`).
    - `member_personas` (`household_member_id` PK → `household_members`, `persona_summary`, `temperament_traits`, `known_triggers`, `strengths`, `concern_level`, `family_dynamic_role`, `notes`, `updated_at`).
  - RLS on gated tables (`household_clinical`, `member_personas`, `case_sessions`, `session_attendees`, `session_content`, `member_notes`, `member_action_items`, `session_chat_messages`) requires `is_admin() AND has_family_unlock()`.
  - Family AI Edge Functions (`session-chat`, `family-session-analysis`, `family-member-study`, `session-transcribe`) also reject callers without an active unlock and read clinical/persona data from the gated tables.
  - Frontend: unlock screen on `/admin/sessions` (and anything opening member study/notes); this is UX only, security is enforced by RLS + Edge Functions. Locking deletes the admin's `family_unlocks` rows immediately.

### 6. Clinical Assessment Framework Discipline
- **Decision**: Gemini AI must not hallucinate clinical frameworks or diagnostic categories.
- **Implementation**: Multi-session analysis defaults to raw pattern extraction with an explicit disclaimer unless an authorized `clinical_analysis_rules` config is provided by Mai.
