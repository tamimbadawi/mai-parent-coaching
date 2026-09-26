# Booking System — Status

## Current Status: In Progress (#1 Priority)

> [!WARNING]
> This is the **#1 priority** for the project. An unwired booking flow is a **silently lost lead**, not a soft failure.

---

## What's Built

- **Database Schema & RLS Migration (Complete & Verified)**:
  - `bookings` table created with migration `20260914173000_create_bookings_table.sql`.
  - Default status set to `'pending'` to support the calendar sync lifecycle.
  - Verified with live tests: anonymous insert allowed, anonymous select denied (0 rows), strict authenticated user isolation (`user_id = auth.uid()`), and full admin read/update privileges (`is_admin()`).
- **Frontend `/booking` Route & Flow (Persisted to Database)**:
  - Distraction-free dedicated booking layout (Navbar & Footer intentionally hidden).
  - Session type selection with dynamic pricing, durations, and details.
  - Interactive date picker and time slot selection.
  - Client details form (parent name, email, phone, country, child name, child age, notes).
  - Real async database insert via Supabase with loading spinners and accessible error reporting (no fake timeouts).
- **Admin Bookings Operations Screen**:
  - `AdminBookings` queries real records from `public.bookings`.
  - Displays parent contact info, child details, session type, date/time, notes, and status.
  - Enables direct status updates (e.g. pending -> confirmed, completed, cancelled, sync needed).
  - Summary metrics and status filtering.

---

- **Google OAuth Connection & Live Sync (Complete & Verified)**:
  - OAuth flow configured and tested live via `google-calendar-auth`.
  - Secure server-side token management via `google-calendar.ts`.
- **`get-availability` Edge Function (Complete & Live)**:
  - Computes real-time 30-minute start slots from Google Calendar FreeBusy data, active DB bookings, working hours, durations, and buffers.
- **`create-booking` Edge Function (Complete & Live)**:
  - Atomic collision validation, DB booking persistence, and Google Calendar event dispatch with Google Meet links.
- **Timezone Handling in UI (Complete & Verified)**:
  - Auto-detection with `Intl.DateTimeFormat`, user selector dropdown, dynamic slot recalculation, and timezone summary display.
- **Visually Disable Booked Days (Step 8 - Complete & Verified)**:
  - Month-level availability computation across Google Calendar FreeBusy and DB records.
  - Interactive date picker disables fully-booked days and non-working weekends with clear visual cues.

---

- **Admin Booking Management & Schedule Controls (Complete & Verified)**:
  - `admin-booking-manager` Edge Function deployed for reschedule, cancel, edit, and calendar sync.
  - Interactive Reschedule, Edit Details, Add Manual Booking, and Blackout Dates modals.
  - Live search, date range filters (*Today*, *This Week*, *Upcoming*, *Past*), and interactive monthly Calendar View.
  - Note on `booking_blackouts`: Although the database table exists from an earlier migration, no Edge Function reads that table; the availability engine uses `coach_availability_rules` only, and `AdminBlackoutsModal.tsx` is not rendered anywhere. Admin availability overrides and closures are managed directly through `coach_availability_rules`.
  - Admin bookings card layout optimized with 2-column desktop grid to eliminate empty space.

---

- **Mai's Weekly Schedule & Paid Discovery Call (Complete & Verified)**:
  - **Slot-Fit Fix**: Corrected candidate slot interval check from `reservedUntil > intervalEnd` to `endsAt > intervalEnd` in both `supabase/functions/_shared/booking-scheduling.ts` and `src/lib/bookingAvailability.ts` so 60-min sessions + 15-min buffers fit exact 60-min window allocations without false drops.
  - **Discovery Call Transition**: "Initial Consultation" renamed to "Discovery Call" (keeping id `'initial'`), duration updated to 30 minutes with 15-minute buffer. Price set to EGP 500 (`initial`), 60-Minute Coaching set to EGP 3,500 (`coaching-60`).
  - **Booking Surface Filter**: Only Discovery Call (30 min) and 60-Minute Coaching Session are displayed on `/booking`; older/extended session types marked with `hidden: true`.
  - **Mai's Weekly Schedule Seeded**: Migration `20260926160000_seed_mai_weekly_schedule.sql` applied to live database:
    - Monday & Wednesday (12:00–13:00, 13:30–14:30): 60-Minute Coaching (`coaching-60`)
    - Tuesday (11:00–11:30, 11:45–12:15, 12:30–13:00): Discovery Calls (`initial`)
    - Thursday–Sunday: Closed / unavailable by default.
  - Edge functions `get-availability`, `create-booking`, and `admin-booking-manager` redeployed.

