# CRM & Client Engagement — Staged Implementation Plan

> [!IMPORTANT]
> - **DO NOT START STAGE 1 BUILD YET.** This document serves strictly as the documented, approved blueprint.
> - **Execution Discipline**: Each stage must be executed as its own confirmed step before starting the next — exactly as done for the WhatsApp event system.
> - **Do not batch multiple stages into a single pass.**
> - Prior to touching source code in Stage 1, git branch discipline must be observed (confirm dedicated branch from `main`).

---

## Staged Implementation Plan

```
STAGE 1: Data Model (`customer_journey_state`)
   │
   ▼
STAGE 2: Content Library Schema & Admin CRUD UI
   │
   ▼
STAGE 3: Rotation & Dispatch Engine (Scheduler/Dispatcher Extension)
   │
   ▼
STAGE 4: Admin Per-Client CRM Dossier & Unified Timeline
   │
   ▼
STAGE 5: Real End-to-End Loop Verification & Clean Disposal
```

---

### STAGE 1 — Data Model: `customer_journey_state` ✅ *(Complete)*

**Objective**: Dynamically derive each client's track, lifecycle stage, and engagement recency from existing tables (`bookings`, `profiles`, `whatsapp_messages`, `contact_messages`) without requiring any manual data entry from Mai.

1. [x] **Design Computed Database View / Function**:
   - Migration deployed: `supabase/migrations/20260921150000_create_customer_journey_state.sql`.
   - Implemented `customer_journey_state` view with `security_invoker = true` joining `profiles`, `bookings`, `whatsapp_messages`, and `contact_messages`.
   - Derived fields: `client_id`, `parent_name`, `email`, `phone`, `country`, `role`, `current_track` (`track_a` vs `track_b`), `completed_paid_sessions_count`, `completed_free_sessions_count`, `upcoming_sessions_count`, `cancelled_sessions_count`, `first_completed_paid_session_at`, `last_completed_paid_session_at`, `next_upcoming_session_at`, `last_engagement_at`, `days_since_last_engagement`, `days_since_last_session`, `lifecycle_stage`, `next_step_recommendation`.
2. [x] **Add Engagement Preferences to `profiles`**:
   - Added `engagement_status` (`active`, `paused`, `opted_out` with default `active`) and `engagement_cadence_days` (default `14`) with index.
   - Added TypeScript interfaces `CustomerJourneyState`, `CRMTrack`, and `CRMLifecycleStage` to `src/types/index.ts`.
3. [x] **Verification Gate**:
   - Executed `scripts/verify-stage-1-crm.js` on live database:
     - Fresh student profile (0 bookings) $\rightarrow$ evaluates to `track_a`, stage `track_a_active`.
     - Completed free Initial Consultation $\rightarrow$ strictly remains `track_a` (`completed_free: 1`, `completed_paid: 0`).
     - Confirmed upcoming paid session $\rightarrow$ strictly remains `track_a` with stage `track_a_booked` (Decision 2 verified).
     - Paid session marked `completed` $\rightarrow$ promoted immediately to `track_b` with stage `track_b_between_sessions`.
     - `engagement_status = 'opted_out'` $\rightarrow$ propagates to `lifecycle_stage = 'opted_out'`.
     - All test records safely cleaned up.
   - Verified frontend production build (`npm run build`) passes cleanly.

---

### STAGE 2 — Content Library Schema & Admin CRUD UI ✅ *(Complete)*

**Objective**: Create the admin-managed repository for Track A/B content pieces (the "empty vessel" Mai will populate over time) and verify it with initial test items.

1. [x] **Database Schema**:
   - Migration deployed: `supabase/migrations/20260921160000_create_crm_content_library.sql`.
   - Table `crm_content_library` created with `id`, `title`, `body_template`, `content_type`, `target_track`, `tags`, `is_active`, `sort_order`, `created_at`, `updated_at`, `created_by`.
   - RLS policies deployed: Admins only can select, insert, update, delete.
   - Filter and sorting indexes added (`idx_crm_content_library_track_active`, `idx_crm_content_library_type`, `idx_crm_content_library_created_at`).
