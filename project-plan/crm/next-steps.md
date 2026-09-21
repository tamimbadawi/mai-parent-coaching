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

### STAGE 2 — Content Library Schema & Admin CRUD UI

**Objective**: Create the admin-managed repository for Track A/B content pieces (the "empty vessel" Mai will populate over time) and verify it with initial test items.

1. [ ] **Database Schema**:
   - Create migration `supabase/migrations/YYYYMMDDHHMMSS_create_crm_content_library.sql`.
   - Table `crm_content_library`:
     - `id` (uuid primary key default `gen_random_uuid()`)
     - `title` (text not null)
     - `body_template` (text not null, supports `{parentName}` parameter)
     - `content_type` (text check in `'prompt'`, `'tip'`, `'worksheet'`, `'check_in'`)
     - `target_track` (text check in `'track_a'`, `'track_b'`, `'all'`)
     - `tags` (text[] default `'{}'`)
     - `is_active` (boolean default true)
     - `sort_order` (integer default 0)
     - `created_at`, `updated_at`, `created_by`
   - Enable RLS: Admins only for all operations.
2. [ ] **Admin Studio UI**:
   - Build `ContentLibraryView` under Admin navigation (`/admin/whatsapp` tab or `/admin/crm`).
   - Clean, zero-scroll responsive layout matching Admin Design System.
   - Filterable by track (`All`, `Track A`, `Track B`) and tag chips.
   - Modal for **Create / Edit Content**:
     - Title, content type selector, target track radio, tag manager.
     - Body editor with live preview rendering dynamic `{parentName}` placeholder.
     - Active / Inactive switch.
3. [ ] **Seed Test Content**:
   - Seed 3–5 initial placeholder items (e.g. 1 grounding tip, 1 reflection prompt, 1 worksheet share).
4. [ ] **Verification Gate**:
   - Create, edit, preview, and archive content items in the UI.
   - Verify DB persistence and clean TypeScript typing with zero console warnings.

---

### STAGE 3 — Rotation & Dispatch Logic

**Objective**: Extend the existing `whatsapp-scheduler` and `whatsapp-dispatcher` pattern to select an unseen library piece per client on their defined cadence, track send history, and enforce strict deduplication.

1. [ ] **Delivery History Schema**:
   - Create `crm_deliveries` table:
     - `id` (uuid primary key)
     - `recipient_phone` (text not null)
     - `content_id` (uuid references `crm_content_library(id)`)
     - `whatsapp_message_id` (uuid references `whatsapp_messages(id)`)
     - `sent_at` (timestamptz default now())
   - Add partial unique index to prevent the same content piece being marked sent twice to the same phone:
     ```sql
     create unique index idx_crm_deliveries_unique_recipient_content
       on public.crm_deliveries (recipient_phone, content_id);
     ```
2. [ ] **Rotation Engine in `whatsapp-scheduler`**:
   - Query eligible clients from `customer_journey_state`:
     - `engagement_status = 'active'`
     - `days_since_last_engagement >= engagement_cadence_days`
     - Global frequency guardrail: No message sent in the last 7 days.
   - Content Selection Algorithm:
     - Find active library pieces matching client's track.
     - Exclude `content_id`s present in `crm_deliveries` for this recipient.
     - Pick next unseen piece (ordered by `sort_order`).
     - If all pieces have been delivered: log "Rotation cycle exhausted" and transition client to taper state without repeating.
3. [ ] **Dispatch Integration**:
   - Call `whatsapp-dispatcher` with message type `'crm_nurture'`.
   - On successful delivery, record entry in `crm_deliveries`.
4. [ ] **Inbound Message Handling & Opt-Out Webhook (`services/whatsapp-bot/` + Supabase Handler)**:
   - **Microservice Inbound Listener**: Register `client.on('message', async (msg) => ...)` in `services/whatsapp-bot/src/client.js` (currently outbound-only; incoming handling is missing).
   - **Keyword Parsing**: Detect inbound keywords (e.g. `STOP`, `PAUSE`, `UNSUBSCRIBE` to opt out; `START`, `RESUME` to opt back in).
   - **Supabase Webhook**: Forward inbound message payloads (`from`, `body`, `timestamp`) to Supabase Edge Function (`whatsapp-inbound-handler`) authenticated with service secret.
   - **Database State Update**: Update `profiles.engagement_status` to `'opted_out'` or `'active'` and log inbound touchpoint in `whatsapp_messages` to refresh `last_engagement_at`.
   - **Automated Opt-Out Receipt**: Microservice sends a gentle acknowledgement: *"You have been unsubscribed from automated messages. Reply START at any time to resume."*
5. [ ] **Verification Gate**:
   - Dry-run / fast-forward test via Edge Function: confirm first unseen piece is chosen, 7-day frequency cap is respected, and subsequent delivery picks next unseen piece.
   - Live inbound test: Send "STOP" from a test device -> verify microservice receives message, forwards webhook to Supabase, updates `profiles.engagement_status` to `'opted_out'`, and sends immediate confirmation reply.

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
