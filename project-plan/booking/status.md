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

## What's Next & In Progress

- **Booking hardening (Complete & Verified)**:
  - UTC reservation intervals, overlap exclusion constraint, timezone-safe slot calculation, and fail-closed availability/confirmation handling are implemented.
  - Typecheck, lint (no errors), production build, and all five duration/buffer scheduling checks pass.
