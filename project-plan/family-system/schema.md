# Family / Household Client Management System — Schema Reference

## Tables

### 1. `public.households` (Non-clinical, Admin-readable)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique household identifier |
| `primary_contact_profile_id` | `UUID` | `NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE` | Linked portal user account (mandatory client link) |
| `family_name` | `TEXT` | `NOT NULL` | Display name (e.g. "The Jenkins Family") |
| `status` | `TEXT` | `NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed'))` | Case status |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Last update timestamp |

### 2. `public.household_clinical` (Clinical, Gated by Password Unlock)
*RLS Policy: `is_admin() AND has_family_unlock()`*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `household_id` | `UUID` | `PRIMARY KEY REFERENCES public.households(id) ON DELETE CASCADE` | 1-to-1 link to household |
| `presenting_issue` | `TEXT` | | Core issue Mai is working on with family |
| `working_plan` | `TEXT` | | Current clinical plan / approach |
| `next_step` | `TEXT` | | Immediate next steps |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Last update timestamp |

### 3. `public.household_members` (Non-clinical, Admin-readable)
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique member identifier |
| `household_id` | `UUID` | `NOT NULL REFERENCES public.households(id) ON DELETE CASCADE` | Parent household |
| `full_name` | `TEXT` | `NOT NULL` | Person's name |
| `role` | `TEXT` | `NOT NULL CHECK (role IN ('parent', 'mother', 'father', 'child', 'guardian', 'other'))` | Family role |
| `birth_year` | `INTEGER` | | Year of birth only (e.g. 2018) for minor privacy |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Last update timestamp |

### 4. `public.member_personas` (Clinical, Gated by Password Unlock)
*RLS Policy: `is_admin() AND has_family_unlock()`*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `household_member_id` | `UUID` | `PRIMARY KEY REFERENCES public.household_members(id) ON DELETE CASCADE` | 1-to-1 link to member |
| `persona_summary` | `TEXT` | | Psychological persona & behavioral summary |
| `temperament_traits` | `TEXT[]` | `NOT NULL DEFAULT '{}'` | Observed temperament attributes |
| `known_triggers` | `TEXT[]` | `NOT NULL DEFAULT '{}'` | Environmental and emotional triggers |
| `strengths` | `TEXT[]` | `NOT NULL DEFAULT '{}'` | Core resilience and positive qualities |
| `concern_level` | `TEXT` | | Clinical concern level placeholder badge |
| `family_dynamic_role` | `TEXT` | | Relational role in family system |
| `notes` | `TEXT` | | Confidential clinical/personal notes |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Row creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Last update timestamp |

### 5. `public.case_sessions` (Gated by Password Unlock)
*RLS Policy: `is_admin() AND has_family_unlock()`*
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

### 6. `public.session_attendees` (Gated by Password Unlock)
*RLS Policy: `is_admin() AND has_family_unlock()`*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Junction ID |
| `session_id` | `UUID` | `NOT NULL REFERENCES public.case_sessions(id) ON DELETE CASCADE` | Case session link |
| `household_member_id` | `UUID` | `NOT NULL REFERENCES public.household_members(id) ON DELETE CASCADE` | Attending member link |
| *Constraint* | `UNIQUE(session_id, household_member_id)` | | Prevents duplicate attendance entries |

### 7. `public.session_content` (Gated by Password Unlock)
*RLS Policy: `is_admin() AND has_family_unlock()`*
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

### 8. `public.member_notes` (Gated by Password Unlock)
*RLS Policy: `is_admin() AND has_family_unlock()`*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique note identifier |
| `household_member_id` | `UUID` | `NOT NULL REFERENCES public.household_members(id) ON DELETE CASCADE` | Subject member |
| `session_id` | `UUID` | `REFERENCES public.case_sessions(id) ON DELETE SET NULL` | Linked session (optional) |
| `note_type` | `TEXT` | `NOT NULL DEFAULT 'observation' CHECK (note_type IN ('observation', 'concern', 'progress', 'follow_up'))` | Note category |
| `body` | `TEXT` | `NOT NULL` | Observation content |
| `created_by` | `UUID` | `REFERENCES public.profiles(id) ON DELETE SET NULL` | Author admin profile |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Last edit timestamp |

### 9. `public.member_action_items` (Gated by Password Unlock)
*RLS Policy: `is_admin() AND has_family_unlock()`*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique item identifier |
| `household_member_id` | `UUID` | `NOT NULL REFERENCES public.household_members(id) ON DELETE CASCADE` | Subject member |
| `session_id` | `UUID` | `REFERENCES public.case_sessions(id) ON DELETE SET NULL` | Linked session (optional) |
| `task` | `TEXT` | `NOT NULL` | Commitment description |
| `status` | `TEXT` | `NOT NULL DEFAULT 'open' CHECK (status IN ('suggested', 'open', 'done', 'dropped'))` | Item status |
| `priority` | `TEXT` | `NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high'))` | Priority |
| `due_date` | `DATE` | | Optional target completion date |
| `source` | `TEXT` | `NOT NULL DEFAULT 'coach' CHECK (source IN ('coach', 'ai'))` | Origin source |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Last edit timestamp |

### 10. `public.session_chat_messages` (Gated by Password Unlock)
*RLS Policy: `is_admin() AND has_family_unlock()`*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique message identifier |
| `household_id` | `UUID` | `NOT NULL REFERENCES public.households(id) ON DELETE CASCADE` | Context family case |
| `session_id` | `UUID` | `REFERENCES public.case_sessions(id) ON DELETE SET NULL` | Active session context (optional) |
| `sender` | `TEXT` | `NOT NULL CHECK (sender IN ('admin', 'assistant'))` | Message author |
| `content` | `TEXT` | `NOT NULL` | Chat text |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Creation timestamp |

### 11. `public.family_unlocks` (Security Gating)
*RLS Policy: Service Role only for insert/select; Admin self-delete (`admin_id = auth.uid()`)*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unlock token ID |
| `admin_id` | `UUID` | `NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE` | Unlocked admin |
| `expires_at` | `TIMESTAMPTZ` | `NOT NULL` | Expiration (8h after unlock) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Issue timestamp |

### 12. `public.family_unlock_attempts` (Brute-Force Guard)
*RLS Policy: Service Role only*
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Attempt record ID |
| `admin_id` | `UUID` | `NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE` | Caller admin |
| `success` | `BOOLEAN` | `NOT NULL` | Whether unlock succeeded |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Timestamp for rolling 15m window |
