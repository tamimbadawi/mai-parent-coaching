# Offer & Booking Journey — Staged Implementation Plan

> [!IMPORTANT]
> - Each stage is its own confirmed step. Do not batch stages.
> - Stage 1 is fully specified in stage-1-spec.md; follow it exactly, including its rules section.
> - Every stage ends with: `npm run typecheck` vs baseline, `deno check` for touched functions, a commit, and updated status.md/decisions.md.
> - No real payments before Stage 5.

```
STAGE 1: Discovery Call complete
   ▼
STAGE 2: Show the offer (display only)
   ▼
STAGE 3: Packages & balances
   ▼
STAGE 4: Group coaching
   ▼
STAGE 5: Go live — PayTabs (at launch)
```

---

## Stage 1 — Discovery Call complete
- [x] Prerequisite: Google Calendar connected check
- [x] Part A1: Booking page shows made-up times (`src/pages/Booking.tsx`)
- [x] Part A2: Browser copy of the schedule logic (`src/lib/bookingAvailability.ts`)
- [x] Part A3: Rescheduled sessions saved at the wrong hour (`supabase/functions/admin-booking-manager/index.ts`)
- [x] Part A4: Google Calendar failure handling (`supabase/functions/get-availability/index.ts`)
- [x] Part A5: Prices in EGP (`src/data/content.ts`, `src/pages/Booking.tsx`)
- [x] Part B1: Migration `supabase/migrations/20260926170000_booking_discovery_intake.sql`
- [x] Part B2: Types (`src/types/index.ts`)
- [x] Part B3: Content (`src/data/content.ts`)
- [x] Part B4: Server copy (`supabase/functions/_shared/booking-scheduling.ts`)
- [x] Part B5: `supabase/functions/create-booking/index.ts`
- [x] Part C1: Calendar colours (`supabase/functions/_shared/google-calendar.ts`)
- [x] Part C2: One shared event layout (`supabase/functions/admin-booking-manager/index.ts`)
- [x] Part D: Discovery Call pop-up (3 screens) (`src/components/booking/DiscoveryIntakeModal.tsx`)
- [x] Part D2: Wire modal into `src/pages/Booking.tsx`
- [x] Part D3: Show answers to Mai (`src/pages/admin/AdminBookings.tsx`)
- [x] Part E: Admin availability as a month calendar (`AdminAvailabilityModal.tsx` + `AvailabilityMonthCalendar.tsx`)
- [x] Part F: Docs update (`status.md`, `decisions.md`)
- [ ] Link: [stage-1-spec.md](file:///d:/Cursor/Mai_Website/project-plan/offer-journey/stage-1-spec.md)
- **Exit:** all Stage 1 checks in stage-1-spec.md pass and the final report is pasted to the user.

---

## Stage 2 — Show the offer (display only)
- [ ] Add `groupPackages` (the §4 table) to `src/data/content.ts`; `coachingPackages` already exists from Stage 1.
- [ ] `/booking` left column → three door cards (reuse the current card component and style; ids `discovery`, `coaching`, `groups`).
- [ ] Discovery door → current Discovery flow (unchanged).
- [ ] Coaching door, **new family** (guest, or logged in with no `completed` booking): show the 5 package cards with price, per-session price, "Saves x%", "Use within", plus the "Help me choose" chips inline; the only action is "Start with a Discovery Call".
- [ ] Coaching door, **returning client** (logged in with ≥1 `completed` booking): package cards shown, and the current 60-min slot booking stays available as "Single Session". No purchase button until Stage 3.
- [ ] Groups door: "Coming soon", the 9 topics, the 4–8 people rule and the 3 group packages. No sign-up.
- [ ] Mobile: three doors stack; no horizontal scroll at 375 px.
- **Exit:** a parent can see every offer and price; nothing can be bought; no fake buttons.

---

## Stage 3 — Packages & balances
- [ ] Migration from schema.md Stage 3 + RLS; verify with a script in the style of `scripts/verify-family-system-rls.js` (owner sees own rows, other student sees none, admin full).
- [ ] Admin: on the client card / AdminBookings, "Add package" (package, activation date) → creates an `active` row with `source = 'admin'` and computed `expires_at`.
- [ ] Dashboard: "Your package: Growth · 3 of 4 sessions left · use by 12 Dec".
- [ ] Booking a Mon/Wed slot while logged in with an active package attaches `client_package_id`; `create-booking` enforces the Stage 3 rules server-side.
- [ ] No active package → coaching door shows packages with "Available at launch" (no fake checkout).
- **Exit:** a package assigned by admin can be used session by session until it runs out or expires; everything enforced on the server.

---

## Stage 4 — Group coaching
- [ ] Migration from schema.md Stage 4 + `join_coaching_group` function + public view + RLS; RLS/concurrency verification script (9th join is rejected; two joins at the same time never exceed 8).
- [ ] Admin: create Mai group (topic, title, package), approve private requests, see members, add session dates (creates calendar events per schema rules), mark members active (until Stage 5).
- [ ] Public Groups door: open groups with seat dots and the derived state; "Join" (logged in) calls the function; "Start your own group" form (topic from the 9, title, short note) creates a `requested` private group and shows the invite code after approval.
- [ ] Notifications to members when a group reaches 4 and when dates are set (reuse existing email/WhatsApp mechanisms; if none fits, list it under Open questions instead of building a new system).
- **Exit:** groups fill, confirm at 4, close at 8, get dates from Mai; no member sees another member's contact details.

---

## Stage 5 — Go live: PayTabs (at launch)
- [ ] Follow `project-plan/payments/next-steps.md` for the PayTabs build; this stage only lists the three things it must sell: Discovery Call (EGP 500), 1:1 packages, group places.
- [ ] Apply the "five places" status change from schema.md Stage 5 if Discovery bookings wait for payment.
- [ ] Package `pending_payment` → `active` and group member `reserved` → `active` only after a verified IPN.
- [ ] Remove admin "manual activation" for real clients (keep for test accounts only) — confirm with the user first.
- **Exit:** real payments confirmed server-side activate bookings, packages and group places; `AdminOrders` shows real orders.
