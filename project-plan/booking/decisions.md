# Booking System — Architectural Decisions

> [!NOTE]
> All decisions in this file are **settled**. Do not revisit or swap these architectural choices unless explicitly instructed.

---

## 1. Calendar Provider: Google Calendar API (Direct Integration)

- **Selected**: Google Calendar API used directly via Supabase Edge Functions.
- **Why NOT Calendly?** Using Calendly would require abandoning the custom booking UI already built or embedding an off-brand iframe that harms the premium user experience.
- **Why NOT Cal.com?** Unnecessarily heavy. Cal.com is an entire separate scheduling platform when this project only requires availability-checking and event-writing capabilities.

---

## 2. Availability Engine: Inverted Allow-List Model (Closed-by-Default)

- **Selected**: Inverted Allow-List Availability Engine.
- **Principle**: **All dates and hours are unavailable by default.**
- **Availability Windows**: Time slots can only be booked if the coach explicitly creates an active rule in `coach_availability_rules`:
  1. **Weekly Recurring Hours**: Repeating open schedules (e.g. *Every Monday 10:00–14:00 and 16:00–18:00*).
  2. **Date-Specific Overrides**: Special one-off open hours for a specific date.
  3. **Date-Specific Closures**: Explicitly block a recurring day for holidays or vacations.
- **Dynamic Slot Generation**: Open candidate slots are generated strictly within open intervals, subtracting existing confirmed/pending bookings and Google Calendar busy periods in real-time.

---

## 3. Architecture & Synchronization

- **Dual Sources of Truth**: The `bookings` table in Supabase Postgres + Google Calendar.
- **Availability Check Flow**:
  - Fetches active open rules from `coach_availability_rules`.
  - Queries Google Calendar's `freebusy` API for the practitioner's calendar.
  - Generates candidate slots strictly inside open windows, subtracting busy blocks, existing bookings, and buffer times.
- **Booking Confirmation Flow**:
  - Re-validates slot freshness immediately before writing (preventing race conditions).
  - Inserts booking record into the Supabase database.
  - Creates the Google Calendar event with client/session details.
  - If the calendar creation step fails, flags the DB record with status `pending_calendar_sync` so no booking is ever silently lost.

---

## 4. Pre-requisites & Requirements

1. **Google OAuth**: Dedicated connection for the coach's account with refresh tokens stored strictly server-side (Supabase Vault / encrypted environment variables).
2. **Coach Availability Config**: Stored in `coach_availability_rules` supporting recurring and date-specific windows.
5. **Session Types & Discovery Call Transition**:
   - The initial session type preserves the identifier `'initial'`.
   - Title: **"Discovery Call"** (formerly "Initial Consultation").
   - Duration: **30 minutes** with a 15-minute buffer.
   - Pricing: Discovery Call is EGP 500 (`initial`), 60-Minute Coaching Session is EGP 3,500 (`coaching-60`).
   - "Free" wording is explicitly removed across all public consultation/call touchpoints (keeping Free Resources and course Free Preview).
   - Only **Discovery Call** and **60-Minute Coaching Session** are displayed on the public `/booking` page. Other types (`intensive-90`, `family`, `follow-up`) are retained with `hidden: true` to support admin tools and historical records.

---

## 5. Mai's Weekly Schedule & Slot-Fitting Algorithm

- **Slot-Fitting Rule**: In `candidateSlotsForClientDate`, candidate slots are validated against interval boundaries using `endsAt > intervalEnd` (rather than `reservedUntil > intervalEnd`). This ensures a 60-minute session fits a 1-hour window (e.g. 12:00–13:00) while `reservedUntil` continues to govern collision checks with adjacent bookings.
- **Weekly Schedule Windows (Africa/Cairo)**:
  - **Monday (1)**: 12:00–13:00 & 13:30–14:30 (60-Minute Coaching)
  - **Tuesday (2)**: 11:00–11:30, 11:45–12:15 & 12:30–13:00 (Discovery Call)
  - **Wednesday (3)**: 12:00–13:00 & 13:30–14:30 (60-Minute Coaching)
  - **Thursday–Sunday**: Closed / unavailable by default.

---

## 6. Offer Structure & Pricing Architecture (Settled from booking-plan.html)

- **Three Doors Model**:
  1. **Door 1 — Discovery Call** (New Families):
     - Duration: 30 minutes.
     - Price: **EGP 500**.
     - Requirement: Mandatory for new families; returning clients skip it.
     - Separate fee: This is a standalone intake fee, **not deducted** from subsequent coaching packages.
     - Slot times: Tuesday 11:00, 11:45, or 12:30.
  2. **Door 2 — 1:1 Coaching Packages**:
     - Single Session: 1 session / EGP 3,500 / valid for 2 weeks
     - Starter Package: 2 sessions / EGP 6,650 / valid for 4 weeks (5% savings, EGP 3,325/session)
     - Growth Package: 4 sessions / EGP 11,200 / valid for 8 weeks (20% savings, EGP 2,800/session)
     - Deep Work Package: 8 sessions / EGP 21,000 / valid for 16 weeks (25% savings, EGP 2,625/session)
     - Full Transformation: 12 sessions / EGP 29,400 / valid for 24 weeks (30% savings, EGP 2,450/session)
     - Cadence: "Use within" validity period averages about 2 weeks per session.
     - Sessions scheduled on Mondays and Wednesdays (12:00 or 13:30).
  3. **Door 3 — Group Coaching**:
     - Group size: **4 to 8 parents**.
     - Lifecycle: Opens with 4 parents, closes at 8.
     - Scheduling: Scheduled once filled — Mai sets the day and dates once the group has 4 participants (no fixed recurring weekday).
     - Session length: 60 minutes per session.
     - Pricing (per-person pricing):
       - Growth Package (4 sessions): EGP 7,200 per person (EGP 1,800/session)
       - Deep Work Package (8 sessions): EGP 12,960 per person (EGP 1,620/session, 10% savings)
       - Full Transformation (12 sessions): EGP 17,496 per person (EGP 1,458/session, 19% savings)
     - Each parent pays individually for their seat.

- **The 9 Discovery Call Topics**:
  1. `emotions`: Big feelings & tantrums
  2. `burnout`: Parent burnout
  3. `family`: Siblings & family dynamics
  4. `sleep`: Sleep & daily routines
  5. `anxiety`: Worries & anxiety
  6. `screens`: Screens & digital life
  7. `limits`: Calm limits without yelling
  8. `confidence`: Confidence & independence
  9. `teens`: Teens, tech & mood

- **The 5×5 Package Suggestion Matrix**:
  Evaluates parent intake answer for *What would help most right now?* (`one-thing`, `quick-tools`, `steady`, `several`, `reset`) against *How long has it felt hard?* (`just-started`, `weeks`, `months`, `year`, `over-year`):
  - `one-thing`: single, single, single, starter, starter
  - `quick-tools`: single, starter, starter, growth, growth
  - `steady`: starter, growth, growth, growth, deep-work
  - `several`: growth, growth, deep-work, deep-work, full
  - `reset`: growth, deep-work, deep-work, full, full

- **Payment Processing (PayTabs)**:
  - Online payment with PayTabs is connected at launch (Phase 5 / Go Live).
  - All preceding stages are built with explicit payment integration attachment points and server-side validation.
