# Website Review — Audit Findings (2026-09-29)

Verified by Claude Code: read-only code review, live DB queries and the Supabase security advisor, browser checks. Severity: CRITICAL / HIGH / MEDIUM / LOW. "Step" = next-steps.md item.

## Critical & launch-blocking
| ID | Sev | Where | Problem | Fix direction | Step |
| :-- | :-- | :-- | :-- | :-- | :-- |
| C1 | CRITICAL | git history of scripts/ (removed from files, still in public history) | Supabase service-role key was committed; it matches the live key (never rotated) | Rotate keys; update every consumer | 1.1 |
| C2 | CRITICAL | profiles UPDATE policy (migration 20260627150000, line 58) | Signed-in users can change privileged columns (incl. role) on their own row | Trigger: only admins change role/approval_status | 1.2 |
| C3 | CRITICAL | handle_new_user() (20260927110000, line 54); role checks in AuthContext.tsx:41, ProtectedRoute.tsx:26, Login.tsx:95, AuthCallback.tsx:30, Navbar.tsx:31, Dashboard.tsx:106, create-booking/index.ts:111 | Signup metadata or a fixed email can create an admin; a generic admin@admin.com admin exists; the frontend trusts user metadata and a hard-coded email | Always create students; remove/demote that account; role from profiles.role only | 1.3 |
| C4 | HIGH | bookings INSERT policy (20260914173000, line 38) | Anyone, including anonymous visitors, can insert any booking row directly, bypassing create-booking | Drop the policy; all writes via Edge Functions | 1.4 |
| C5 | HIGH | contact_messages SELECT policy (20260627150002, line 42) | Any signed-in user can read all contact messages (dormant: 0 rows today) | SELECT = is_admin(); INSERT anon+authenticated with limits | 1.5 |
| C6 | HIGH | admin-booking-manager/index.ts:248; ClientRescheduleModal.tsx:49, 85 | Client reschedule not checked against availability, notice, past dates or status; the modal falls back to hard-coded times; the weekend check is Sat/Sun | Reuse create-booking's slot validation; remove the fallback | 2.5 |
| C7 | HIGH | Booking.tsx:370; create-booking | Success screen says the invite was sent, but the booking is only pending until manual approval; Mai isn't notified; pending bookings hold slots forever | Per D1; honest copy; notify Mai; expiry | 2.2–2.4, 2.6 |
| C8 | HIGH | Contact.tsx:10, Footer.tsx:9, Resources.tsx:26, Shop.tsx:21, ProfileSettings.tsx:141, CourseDetail.tsx:472 | Contact, newsletter, resource download, add-to-cart, account deletion and Enroll Now show success or do nothing without saving or sending | Wire the contact form; remove or relabel the rest | 3.3–3.6 |
| C9 | HIGH | PackageReservationModal.tsx:93; no orders table | No payment path; package reservation omits the required starts_at/ends_at/reserved_until, so it always fails; admin manual booking rejects package IDs | Per D2/D3; client_packages via an Edge Function; PayTabs | 3.1–3.2 |
| C10 | HIGH | _shared/gemini.ts:5 (free-tier comments); session-* and family-* functions; legal pages | Session transcripts, family data and note images go to Gemini (code indicates the free tier); the privacy policy doesn't disclose this | Per D6; pause if real data; consent; privacy rewrite with legal review | 1.8, 3.11, 4.x |
| C11 | HIGH | google_calendar_tokens (live) | Calendar is connected to the developer's Google account, not Mai's | Reconnect as Mai | 2.1 |
| C12 | HIGH | Supabase (Free plan, single project); scripts/*.js | No backups; production doubles as the test environment (test users, bookings, demo households) | Backup first; dev project; clean-up; Pro plan | 0.1, DEV.1, 5.1–5.2 |

## High
| ID | Where | Problem | Step |
| :-- | :-- | :-- | :-- |
| H1 | admin-user-manager/index.ts:118; admin-booking-manager/index.ts:145; availability/blackout/settings policies | Assistant can create admins, change the owner's password and delete accounts, yet can't approve bookings or manage availability | 1.6, D5 |
| H2 | Booking.tsx:94–100; create-booking | "1:1 coaching after Discovery" is only enforced in the browser; the coaching_unlocked column doesn't exist; no per-person pending limit or horizon; the 24h rule isn't enforced | 2.7–2.8 |
| H3 | Contact.tsx, Footer.tsx, content.ts services, Login/Register stats, CourseDetail.tsx:417, FAQ, Home.tsx:172, About images | Placeholder contact details and `#` social links; Services prices in USD vs booking in EGP; unverifiable stats and ratings; false FAQ payment answer; homepage "Online Courses" section shows blog posts; stock photos | 3.8–3.10 |
| H4 | public/_headers (Vercel ignores it); vercel.json | No security headers served in production | 5.5 |
| H5 | src/index.css colour tokens | White on mint CTA 1.75:1; mint-dark text 2.2:1; soft-gray 2.2:1 (need 4.5:1) | 6.1 |
| H6 | App.tsx:74 | Logged-out "Book a Session" goes straight to registration | 3.12, D7 |
| H7 | AdminMessages.tsx:17; AdminSessions.tsx:420 | Admin inbox shows sample messages when empty; demo families mixed into the real client list | 3.7 |
| H8 | whatsapp-scheduler (no pg_cron); Register.tsx:123 | Reminders never scheduled (0 sent); the signup welcome message uses the new user's own token and is rejected | 2.9 |

## Medium
| ID | Problem | Step |
| :-- | :-- | :-- |
| M1 | One 1.66 MB bundle; 950 KB hero PNG; first render waits for 5 font files (main.tsx:9) | 6.2–6.3 |
| M2 | Same title on every page; no robots/sitemap/canonical; /home-preview indexable | 6.6 |
| M3 | No 404 page (blank screen); /shop and /home-preview orphaned | 6.6 |
| M4 | Booking text 8.5–11px; door details hover-only; unlabelled icon links; errors not announced; small touch targets | 6.5, 6.7 |
| M5 | Overflow at 320px (course detail text cut off; decorative lines on Home/About) | 6.4 |
| M6 | Anon-executable SECURITY DEFINER functions; 2 mutable search_path; test_connection anon table; migration drift; unused blackout/settings tables; a past migration deleted profiles; leaked-password protection off; no admin MFA | 1.7, 5.7 |
| M7 | Approve not idempotent; approve/sync can revive cancelled bookings; client cancellations don't notify Mai; editing type doesn't recompute times; "(undefined)" in manual booking (AdminManualBookingModal.tsx:264) | 2.7, 2.10 |
| M8 | Raw database errors and diagnostics returned to users | 2.10 |
| M9 | scripts/deploy.js does git add -A and pushes to main; no CI; no error monitoring | 5.3–5.4 |
| M10 | WhatsApp via unofficial WhatsApp Web automation — number ban risk | Later |
| M11 | Terms (50% fee under 24h) vs booking copy ("reschedule anytime with 24h notice"); refund wording; USD vs EGP | 2.7, 3.11 |
| M12 | Free-plan auth email limits may drop confirmation/reset emails (not verified) | 5.6 |

## Low
| ID | Problem | Step |
| :-- | :-- | :-- |
| L1 | ~5,000 lines never imported (AdminUsers, BunnyStreamPlayer, AdminBlackoutsModal, CourseEditorModal, Community, DesignToggle, 6 session components/hooks) | 7.1 |
| L2 | Typecheck 58 errors (6 real); lint 116 errors / 28 warnings | 7.5 |
| L3 | Session durations defined in 4 places; intake labels in 2 | 7.5 |
| L4 | Stale docs: AGENTS.md (theme.tsx, BunnyStreamPlayer, feature status, "booking hides Navbar & Footer"); README broken links; booking/status.md says create-booking creates calendar events and that Navbar/Footer are hidden | 7.2 |
| L5 | supabase/.temp and .bolt tracked; many stale branches; project-plan/courses.zip | 7.5 |
| L6 | npm audit: 3 high in ws (server-side only); supabase-js well behind | 7.4 |
| L7 | WhatsApp button shows on admin pages and covers bottom-right controls | 7.5 |
| L8 | English only; no Arabic/RTL | Later |
| L9 | OAuth callback echoes its error parameter and has no state; verify-calendar-event debug endpoint | 7.5 |
