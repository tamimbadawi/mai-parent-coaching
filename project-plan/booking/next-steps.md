# Booking System — Next Steps

Follow these implementation steps in exact sequential order:

> [!IMPORTANT]
> Do **NOT** start payments or mobile wrapping work touching booking until Steps 1–3 are fully complete and verified.

---

## Ordered Implementation Plan

1. **[x] Create Bookings Table Migration + RLS** *(Completed & Verified)*:
   - Written in `supabase/migrations/20260914173000_create_bookings_table.sql`.
   - RLS verified with live tests: anonymous insert allowed, anonymous select denied (0 rows), authenticated user isolation (`auth.uid() = user_id`), and admin full read/update.
2. **[x] Wire Booking Form to Real Supabase Insert** *(Completed & Verified)*:
   - Connected `/booking` client submission to insert into the `bookings` table.
   - Replaced fake/optimistic success timeouts with real Supabase insert handling, async loading indicator, and user-facing error reporting.
3. **[x] Fix AdminBookings Screen** *(Completed & Verified)*:
   - Refactored `AdminBookings` to query real records from the `bookings` table.
   - Added live metrics, status filters, direct status update actions, and empty/loading states.
4. **[x] Set Up Google OAuth Connection Flow** *(Completed & Ready for Credentials)*:
   - Created reusable Google Calendar API helper in `supabase/functions/_shared/google-calendar.ts`.
   - Created `google-calendar-auth` Edge Function for generating auth URLs, exchanging tokens, and testing connection.
   - Documented setup walkthrough in `project-plan/booking/google-calendar-setup.md`.
5. **[x] Build `get-availability` Edge Function** *(Completed & Tested)*:
   - Implemented dynamic slot calculation using Google Calendar FreeBusy API, working hours (Sunday-Thursday 09:00-17:00), dynamic session duration (45-90 min), and buffer margins (15-30 min).
   - Graceful fallback support for database reservations.
6. **[x] Build `create-booking` Edge Function** *(Completed & Verified E2E)*:
   - Implemented atomic slot collision checks against database bookings and Google Calendar FreeBusy.
   - Creates Supabase booking records and automatic Google Calendar event invites with Google Meet video links.
   - Status flows dynamically from `pending` -> `confirmed` (or `pending_calendar_sync` on calendar exception).
   - Connected `/booking` form submission directly to `create-booking`.
7. **[ ] Add Visible Timezone Handling to the UI** *(Next Task)*:
   - Add timezone detector, user dropdown, and automatic conversion in the booking UI.
8. **Visually Disable Fully-Booked Days**:
   - Reflect real-time availability in the date picker calendar.
9. **Test Session Durations and Buffers**:
   - Thoroughly verify slot calculations and 10–15 minute buffer logic across all session types (45–90 min).
