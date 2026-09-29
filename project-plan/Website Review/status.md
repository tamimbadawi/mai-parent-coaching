# Website Review — Status

## Current Status: Audit complete · Plan written · Nothing implemented yet

> [!IMPORTANT]
> Source: full read-only production audit by Claude Code on 2026-09-29 (code, git history, live Supabase via read-only SQL and the security advisor, browser checks at 1440/375/320px, production headers and bundle). The audit changed nothing.
> The GitHub repo is public: do not push this folder until Phase 1 is complete or the repo is private.
> Overall classification: **Needs Important Fixes**. The foundation is sound; no major rework needed.

## Phase tracker

| Stage | Focus | Status | Verified by Claude |
| :--- | :--- | :--- | :--- |
| Step 0 | Safety net (backup) | ⬜ Not started | – |
| Phase 1 | Security lockdown | ⬜ Not started | – |
| Dev env | Separate dev Supabase project | ⬜ Not started | – |
| Decision gate | D1–D8 answered | ⬜ Open | – |
| Phase 2 | Truthful booking journey | ⬜ Not started | – |
| Phase 3 | Functional launch product | ⬜ Not started | – |
| Phase 4 | Sensitive data | ⬜ Not started | – |
| Phase 5 | Production infrastructure | ⬜ Not started | – |
| Phase 6 | Quality & performance | ⬜ Not started | – |
| Phase 7 | Cleanup | ⬜ Not started | – |

A step counts as done only when Claude's independent check is recorded in this file.

## Live snapshot at audit time (2026-09-29)
- Supabase organisation on the Free plan; one project is used for both production and testing.
- 16 auth accounts (11 look like test accounts); 25 bookings (10 test-like, 11 on retired session types); 3 future pending bookings holding real slots.
- 0 contact messages ever saved; 0 course enrollments; no WhatsApp reminders or booking confirmations ever sent.
- Google Calendar is connected to the developer's Google account, not Mai's.
- Production bundle: one 1.66 MB JS file (419 KB gzipped); homepage first load ≈1.5 MB.
- `npm run typecheck` baseline: 58 errors (52 unused-variable, 6 real). Acceptance = no new errors.

## Not verifiable during the audit
- Pages behind sign-in (booking page UI, client dashboard, admin): code review only; no-scroll measurements not re-run.
- Supabase Auth settings (email confirmation, SMTP), Vercel plan/env/domain, Edge Function secret values, Gemini billing tier, Bunny token authentication, WhatsApp VM, GitHub settings, real-device performance, screen readers.
