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
4. **[ ] Set Up Google OAuth Connection Flow** *(Next Task)*:
   - Configure coach's Google Calendar OAuth credentials and secure server-side token storage.
5. **Build `get-availability` Edge Function**:
   - Implement availability calculation using Google Calendar FreeBusy API, configured working hours, and slot duration buffers.
6. **Build `create-booking` Edge Function**:
   - Implement atomic slot reservation, Supabase booking record creation, and Google Calendar event creation (with `pending_calendar_sync` fallback).
7. **Add Visible Timezone Handling to the UI**:
   - Add timezone detector, user dropdown, and automatic conversion in the booking UI.
8. **Visually Disable Fully-Booked Days**:
   - Reflect real-time availability in the date picker calendar.
9. **Test Session Durations and Buffers**:
   - Thoroughly verify slot calculations and 10–15 minute buffer logic across all session types (45–90 min).