---

- **Stage 1 Discovery Call Complete (Parts A–E Complete & Verified)**:
  - **Part A (Bug Fixes)**:
    - Removed `DEFAULT_SLOTS` and placeholder times from `src/pages/Booking.tsx`. Days with no open slots show honest "No open times on this date. Please try another date." Availability loading errors display a clean alert message.
    - `bookingAvailability.ts` browser fallback updated to closed by default (empty rules), matching the server.
    - Admin rescheduling timezone fix: `admin-booking-manager` now correctly parses date and time in the coach's local timezone using `zonedDateTimeToUtc`.
    - Google Calendar failure consistency: `get-availability` restored to fail closed (503) when Google Calendar API fails, matching `create-booking` refusal and preventing phantom slot selection.
    - EGP currency display: formatted prices with commas (`EGP 500`, `EGP 3,500`) on `/booking` without hardcoded dollar signs.
  - **Part B (Discovery Call Intake Data + Server)**:
    - Migration `20260926170000_booking_discovery_intake.sql` applied to add `intake_topics`, `intake_need`, `intake_duration`, and `intake_suggested_package` to `public.bookings`.
    - Types `DiscoveryTopic`, `IntakeOption`, `CoachingPackage`, and `DiscoveryIntake` exported in `src/types/index.ts`.
    - Static content in `src/data/content.ts`: 9 discovery topics, 5 intake needs, 5 durations, 5 packages, 5×5 suggestion matrix, and `suggestPackage()`.
    - Server copy in `_shared/booking-scheduling.ts`: topic titles, labels, package titles, 5×5 matrix, and `suggestPackageId()`.
    - `create-booking` Edge Function server-side validation for initial bookings: validates topics, needs, duration, and computes suggested package securely server-side.
  - **Part C (Google Calendar Colours & Shared Layout)**:
    - Google Calendar event colour-coding in `_shared/google-calendar.ts`: Discovery Call is Yellow (Banana `colorId: '5'`), 60-min coaching is Green (Sage `colorId: '2'`).
    - Unified `buildCalendarEventText()` in `admin-booking-manager` for approval, rescheduling, and manual calendar sync. Formats clear em dash summary, parent & child details, intake answers, notes, and removes attendee Booking ID.
  - **Part D (Discovery Call Intake Modal & Package Suggestion)**:
    - 3-screen intake pop-up implemented in `src/components/booking/DiscoveryIntakeModal.tsx`:
      - Screen 1: 9 topics grid with icons, multi-select, dynamic advice note, continue enabled with ≥1 selection.
      - Screen 2: Two quick taps for needs and duration chips.
      - Screen 3: Review summary with edit shortcuts, highlighted package recommendation card (`suggestPackage`), EGP 500 line, privacy notice, and submission spinner.
    - Canvas `ConfettiBurst` animation for completed Discovery Call bookings.
    - `Booking.tsx` wired to open modal only for `initial` sessions; 60-min coaching submits directly.
    - `AdminBookings.tsx` displays intake answers box (topics, wants, duration, suggested package) above notes.
  - **Part E (Admin Availability Month Calendar)**:
    - `AdminAvailabilityModal.tsx` updated with tabs **Calendar** (default) and **Weekly hours**.
    - New component `AvailabilityMonthCalendar.tsx` provides Sunday-first month calendar grid with real date evaluation matching server `buildOpenIntervalsForCoachDate`.
    - Days show up to 3 colored dots for session types, "Closed" in rose for holidays/closures, and sparkle icons for special hours.
    - Interactive day inspection panel with human-readable source descriptions ("From your weekly Monday hours", "Special hours for this date only", "Closed on this date", "Not open...").
    - In-place actions: Close this day, Set special hours (inline form with validation), and Reset to weekly hours, refreshing state smoothly without full modal reloads.

