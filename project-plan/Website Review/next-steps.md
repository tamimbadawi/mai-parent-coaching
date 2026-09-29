# Website Review — Next Steps

Finding IDs refer to audit-findings.md. Every step ends with a check; Claude verifies before it is ticked.

## Step 0 — Safety net
- [ ] 0.1 Full production database backup (pg_dump), stored outside the repo and never committed. Done by the user, or by Antigravity with the user's approval. (C12) Check: dump is non-empty and lists all public tables.
- [ ] 0.2 (User, recommended) Make the GitHub repo private. (C1)

## Phase 1 — Security lockdown (production, after 0.1)
- [ ] 1.1 Rotate the Supabase keys. Update Vercel env, Edge Function secrets (including any custom SERVICE_ROLE_KEY), the GitHub Actions secret, and local .env. Same day, review Supabase logs for unusual service-role use (the Free plan keeps about 1 day). (C1) Check: old key rejected; booking, approval and WhatsApp dispatch still work.
- [ ] 1.2 BEFORE UPDATE trigger on profiles so that only admins can change role or approval_status. (C2) Check: a test student's role change is rejected; admin edits in the CRM still work.
- [ ] 1.3 handle_new_user() always creates students; remove or demote admin@admin.com (ask the user which); the frontend and create-booking decide staff status from profiles.role only (the 7 places in C3). (C3) Check: signing up with role metadata creates a student; re-run the security advisor.
- [ ] 1.4 Drop the public bookings INSERT policy. In the same step, hide or disable the package "Reserve" button until 3.2. (C4) Check: an anonymous REST insert is rejected; a Discovery booking via create-booking still works.
- [ ] 1.5 contact_messages: SELECT for admins only; INSERT for anon and authenticated, with length checks. (C5) Check: a student's SELECT returns 0 rows.
- [ ] 1.6 Interim assistant limit: only role 'admin' may create, update or delete staff accounts, roles and passwords in admin-user-manager. The final permissions list comes from D5. (H1) Check: an assistant gets 403 on staff changes.
- [ ] 1.7 Tighten the public database surface. Revoke anon/authenticated EXECUTE on sweep_stale_whatsapp_messages and on the trigger-only functions (handle_new_user, prevent_course_deletion_with_enrollments); revoke anon on complete_user_profile; set search_path on the 2 flagged functions; drop test_connection; enable leaked-password protection and MFA for admin accounts. Never revoke on is_admin, is_assistant or has_family_unlock. (M6) Check: the security advisor is clean of these items; public course pages still load when logged out.
- [ ] 1.8 If any real client's sessions go through Gemini today, pause AI on real client data until D6. (C10) Check: confirmed with the user and recorded in status.md.
- [ ] 1.9 Security regression check proving C2–C5 stay closed (Claude's read-only checks on production; a small script on dev once it exists). Re-run it after every future migration.

## Dev environment (right after Phase 1)
- [ ] DEV.1 Separate dev Supabase project with all migrations applied. Point local .env, scripts/ and the Vercel Preview environment at it; scripts refuse to run against the production project ref. (C12) Check: the app runs against dev; a script aborts when pointed at production.

## Decision gate
- [ ] D1–D8 answered and recorded in decisions.md.

## Phase 2 — Truthful booking journey (dev first)
- [ ] 2.1 Reconnect Google Calendar as Mai's account; apply D8. (C11) Check: the stored calendar account is Mai's; a test approval creates the event in Mai's calendar.
- [ ] 2.2 Implement D1 (instant confirmation or manual approval). (C7)
- [ ] 2.3 The booking success screen and "Your Sessions" states match what really happens. Mockup first. (C7)
- [ ] 2.4 Notify Mai immediately about every new booking request (admin notification plus WhatsApp to Mai). (C7) Check: a notification arrives within a minute.
- [ ] 2.5 Server-side reschedule validation (same slot rules as create-booking, a status check, and D4). Remove the hard-coded fallback times and the Sat/Sun weekend check; surface calendar-update failures. (C6) Check: rescheduling to a closed or past time returns 400.
- [ ] 2.6 Stale pending bookings stop blocking slots, per D1. (C7)
- [ ] 2.7 D4 cancellation/reschedule rules enforced on the server; Mai notified when a client cancels; Terms and UI copy aligned. (M7, M11, H2)
- [ ] 2.8 Server-side booking rules: a per-person limit on active pending bookings, a maximum booking horizon, and "1:1 coaching only after Discovery" (add a real admin-unlock column or remove that code path). (H2)
- [ ] 2.9 Schedule the 24h and 1h reminders; send the signup welcome message from the server. (H8) Check: reminder rows appear in whatsapp_messages for a dev test booking.
- [ ] 2.10 Admin booking robustness: idempotent approve, no reviving cancelled bookings, friendly error messages, fix "(undefined)" in manual booking. (M7, M8)

## Phase 3 — Functional launch product
- [ ] 3.1 Payments per D3: an orders table written only by the server, prices set on the server, PayTabs hosted page, verified IPN, idempotent, and a read-only return page. Mockup the checkout first; test in sandbox. (C9)
- [ ] 3.2 Packages per D2: client_packages (already designed in project-plan/offer-journey/schema.md) created via an Edge Function; re-enable the Reserve button; the admin "needs scheduling" view reads client_packages. (C9)
- [ ] 3.3 Wire the contact form (insert, loading, error, retry, honeypot) and add an admin alert. (C8)
- [ ] 3.4 Remove or honestly relabel the newsletter, resource download and Shop/cart until they are real. (C8)
- [ ] 3.5 Course "Enroll Now": make it real via 3.1, or replace the call-to-action. (C8)
- [ ] 3.6 Real account deletion (server function), or honest "email us to delete your data" copy. (C8)
- [ ] 3.7 Remove the admin sample inbox messages and the demo families. (H7)
- [ ] 3.8 Remove unverifiable statistics and ratings; confirm "500+ families" with Mai. (H3)
- [ ] 3.9 Real contact details and social links, kept in one config. (H3)
- [ ] 3.10 One price list and one currency; fix the FAQ payment answer; the homepage courses section shows courses; real photos of Mai. (H3)
- [ ] 3.11 Rewrite the privacy, cookie and terms pages to match reality (data processors, children's data, retention, contact for data requests); legal review. (C10, M11)
- [ ] 3.12 If D7 = yes: the booking page is visible before sign-up. Mockup first. (H6)

## Phase 4 — Sensitive data
- [ ] 4.1 Verify the Gemini API project, billing tier and data terms. (C10)
- [ ] 4.2 Apply D6; capture consent for recordings and AI.
- [ ] 4.3 Data-handling document: what is stored, where, who can access it, and which processors receive it.
- [ ] 4.4 Retention and access rules for clinical data, including account deletion and calendar event text.

## Phase 5 — Production infrastructure
- [ ] 5.1 Take a fresh backup, then remove test data from production (the list is reviewed with the user and Mai first). (C12)
- [ ] 5.2 Backups: Supabase Pro (daily backups, no pausing) or scheduled dumps; test one restore. (C12)
- [ ] 5.3 CI on pull requests: build, typecheck (no new errors) and lint. Retire the push-to-main in scripts/deploy.js. (M9)
- [ ] 5.4 Basic error monitoring. (M9)
- [ ] 5.5 Security headers in vercel.json; delete public/_headers and public/test.html. (H4)
- [ ] 5.6 Custom SMTP for auth emails; custom domain plus Supabase redirect URLs; confirm the Vercel plan allows commercial use. (M12)
- [ ] 5.7 Reconcile migration history with the live database (whatsapp_settings, test_connection). (M6)

## Phase 6 — Quality & performance
- [ ] 6.1 Contrast: darker text and button colour tokens, mint kept as an accent. Preview with Mai first. (H5)
- [ ] 6.2 Optimise the hero image (WebP or AVIF). (M1)
- [ ] 6.3 Lazy-load the admin, dashboard and clinical routes; don't block first render on fonts. (M1)
- [ ] 6.4 Fix the 320px overflow (course detail page, decorations). (M5)
- [ ] 6.5 Booking typography: no text under 12px, within the no-scroll rule. Mockup first. (M4)
- [ ] 6.6 SEO: per-page titles and descriptions, robots.txt, sitemap.xml, canonical, a 404 route; hide or noindex /home-preview. (M2, M3)
- [ ] 6.7 Accessibility: keyboard and touch access to the door details, labelled icon links, announced errors, adequate touch targets. (M4)
- [ ] 6.8 Automated tests for the critical paths: RLS, create-booking, reschedule, the scheduling engine including daylight-saving dates, and payments.

## Phase 7 — Cleanup
- [ ] 7.1 Remove dead code. (L1)
- [ ] 7.2 Docs: AGENTS.md, README, and the stale claims in project-plan/booking/status.md. (L4)
- [ ] 7.3 Large components: split only when changed for another step; no standalone refactor.
- [ ] 7.4 Dependency updates and `npm audit fix`. (L6)
- [ ] 7.5 Polish: TS and lint errors, duplicated config, repo hygiene, WhatsApp button placement, OAuth callback and the debug endpoint. (L2, L3, L5, L7, L9)
- Later: Arabic/RTL (L8); the official WhatsApp API (M10).
