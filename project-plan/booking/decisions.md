# Booking System — Architectural Decisions

> [!NOTE]
> All decisions in this file are **settled**. Do not revisit or swap these architectural choices unless explicitly instructed.

---

## 1. Calendar Provider: Google Calendar API (Direct Integration)

- **Selected**: Google Calendar API used directly via Supabase Edge Functions.
- **Why NOT Calendly?** Using Calendly would require abandoning the custom booking UI already built or embedding an off-brand iframe that harms the premium user experience.
- **Why NOT Cal.com?** Unnecessarily heavy. Cal.com is an entire separate scheduling platform when this project only requires availability-checking and event-writing capabilities.

---

## 2. Availability Mode: Real-Time Slot Blocking

- **Selected**: Real-time slot blocking and instant confirmation.
- **Rationale**: Coaching clients drop off and abandon bookings when subjected to a manual-confirmation "request a session" form.

---

## 3. Architecture & Synchronization

- **Dual Sources of Truth**: The `bookings` table in Supabase Postgres + Google Calendar.
- **Availability Check Flow**:
  - Queries Google Calendar's `freebusy` API for the practitioner's calendar.
  - Subtracts busy blocks, existing bookings, and buffer times from defined working hours.
- **Booking Confirmation Flow**:
  - Re-validates slot freshness immediately before writing (preventing race conditions).
  - Inserts booking record into the Supabase database.
  - Creates the Google Calendar event with client/session details.
  - If the calendar creation step fails, flags the DB record with status `pending_calendar_sync` so no booking is ever silently lost.

---

## 4. Pre-requisites & Requirements

1. **Google OAuth**: Dedicated connection for the coach's account with refresh tokens stored strictly server-side (Supabase Vault / encrypted environment variables).
2. **Working Hours Config**: Structured weekly schedule definitions (working days, hours, holidays).
3. **Session Duration & Buffers**:
   - Dynamic session durations per session type (45–90 minutes).
   - Enforced 10–15 minute buffer between consecutive sessions.
4. **Timezone Display**: Explicit timezone detection and selector displayed prominently in the booking UI to serve international clients without confusion.