2. [x] **Admin Studio UI**:
   - Built [`src/pages/admin/components/ContentLibraryStudio.tsx`](file:///d:/Cursor/Mai_Website/src/pages/admin/components/ContentLibraryStudio.tsx) with search, track filter pills, type filter pills, active/archived toggle, and responsive cards.
   - Created full modal for creating/editing content with dynamic `{parentName}` preview, tag suggestions, and sort priority.
   - Integrated as the 4th tab ("Nurture Library (CRM)") in [`AdminWhatsApp.tsx`](file:///d:/Cursor/Mai_Website/src/pages/admin/AdminWhatsApp.tsx).
3. [x] **Seed Test Content**:
   - Seeded 5 realistic pieces (3 for Track A: grounding tip, bedtime reflection prompt, emotion thermometer worksheet; 2 for Track B: integration check-in, parental reserves prompt).
4. [x] **Verification Gate**:
   - Executed `scripts/verify-stage-2-crm.js` on live database:
     - Verified initial 5 seeded pieces.
     - Verified insert of new content piece.
     - Verified update of title, body, and tags.
     - Verified toggle of active/archive state (`is_active: false` and `is_active: true`).
     - Verified deletion and clean orphan-free disposal.
   - Verified frontend production build (`npm run build`) passes cleanly (`✓ built in 4.23s`).

---

### STAGE 3 — Rotation & Dispatch Logic ✅ *(Complete)*

**Objective**: Extend the existing `whatsapp-scheduler` and `whatsapp-dispatcher` pattern to select an unseen library piece per client on their defined cadence, track send history, and enforce strict deduplication.

1. [x] **Delivery History Schema**:
   - Migration deployed: `supabase/migrations/20260921170000_create_crm_deliveries.sql`.
   - Created `crm_deliveries` table:
     - `id` (uuid primary key)
     - `recipient_phone` (text not null)
     - `client_id` (uuid references `profiles(id)`)
     - `content_id` (uuid references `crm_content_library(id)`)
     - `whatsapp_message_id` (uuid references `whatsapp_messages(id)`)
     - `sent_at` (timestamptz default now())
   - Added partial unique index to prevent the same content piece being delivered twice to the same phone:
     `create unique index idx_crm_deliveries_unique_recipient_content on public.crm_deliveries (recipient_phone, content_id);`
   - Updated `whatsapp_messages.message_type` check constraint to allow `'crm_nurture'` and `'inbound'`, and added `related_content_id`.
2. [x] **Rotation Engine in `whatsapp-scheduler`**:
   - Queries eligible clients from `customer_journey_state`:
     - `engagement_status = 'active'`
     - `days_since_last_engagement >= engagement_cadence_days`
     - Global frequency guardrail: No message sent in the last 7 days.
   - Content Selection Algorithm:
     - Finds active library pieces matching client's track.
     - Excludes `content_id`s already recorded in `crm_deliveries` for this recipient.
     - Picks next unseen piece by `sort_order`.
     - Skips cleanly if rotation cycle exhausted.
3. [x] **Dispatch Integration**:
   - Extended `whatsapp-dispatcher` with message type `'crm_nurture'`.
   - Enforced 7-day outbound frequency cap and duplicate content blocking.
   - Recorded successful delivery in `crm_deliveries`.
4. [x] **Inbound Message Handling & Opt-Out Webhook (`services/whatsapp-bot/` + Supabase Handler)**:
   - **Microservice Inbound Listener**: Registered `clientInstance.on('message', ...)` in `services/whatsapp-bot/src/client.js`.
   - **Keyword Parsing**: Detects inbound keywords (`STOP`, `PAUSE`, `UNSUBSCRIBE`, `CANCEL`, `HALT` to opt out; `START`, `RESUME`, `UNPAUSE`, `SUBSCRIBE` to opt in).
   - **Calming Automatic Reply**: Immediate gentle acknowledgment sent directly to WhatsApp user.
   - **Supabase Webhook**: Deployed `whatsapp-inbound-handler` Edge Function with service secret verification.
   - **Database State Update**: Updates `profiles.engagement_status` to `'opted_out'` or `'active'` and logs inbound interaction in `whatsapp_messages`.
5. [x] **Verification Gate**:
   - Executed `scripts/verify-stage-3-crm.js` on live database & Edge Functions:
     - Step 1: Verified `crm_deliveries` schema, indexes, and active Track A starter pieces.
     - Step 2: Created student profile and verified initial `customer_journey_state`.
     - Step 3: Successfully dispatched `crm_nurture` message, recorded in `whatsapp_messages` and `crm_deliveries`.
     - Step 4: Re-dispatching exact same content piece was blocked (`CONTENT_ALREADY_DELIVERED`).
     - Step 5: Immediate dispatch of any second content piece was blocked by 7-day frequency cap (`FREQUENCY_CAP_EXCEEDED`).
     - Step 6: Inbound `STOP` keyword switched `profiles.engagement_status` to `'opted_out'` and `customer_journey_state.lifecycle_stage` to `'opted_out'`.
     - Step 7: Inbound `START` keyword restored `profiles.engagement_status` to `'active'` and `customer_journey_state.lifecycle_stage` to `'track_a_active'`.
     - Complete clean teardown with zero orphaned test data.
   - Frontend production build (`npm run build`) succeeded cleanly.

---

### STAGE 4 — Admin Per-Client CRM Dossier & Unified Timeline

**Objective**: Consolidate all historical touchpoints into a unified, zero-memory client dossier so Mai can immediately see where a client stands.

1. [ ] **Client CRM Page / Modal**:
   - Build unified client screen (e.g. `/admin/crm/client/:id` or an interactive drawer in `/admin/users`).
2. [ ] **Client State Card**:
   - Header with client name, phone, email, country, signup date.
   - Badges: Current Track (`Track A — Nurture` vs `Track B — Continuity`), Lifecycle Stage (`Active`, `Taper`, `Quiet`, `Re-engagement Due`).
   - "Next Step" Intelligence Box:
     - *"Track A: Next reflective prompt scheduled in 4 days."*
     - *"Track B: 48 days since last completed session. Re-engagement check-in eligible."*
3. [ ] **Unified Chronological Timeline**:
   - Query and aggregate into a single chronological stream:
     - Contact messages (`contact_messages`)
     - Booking appointments (`bookings` — status, type, notes)
     - WhatsApp messages (`whatsapp_messages` — onboarding, reminders, follow-ups, CRM nurture)
   - Color-coded icons and clear timestamps for each interaction type.
4. [ ] **Manual Override Actions**:
   - One-click button to pause/resume automated CRM for this client.
   - Dropdown to manually dispatch a specific library piece immediately.
5. [ ] **Verification Gate**:
   - Load client dossier for a test user and verify that all disparate touchpoints appear chronologically and accurately.

---

### STAGE 5 — Real End-to-End Loop Verification & Clean Disposal

**Objective**: Perform rigorous, live physical verification with real data, maintaining the identical high standard proven during the WhatsApp event system rollout.

1. [ ] **Live Test Setup**:
   - Create a dedicated test client record linked to a verified physical WhatsApp device.
2. [ ] **Track A Nurture Delivery**:
   - Trigger scheduler -> verify physical delivery of Track A Piece #1 on the phone.
   - Verify entry in `crm_deliveries` and `whatsapp_messages`.
3. [ ] **Deduplication & Anti-Repeat Test**:
   - Trigger scheduler again -> confirm dispatch skipped (blocked by 7-day frequency cap).
   - Fast-forward reference time -> confirm Piece #2 is delivered, proving non-repeating rotation.
4. [ ] **Track Transition Test**:
   - Create a paid coaching booking for the test client and mark it `completed`.
   - Re-evaluate `customer_journey_state` -> confirm client immediately promoted to `Track B`.
5. [ ] **Opt-Out & Gone Quiet Test**:
   - Toggle client to `paused` -> verify scheduler excludes them.
6. [ ] **Cleanup & De-seed**:
   - Safely purge test deliveries and test bookings without corrupting production analytics.
7. [ ] **Verification Gate**:
   - All assertions backed by live terminal command logs, HTTP response payloads, and physical phone screenshots/receipt confirmations.
