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
7. **[x] Add Visible Timezone Handling to the UI** *(Completed & Verified)*:
   - Added automatic timezone detection (`Intl.DateTimeFormat`), user dropdown selector with regional options (`TIMEZONES`), and dynamic slot calculation invoking `get-availability`.
   - Updated Time picker with async slot fetching indicator, empty slot handling, and timezone summary label.
8. **[x] Visually Disable Fully-Booked Days** *(Completed & Verified)*:
   - Enhanced `get-availability` to support month/date range queries in a single fast call against Google Calendar FreeBusy and Supabase bookings.
   - Updated UI calendar with regional working days (Sunday–Thursday), visual availability indicators, and disabled styling for fully-booked/non-working dates.
9. **[x] Test Session Durations and Buffers** *(Completed & Verified)*:
   - Verified all five appointment types produce only slots that fit completely inside configured working intervals.
   - Verified duration and buffer reservation spans for 45, 60, 75, and 90 minute sessions.
   - Added UTC interval storage plus a database exclusion constraint to prevent overlapping active reservations under concurrent requests.
10. **[x] Harden Booking Confirmation and Failure Handling** *(Completed & Verified)*:
   - Removed unsafe direct-insert fallback from the frontend.
   - Server validates appointment type, timezone, working hours, advance notice, Google availability, and database overlap before inserting.
   - Calendar/database failures fail closed or persist as `pending_calendar_sync` without silently losing the lead.
