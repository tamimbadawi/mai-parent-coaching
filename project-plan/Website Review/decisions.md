# Website Review — Decisions

## Settled (agreed 2026-09-29)

1. **Order:** Step 0 → Phase 1 → Dev env → Decision gate → Phases 2–7. Nothing starts before the Step 0 backup exists.
2. **Where changes land:** Phase 1 is small and urgent, so it is applied directly to production after Step 0. From Phase 2 on, everything is built and tested on the dev Supabase project first.
3. **Branches:** each phase gets its own branch; the base branch is confirmed with the user at the start of each phase (current integration branch: feature/booking-schedule, 32 commits ahead of main). One commit per step. Never commit to main; no push or merge without the user's approval (AGENTS.md).
4. **Mockup before implementation** for every user-facing journey or layout change: steps 2.3, 3.1, 3.12, 6.1, 6.5, and any new pop-up.
5. **No-scroll rules** for /booking and pop-ups still apply; Claude measures at 1366×768, 1440×900, 1920×1080 and 375×812.
6. **Verification:** every step has an acceptance check. Antigravity marks UI and end-to-end checks "NOT RUN — for Claude". Claude verifies independently (git diff scope, `npm run typecheck` vs baseline 58, `deno check`, live DB read-only, browser).
7. **Migrations:** timestamped files in supabase/migrations; never delete user data inside a migration; never revoke EXECUTE on is_admin(), is_assistant() or has_family_unlock(), because RLS policies call them.
8. **Security writing rule (public repo):** no keys, passwords, commit hashes that point at secrets, personal emails, or step-by-step exploit instructions in project-plan docs.
9. **Keep it simple:** the smallest fix per step. No refactoring of working code for its own sake; large files are split only when a step already changes them.
10. **Keep, do not rewrite:** the scheduling engine (_shared/booking-scheduling.ts), the bookings_no_active_overlap constraint, create-booking's validation, the family-unlock gate, enrollment-gated signed video, server-side Google token storage, the WhatsApp service's auth and proxy allowlist plus the dispatcher's de-duplication, the security_invoker CRM view, the stack and RLS-everywhere approach, and the visual identity (only darken text and button colours).

## Open — answer with Mai before Phase 2

- **D1:** Discovery Calls — instant confirmation or manual approval? What happens to requests nobody approves (auto-release after N hours, or before the start time)?
- **D2:** Do 1:1 packages launch at go-live?
- **D3:** How is payment taken at launch — PayTabs hosted payment page, or an interim payment link tracked in an orders table?
- **D4:** Cancellation and reschedule policy (notice period, fee, number of reschedules). One policy for the Terms, the UI and the server.
- **D5:** Assistant permissions — staff management? Booking approval? Availability? Family sessions?
- **D6:** Gemini — enable the paid tier, or pause AI on real client data? Consent wording.
- **D7:** Should parents see the booking page (times and prices) before creating an account?
- **D8:** Should Google Calendar event descriptions include children's names and ages?
