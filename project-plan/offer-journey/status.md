# Offer & Booking Journey — Status

## Current Status: 🟡 Planned — Stage 1 ready to build
- Plan agreed with the user on 2026-09-26 (Claude Code review + user decisions). See [decisions.md](file:///d:/Cursor/Mai_Website/project-plan/offer-journey/decisions.md), [schema.md](file:///d:/Cursor/Mai_Website/project-plan/offer-journey/schema.md), [next-steps.md](file:///d:/Cursor/Mai_Website/project-plan/offer-journey/next-steps.md), [stage-1-spec.md](file:///d:/Cursor/Mai_Website/project-plan/offer-journey/stage-1-spec.md).
- Already built and committed on `feature/booking-schedule` (commit `fe12f68`): Mai's weekly schedule migration applied, Discovery Call (`initial`) renamed and set to 30 min, "free" wording removed, slot-fit fix, hidden legacy session types, edge functions redeployed.
- Branch for implementation: `feature/booking-schedule`.

## Stage Progress

| Stage | Focus | Status |
| :--- | :--- | :--- |
| 1 | Discovery Call complete (bug fixes, intake pop-up, calendar colours, availability calendar) | ⏳ Ready — spec in stage-1-spec.md |
| 2 | Show the offer: three doors, packages, "help me choose" (display only) | 📋 Planned |
| 3 | Packages & balances (no real money yet) | 📋 Planned |
| 4 | Group coaching | 📋 Planned |
| 5 | Go live: PayTabs for Discovery Call, packages, group places | 📋 Planned (at launch) |

## Known issues found during review
- **Google Calendar disconnected (2026-09-26)**: all `GOOGLE_*` secrets are set but live `get-availability` returns `googleCalendarConnected: false`. Likely cause: the OAuth app is in Google "Testing" mode (External + Test Users, per `booking/google-calendar-setup.md` §2), where refresh tokens expire after 7 days; the token was set 2026-09-15. Commit `fe12f68` made `get-availability` ignore the failure, while `create-booking` still refuses bookings when Google fails, so no booking can be created until it is reconnected. Fix (user, needs Mai's Google sign-in): publish the OAuth app, re-run setup §5, set the new `GOOGLE_REFRESH_TOKEN`. Stage 1 has a prerequisite check for this.
- `booking_blackouts` table exists but no Edge Function reads it; `AdminBlackoutsModal.tsx` is not rendered anywhere. Availability uses `coach_availability_rules` only. (Fixed in docs by Stage 1 Part F.)
- `npx tsc --noEmit` at the repo root checks nothing (root tsconfig has `"files": []`). Use `npm run typecheck`; the repo has ~59 pre-existing errors, so acceptance is "no new errors vs baseline".
- Course and shop prices are shown in `$`; out of scope here.

## Open questions
- None as of 2026-09-26.
