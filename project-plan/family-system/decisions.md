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

### 5. Access Control & Single Administrator
- **Decision**: Mai is the only administrator. No secondary passcodes, client-side unlock modals, or "super-admin" tiers.
- **Implementation**: RLS policy checks `profiles.role = 'admin'`. Frontend gates access using standard `ProtectedRoute requiredRole="admin"`.

### 6. Clinical Assessment Framework Discipline
- **Decision**: Gemini AI must not hallucinate clinical frameworks or diagnostic categories.
- **Implementation**: Multi-session analysis defaults to raw pattern extraction with an explicit disclaimer unless an authorized `clinical_analysis_rules` config is provided by Mai.
