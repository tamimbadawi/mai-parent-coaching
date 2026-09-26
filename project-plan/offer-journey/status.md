# Offer & Booking Journey — Status

## Current Status: 🟢 Stage 1 Complete & Verified (Parts A–F + Stage 1 Fixes 1–5)
- Stage 1 completed and verified on `feature/booking-schedule` (Parts A–F: bug fixes, intake DB migration & Edge Function validation, color-coded calendar events, 3-step intake popup with package suggestions, admin month availability calendar, documentation).
- Stage 1 fixes (no-scroll pop-ups + calendar shows only open days):
  - Part 1: `0fb628a` `docs(agents): no-scroll pop-up and bookable-day rules` (AGENTS.md)
  - Part 2: `5a445b3` `fix(booking): Discovery pop-up fits every screen without scrolling` (DiscoveryIntakeModal.tsx)
  - Part 3: `8291b38` `feat(booking): date pickers show only open days` (bookingAvailability.ts, BookableMonthCalendar.tsx, Booking.tsx, ClientRescheduleModal.tsx, BookingRescheduleModal.tsx)
  - Part 4: `cbe6796` `fix(admin): availability pop-up fits without scrolling` (AdminAvailabilityModal.tsx, AvailabilityMonthCalendar.tsx)
  - Part 5: `eda9d9a` `fix(booking): strict intake id validation` (create-booking/index.ts)
- Ready for Stage 2 (Show the offer: display only).
- Branch for implementation: `feature/booking-schedule`.

## Stage Progress

| Stage | Focus | Status |
| :--- | :--- | :--- |
| 1 | Discovery Call complete (bug fixes, intake pop-up, calendar colours, availability calendar) | ✅ Complete (Parts A–F done) |
| 2 | Show the offer: three doors, packages, "help me choose" (display only) | 📋 Planned |
| 3 | Packages & balances (no real money yet) | 📋 Planned |
| 4 | Group coaching | 📋 Planned |
| 5 | Go live: PayTabs for Discovery Call, packages, group places | 📋 Planned (at launch) |

## Known issues found during review
- **Google Calendar disconnected (2026-09-26)**: all `GOOGLE_*` secrets are set but live `get-availability` returns `googleCalendarConnected: false`. Likely cause: the OAuth app is in Google "Testing" mode (External + Test Users, per `booking/google-calendar-setup.md` §2), where refresh tokens expire after 7 days; the token was set 2026-09-15. Commit `fe12f68` made `get-availability` ignore the failure, while `create-booking` still refuses bookings when Google fails, so no booking can be created until it is reconnected. Fix (user, needs Mai's Google sign-in): publish the OAuth app, re-run setup §5, set the new `GOOGLE_REFRESH_TOKEN`. Stage 1 has a prerequisite check for this. Fix in progress: token stored server-side by the callback (commit `fix(booking): store Google Calendar token server-side on reconnect`).
- `booking_blackouts` table exists but no Edge Function reads it; `AdminBlackoutsModal.tsx` is not rendered anywhere. Availability uses `coach_availability_rules` only. (Fixed in docs by Stage 1 Part F.)
- `npx tsc --noEmit` at the repo root checks nothing (root tsconfig has `"files": []`). Use `npm run typecheck`; the repo has ~59 pre-existing errors, so acceptance is "no new errors vs baseline".
- Course and shop prices are shown in `$`; out of scope here.

## Open questions
- None as of 2026-09-26.
