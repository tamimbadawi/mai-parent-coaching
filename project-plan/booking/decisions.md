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
3. **Session Duration & Buffers**:
   - Dynamic session durations per session type (45–90 minutes).
   - Enforced 10–15 minute buffer between consecutive sessions.
4. **Timezone Display**: Explicit timezone detection and selector displayed prominently in the booking UI to serve international clients without confusion.
