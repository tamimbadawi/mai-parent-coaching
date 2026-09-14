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
- **Frontend `/booking` Route & Flow**:
  - Distraction-free dedicated booking layout (Navbar & Footer intentionally hidden).
  - Session type selection with dynamic pricing, durations, and details.
  - Interactive date picker and time slot selection.
  - Client details form (parent name, email, phone, country, child name, child age, notes).
  - Live booking summary sidebar.
  - Form validation: the confirmation button only enables once all required fields are properly filled.

---

## What's Next & In Progress

- **Wire Booking Form to Supabase (Next Task - Step 2)**: Connect `/booking` client submission to insert real records into the `bookings` table, replacing any fake/optimistic success timeouts.
- **Real Availability Checking**: No integration with coach schedule; every calendar day looks equally selectable.
- **Timezone Handling**: Missing explicit timezone selection and conversion for international clients.
- **Admin Bookings Screen Mismatch**: `AdminBookings` currently displays sample/enrollment data rather than reading from the real persistent `bookings` table.
- **Google Calendar Integration**: No automatic event creation, calendar invite dispatch, or freebusy conflict checking.
