# Family / Household Client Management System — Schema Reference

## Tables

### 1. `public.households`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique household identifier |
| `primary_contact_profile_id` | `UUID` | `REFERENCES public.profiles(id) ON DELETE SET NULL` | Linked portal user account (nullable) |
| `family_name` | `TEXT` | `NOT NULL` | Display name (e.g. "The Jenkins Family") |
| `presenting_issue` | `TEXT` | | Core issue Mai is working on with family |
| `working_plan` | `TEXT` | | Current clinical plan / approach |
| `next_step` | `TEXT` | | Immediate next steps |
| `status` | `TEXT` | `NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed'))` | Case status |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Last update timestamp |

### 2. `public.household_members`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique member identifier |
| `household_id` | `UUID` | `NOT NULL REFERENCES public.households(id) ON DELETE CASCADE` | Parent household |
| `full_name` | `TEXT` | `NOT NULL` | Person's name |
| `role` | `TEXT` | `NOT NULL CHECK (role IN ('mother', 'father', 'child', 'guardian', 'other'))` | Family role |
| `birth_year` | `INTEGER` | | Year of birth only (e.g. 2018) for privacy |
| `notes` | `TEXT` | | Clinical/personal notes (e.g., neurodivergence, sensory profile) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Last update timestamp |

### 3. `public.case_sessions`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique session identifier |
| `household_id` | `UUID` | `NOT NULL REFERENCES public.households(id) ON DELETE CASCADE` | Linked household |
| `booking_id` | `UUID` | `REFERENCES public.bookings(id) ON DELETE SET NULL` | Linked booking if originated from scheduler |
| `session_date` | `TIMESTAMPTZ` | `NOT NULL` | Scheduled/completed date & time |
| `duration_minutes` | `INTEGER` | | Planned or actual duration |
| `google_meet_url` | `TEXT` | | Video conference link |
| `status` | `TEXT` | `NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled'))` | Session status |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Last update timestamp |

### 4. `public.session_attendees`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Junction ID |
| `session_id` | `UUID` | `NOT NULL REFERENCES public.case_sessions(id) ON DELETE CASCADE` | Case session link |
| `household_member_id` | `UUID` | `NOT NULL REFERENCES public.household_members(id) ON DELETE CASCADE` | Attending member link |
| *Constraint* | `UNIQUE(session_id, household_member_id)` | | Prevents duplicate attendance entries |

### 5. `public.session_content`
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique content slot ID |
| `session_id` | `UUID` | `NOT NULL REFERENCES public.case_sessions(id) ON DELETE CASCADE` | Case session link |
| `content_type` | `TEXT` | `NOT NULL CHECK (content_type IN ('pre_session_recap', 'live_transcript', 'handwritten_notes', 'post_session_notes'))` | Content source category |
| `content` | `TEXT` | | Transcript, recap, OCR text, or clinical write-up |
| `source_metadata` | `JSONB` | `DEFAULT '{}'::JSONB` | Metadata (e.g. Drive ID, image storage path) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Last edit timestamp |
| *Constraint* | `UNIQUE(session_id, content_type)` | | One slot per content type per session |
