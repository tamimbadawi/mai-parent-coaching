# Booking System — Next Steps

Follow these implementation steps in exact sequential order:

> [!IMPORTANT]
> Do **NOT** start payments or mobile wrapping work touching booking until Steps 1–3 are fully complete and verified.

---

## Ordered Implementation Plan

1. **Create Bookings Table Migration + RLS**:
   - Write timestamped SQL migration in `supabase/migrations`.
   - Setup Row Level Security: public insert allowed, public read denied, authenticated users read their own bookings via `user_id`, admins read/manage all bookings.
2. **Wire Booking Form to Real Supabase Insert**:
   - Connect `/booking` client submission to insert into the `bookings` table.
   - Remove fake success state / timeout mocks.
3. **Fix AdminBookings Screen**:
   - Refactor `AdminBookings` to query real records from the `bookings` table instead of sample enrollment data.
4. **Set Up Google OAuth Connection Flow**:
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
