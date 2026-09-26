# Stage 1 — Discovery Call complete (spec)

Repo: `D:\Cursor\Mai_Website` · Branch: `feature/booking-schedule` · Starting commit: `fe12f68` (or later on the same branch)
Design references (in this folder): design/discovery-popup.html (visual style for the pop-up; its steps 2 and 3 are replaced by this spec) and design/booking-plan.html (the agreed plan; its "Help me choose" section shows the exact questions, chips and 5×5 table).

Open both in a browser before starting Part D.

---

## 0. Rules for this task (read first, follow exactly)

1. Read `AGENTS.md` and `project-plan/booking/status.md` + `decisions.md` before touching code.
2. Work only on `feature/booking-schedule`. Do not create branches. Do not push. Do not merge.
3. Change **only** the files named in each part. No refactors, renames, restyles or "improvements" that are not written here. If you think something else needs changing, **write it in your final report instead of doing it**.
4. If the code at a described location does not match what this prompt says (a line, variable or block is missing or different), **STOP that part and report exactly what you found**. Do not improvise a workaround.
5. No new npm packages. Use what is installed: React 18, Tailwind, framer-motion, lucide-react, date-fns.
6. Never fake a success. Every success/error message must come from a real database or Edge Function result.
7. Keep IDs stable: appointment type ids (`initial`, `coaching-60`, …) and the new ids defined below must be used exactly as written.
8. One commit per part, using the commit message given. Commit only files from that part.
9. Finish with the report described in section 9. Report every check honestly. If a check could not be run, say so and why.

### Type-check method (important)
`npx tsc --noEmit` at the repo root checks **nothing** (root tsconfig has `"files": []`). Use:
```
npm run typecheck
```
The repo already has about 59 errors (mostly unused imports) that are not part of this task. So before Part A, save the baseline:
```
npm run typecheck > .git/tsc-baseline.txt 2>&1
```
After each part, run it again into `.git/tsc-after.txt` and compare. **Acceptance: no error line in `tsc-after` that is not in `tsc-baseline`** (line numbers can shift in files you edited; an error that only moved is fine, a new message is not). Removing existing errors is fine.

### Prerequisite: Google Calendar must be connected (check before Part A)
On 2026-09-26 Google Calendar was **not connected**: all `GOOGLE_*` secrets are set, but live `get-availability` returns `"googleCalendarConnected": false`. The likely cause is that the OAuth app is in Google "Testing" mode, where refresh tokens expire after 7 days (the token was set on 2026-09-15). Reconnecting needs Mai's Google sign-in, so **the user does it, not you** (Google Cloud Console → OAuth consent screen → Publish app, then `project-plan/booking/google-calendar-setup.md` section 5).
Before Part A, run (next Tuesday's date, public anon key from `.env.local`):
```
curl -s -X POST "$VITE_SUPABASE_URL/functions/v1/get-availability" -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{"date":"<next Tuesday YYYY-MM-DD>","appointmentTypeId":"initial","timeZone":"Africa/Cairo"}'
```
It must show `"googleCalendarConnected":true` and `"availableSlots":["11:00","11:45","12:30"]` (minus any booked). **If it shows `false`, STOP and report. Do not start Part A.** Never print or commit secret values.

Edge functions: after editing any file in `supabase/functions/`, run
```
deno check supabase/functions/admin-booking-manager/index.ts supabase/functions/create-booking/index.ts supabase/functions/get-availability/index.ts
```
It must exit with no errors.

---

## Part A — Bug fixes

### A1. Booking page shows made-up times (`src/pages/Booking.tsx`)
Today, when a day has no open times or availability fails to load, the page shows fake times from `DEFAULT_SLOTS` (line ~170). Parents can pick them and only get an error when they submit.
- Delete the `DEFAULT_SLOTS` constant (~170).
- `availableTimes` initial state (~179) → `[]`.
- Add state `const [slotsError, setSlotsError] = useState<string | null>(null);` next to it.
- In `loadLiveAvailability`: call `setSlotsError(null)` right after `setLoadingSlots(true)`.
  - On success: `setAvailableTimes(slots)` (use `[]` if not an array), and clear `selectedTime` if it is not in the new list. **Remove** the `else { setAvailableTimes(DEFAULT_SLOTS) }` branch (~202).
  - In `catch` (~207): `setAvailableTimes([])`, `setSelectedTime(null)`, `setSlotsError("We couldn't load open times. Please try again in a moment.")`. Keep the existing `console.error`.
- In the time list render (~547–552), add a branch **before** the `availableTimes.length === 0` branch: when `slotsError` is set, show it in a `<p role="alert">` with `text-terracotta-dark` (same size and padding as the "no times" text).
- Change the empty text (~551) to: `No open times on this date. Please try another date.`

### A2. Browser copy of the schedule logic (`src/lib/bookingAvailability.ts`)
Lines ~222–227: when a weekday has no weekly rules, this function returns `10:00–14:00`. The server returns nothing (closed by default). Make it match the server: return the mapped `recurringRules` (an empty array when there are none) and delete the 10:00–14:00 fallback and its comment. Add a one-line comment: closed by default, matching the server.

### A3. Rescheduled sessions saved at the wrong hour (`supabase/functions/admin-booking-manager/index.ts`)
Line ~221 `new Date(\`${newDate}T${newTime}:00\`)` parses the time as the **server's UTC clock**. The picker shows times in the client's timezone (`tz`), so Cairo sessions shift by hours.
- Import `isValidDateKey`, `isValidTime`, `isValidTimeZone`, `zonedDateTimeToUtc` from `'../_shared/booking-scheduling.ts'`.
- After `const tz = …` add: if `!isValidDateKey(newDate) || !isValidTime(newTime) || !isValidTimeZone(tz)` → `return json({ error: 'Invalid date, time, or timezone.' }, 400);`
- Replace `newStartLocal` with `const newStart = zonedDateTimeToUtc(newDate, newTime, tz);` and compute `newStartsAt`, `newEndsAt`, `newReservedUntil` from `newStart` exactly as before (same duration/buffer maths). Add a short comment explaining the times are wall-clock values in `tz`.

### A4. Google Calendar failure handling (`supabase/functions/get-availability/index.ts`)
Commit `fe12f68` changed lines ~158–166 so that when Google Calendar can't be reached, availability **ignores Mai's Google busy times** and still shows slots. But `create-booking` (lines ~109–116) **refuses** bookings in that same situation (503). Result: parents see times, pick one, and fail at the end.
Restore the previous behaviour so both functions agree (fail closed; the booking page now shows the A1 error message):
```ts
if (calendarResult.error) {
  console.error('Google Calendar availability check failed:', calendarResult.error);
  return json({ error: 'Live calendar availability is temporarily unavailable.' }, 503);
}
const googleCalendarConnected = hasGoogleCalendar;
for (const block of calendarResult.busy) {
  busyIntervals.push({ startsAt: new Date(block.start), reservedUntil: new Date(block.end) });
}
```
This change hid a real failure: Google Calendar was disconnected (see the Prerequisite). Once it is reconnected, failing closed is the correct behaviour: Mai's personal Google events must always block booking times.

### A5. Prices in EGP (`src/data/content.ts`, `src/pages/Booking.tsx`)
- `appointmentTypes`: `initial` → add `price: 500`. `coaching-60` → `price: 3500`. Leave hidden types unchanged.
- Update the `initial` description to: `A relaxed 30-minute call to hear what is happening at home, answer your questions, and see how I can best support you.`
- `Booking.tsx` ~450 and ~658 show `$${price}`. Show `EGP ${price.toLocaleString('en-US')}` instead (e.g. `EGP 3,500`). Do not touch shop/course prices.

**Checks A:** typecheck method passes · `deno check` passes · on `/booking`, a Thursday shows "No open times on this date…" (never 10:00/10:30) · Discovery card shows `EGP 500`, coaching shows `EGP 3,500`.
**Commit:** `fix(booking): no placeholder times, reschedule timezone, calendar failure consistency, EGP prices`

---

## Part B — Discovery intake: data + server

### B1. Migration `supabase/migrations/20260926170000_booking_discovery_intake.sql`
```sql
-- Discovery Call intake answers on bookings (ids defined in src/data/content.ts and
-- supabase/functions/_shared/booking-scheduling.ts). No RLS change: existing bookings
-- policies cover all columns.
alter table public.bookings
  add column if not exists intake_topics text[],
  add column if not exists intake_need text,
  add column if not exists intake_duration text,
  add column if not exists intake_suggested_package text;
```
Apply with `supabase db push`.

### B2. Types (`src/types/index.ts`)
- Add to `Booking`: `intake_topics: string[] | null; intake_need: string | null; intake_duration: string | null; intake_suggested_package: string | null;`
- Add:
```ts
export interface DiscoveryTopic { id: string; title: string; sub: string; note: string; }
export interface IntakeOption { id: string; label: string; }
export interface CoachingPackage { id: string; title: string; sessions: number; price: number; useWithinWeeks: number; }
export interface DiscoveryIntake { topics: string[]; need: string; duration: string; suggestedPackage: string; }
```

### B3. Content (`src/data/content.ts`), after `appointmentTypes`. Use these values exactly.
`discoveryTopics` (order matters, it is the tile order):

| id | title | sub | note |
|---|---|---|---|
| emotions | Big feelings & tantrums | Meltdowns, hitting, shouting | Big feelings are one of the most common reasons parents reach out, especially between ages 2 and 8. |
| burnout | Parent burnout | Running on empty, short fuse | Looking after yourself is part of looking after them. Mai works with parent burnout every week. |
| family | Siblings & family dynamics | Rivalry, co-parenting, tension | Family patterns can shift faster than people expect once everyone is working from the same page. |
| sleep | Sleep & daily routines | Bedtime battles, mornings | Routines are usually where small changes pay off quickest. A good place to start. |
| anxiety | Worries & anxiety | Clinginess, school, fears | Anxious kids often need calm, predictable adults more than fixes. Mai will help you find what that looks like at home. |
| screens | Screens & digital life | Tablets, phones, gaming battles | Screen battles come up in almost every family now. Small, calm limits usually work better than big bans. |
| limits | Calm limits without yelling | Saying no without the shouting | Kind and firm can go together. Mai helps you find limits that hold without the yelling. |
| confidence | Confidence & independence | Shyness, clinginess, doing it alone | Confidence grows from small wins. Mai starts with everyday steps your child can manage. |
| teens | Teens, tech & mood | Moods, phones, pulling away | Teens often need connection more than rules. Mai helps you stay close while they grow up. |

`intakeNeeds: IntakeOption[]` (question: **What would help most right now?**)
`one-thing` A second opinion on one thing · `quick-tools` Quick tools for one problem · `steady` Steady support while we change things · `several` Help with several things at once · `reset` A real reset for our family

`intakeDurations: IntakeOption[]` (question: **How long has it felt hard?**)
`just-started` It just started · `weeks` A few weeks · `months` A few months · `year` About a year · `over-year` Longer than a year

`coachingPackages: CoachingPackage[]` (1:1, EGP):
`single` Single Session 1 / 3500 / 2 wks · `starter` Starter Package 2 / 6650 / 4 · `growth` Growth Package 4 / 11200 / 8 · `deep-work` Deep Work Package 8 / 21000 / 16 · `full` Full Transformation 12 / 29400 / 24

`packageSuggestionMatrix: string[][]` rows = need (order above), columns = duration (order above):
```
one-thing:   single,  single,    single,    starter,   starter
quick-tools: single,  starter,   starter,   growth,    growth
steady:      starter, growth,    growth,    growth,    deep-work
several:     growth,  growth,    deep-work, deep-work, full
reset:       growth,  deep-work, deep-work, full,      full
```
Add `export function suggestPackage(needId: string, durationId: string): CoachingPackage | undefined` that looks up the indexes in `intakeNeeds` / `intakeDurations` and returns the package from the matrix. Comment above the matrix: `Mai can move any cell. Keep in sync with PACKAGE_SUGGESTION_MATRIX in supabase/functions/_shared/booking-scheduling.ts.`

### B4. Server copy (`supabase/functions/_shared/booking-scheduling.ts`)
Add, with a "keep in sync with src/data/content.ts" comment:
- `DISCOVERY_TOPIC_TITLES: Record<string, string>` (9 ids → titles above)
- `INTAKE_NEED_LABELS`, `INTAKE_DURATION_LABELS` (ids → labels above)
- `PACKAGE_TITLES: Record<string, string>` (package id → `"Growth Package (4 sessions)"` style)
- `PACKAGE_SUGGESTION_MATRIX` (same 5×5) and `suggestPackageId(need, duration): string | null`

### B5. `supabase/functions/create-booking/index.ts`
- Import the new constants/function.
- `BookingPayload`: add `intake_topics?: unknown; intake_need?: unknown; intake_duration?: unknown;`
- Only when `appointment_type_id === 'initial'`: keep topic ids that exist in `DISCOVERY_TOPIC_TITLES` (strings only, no duplicates); accept `intake_need` / `intake_duration` only if they are known ids; **compute the suggested package on the server** with `suggestPackageId` (never trust a client-sent package). For any other type, all four values are `null`.
- Insert (next to `notes`, line ~138): `intake_topics` (null when empty), `intake_need`, `intake_duration`, `intake_suggested_package`.
- Do **not** make intake required: admin manual bookings (`AdminManualBookingModal`) create `initial` bookings without it.

**Checks B:** migration applied · typecheck method passes · `deno check` passes · deploy `supabase functions deploy create-booking`.
**Commit:** `feat(booking): store Discovery Call intake answers`

---

## Part C — Google Calendar colours + one event layout

### C1. `supabase/functions/_shared/google-calendar.ts`
- `CalendarEventPayload` (~44): add `colorId?: string;`
- Export after the interface:
```ts
// Google Calendar event colours by appointment type (Google's fixed palette ids).
export const SESSION_COLOR_IDS: Record<string, string> = {
  initial: '5',        // Banana (yellow): Discovery Call
  'coaching-60': '2',  // Sage (green): 60-Minute Coaching
};
```
- `createCalendarEvent` request body: include `colorId` only when set.
- `updateCalendarEvent` (~256): `if (updates.colorId) patchBody.colorId = updates.colorId;`

### C2. `supabase/functions/admin-booking-manager/index.ts`
Add one helper `buildCalendarEventText(booking)` returning `{ summary, description }`, used by **all three** calendar calls: approve (~113), reschedule (~250) and sync-calendar (~402). Pass `colorId: SESSION_COLOR_IDS[booking.appointment_type_id]` in all three.
- `summary`: `${appointment_type_title} — ${parent_name}` (real em dash `—`). This removes the "Coaching Session:" prefix and the garbled `â€”` on line ~403.
- `description`: lines in this order, each only when it has a value:
  `Session: …` · `Parent: …` · `Email: …` · `Phone: …` · `Country: …` ·
  child: `Child: <name> (Age: <age>)` when `child_name` is set, otherwise `Children's ages: <child_age>` when only `child_age` is set ·
  blank line + `Bringing them here:` + one `• <topic title>` per topic ·
  `Wants: <need label>` · `Felt hard for: <duration label>` · `Suggested package: <package title>` ·
  blank line + `Parent Notes:` + notes.
- **No `Booking ID` line.** The client is an attendee and can read the description.
- Delete the old one-line description on the sync-calendar path.

**Checks C:** `deno check` passes · deploy `supabase functions deploy admin-booking-manager` · approve a test Discovery booking → event is yellow, titled `Discovery Call — <name>`, description as above, no Booking ID · approve a test coaching booking → green · reschedule one → same colour, time correct in Cairo (not shifted) · "sync calendar" on a `pending_calendar_sync` booking → identical layout.
**Commit:** `feat(booking): colour-coded calendar events with one shared layout`

---

## Part D — Discovery Call pop-up (3 screens)

New file `src/components/booking/DiscoveryIntakeModal.tsx`. Style = `design/discovery-popup.html` (white rounded card, "Discovery Call" eyebrow, big Atma title, 3 step bars with the current one orange, tiles with a tick circle, orange primary button, ghost Back button). Use Tailwind brand classes (`sage`, `terracotta`, `gold`, `charcoal`, `warm-gray`, `beige`, `ivory`, `cream`); no hard-coded hex in classes.

Props: `isOpen, dateLabel, timeLabel, submitting, error, onClose, onSubmit(intake: DiscoveryIntake)`.
Header: eyebrow "Discovery Call", title **Tell Mai a little about your family**, subline `<dateLabel> · <timeLabel> · about one minute`, close (X) button, step bars `n of 3`.

**Screen 1 — What's bringing you here?** Hint: "Tap everything that fits. Most families pick two or three." Grid of the 9 `discoveryTopics` tiles (2 columns on phones, 3 on wider), each with a small illustration (port the SVG art from the design file for the first 5; draw simple matching icons in the same style for screens / limits / confidence / teens), title and sub. Multi-select with `aria-pressed`. Under the grid a yellow note box shows the `note` of the most recently selected topic (default: "Whatever you pick, there are no wrong answers. Mai will take it from here."). **Continue is disabled until at least 1 topic is picked**, with a small hint "Pick at least one to continue".

**Screen 2 — Two quick taps.** Two questions from `intakeNeeds` and `intakeDurations`, each shown as a row of pill chips (single choice, `aria-pressed`), exactly like the "Help me choose" section of `design/booking-plan.html`. Continue is disabled until both are answered. No text fields on this screen.

**Screen 3 — Looks good?** Hint: "This is what Mai will read before your call."
- Summary rows with "Edit" links back to screen 1 / 2: Bringing you here (topic pills) · Wants (need label) · Felt hard for (duration label).
- A highlighted card (orange wash, like the plan's result box): eyebrow "Families like yours usually start with", package title large, `N sessions · EGP total (EGP per session each)`, and the line **"Mai will confirm the right fit on your call."** Use `suggestPackage()`.
- A line: `Today you're booking: Discovery Call · 30 min · EGP 500`.
- Privacy line with a lock icon: "Only Mai sees your answers. They're stored with your booking and never shared."
- Error (the `error` prop) shown above the buttons in a `role="alert"` box.
- Primary button: **Book my Discovery Call** (spinner + "Booking..." and disabled while `submitting`).
- **No payment step and no payment wording beyond the price.** PayTabs is added at launch (Phase "Go live"); do not add placeholders that pretend to take payment.

Behaviour: Back on screen 1 = "Cancel" (closes). Esc and backdrop click close (not while submitting). Focus moves into the dialog on open and returns on close; Tab stays inside the dialog; body scroll locked while open. `role="dialog"`, `aria-modal`, `aria-labelledby`, an `sr-only` `aria-live` "Step n of 3". framer-motion fade/slide between screens; honour `useReducedMotion` (no movement). Rendered with `createPortal` to `document.body`, `z-[100]`. Fits 375 px wide with no horizontal scroll (the dialog itself scrolls if needed). Answers are kept if the parent closes and reopens.

Also export `ConfettiBurst` from the same file: one short canvas burst in brand colours read from CSS variables `--color-sage`, `--color-terracotta`, `--color-gold`, `--color-dusty-blue`; renders nothing with reduced motion.

### D2. Wire it into `src/pages/Booking.tsx`
- Rename the body of `handleSubmit` (~267) into `const submitBooking = async (intake?: DiscoveryIntake) => { … }` (same logic). When `intake` is given, add to the `create-booking` body: `intake_topics`, `intake_need`, `intake_duration`. Do **not** send the suggested package (the server computes it).
- New `handleSubmit(event)`: `preventDefault`; if `!canSubmit || submitting` return; if `selectedType === 'initial'` → `setSubmitError(null)` and open the modal; otherwise `void submitBooking()`.
- State `const [intakeOpen, setIntakeOpen] = useState(false);`
- Render `<DiscoveryIntakeModal>` just before the tooltip portal (~693) with `dateLabel` = selected date as `Tue, Oct 6` style (`toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })`), `timeLabel` = `selectedTime`, `submitting`, `error={submitError}`, `onClose` closes it, `onSubmit` calls `submitBooking(intake)`.
- On the existing "submitted" screen (~319) render `<ConfettiBurst />` when `selectedType === 'initial'`.
- 60-min coaching bookings must still submit directly with no pop-up.

### D3. Show the answers to Mai (`src/pages/admin/AdminBookings.tsx`)
Keep the current card layout. Just above `{/* Notes if present */}` (~561), when the booking has any intake value, add one soft sage box (`border-sage/30 bg-sage/5`, same size/padding as the notes box) with: "Bringing them here:" + topic pills (titles from `discoveryTopics`) · "Wants:" need label · "Felt hard for:" duration label · "Suggested:" package title. Look up labels from `content.ts`; fall back to the raw id if unknown.

**Checks D:** typecheck method passes · on `/booking` pick Tuesday → Discovery Call → time → name/email → Confirm opens the pop-up · Continue disabled until a topic is picked · screen 2 needs both taps · screen 3 shows the matching package (e.g. Steady + A few months = Growth Package, 4 sessions, EGP 11,200) · booking saves, confetti shows, AdminBookings shows the box · approving it puts the answers in the Google event · a 60-min coaching booking submits without a pop-up · at 375 px wide nothing overflows.
**Commit:** `feat(booking): Discovery Call intake pop-up with package suggestion`

---

## Part E — Admin availability as a month calendar

File: `src/pages/admin/components/AdminAvailabilityModal.tsx` (+ one new component file `src/pages/admin/components/AvailabilityMonthCalendar.tsx`).

- Tabs become **Calendar** (default) and **Weekly hours**. The existing weekly editor stays exactly as it is under "Weekly hours". The "Date-Specific Overrides" tab (~366–371 and its body from ~531) and its form state/handler are removed; their job moves into the calendar.
- Calendar: month grid, Sunday first, prev/next month (prev disabled on the current month), past days disabled. Each day shows its **real** hours using the same rules as the server's `buildOpenIntervalsForCoachDate` (in `supabase/functions/_shared/booking-scheduling.ts`, a Deno file: **do not import it into React**; write a small `availabilityForDate(dateKey, rules)` function in the new component that returns the source and the matching rule rows, so each window keeps its session type). The rules: closed date wins → date-specific hours replace weekly hours → weekly hours → otherwise not open (closed by default). Cell content: day number; up to 3 window start times with a coloured dot per session type (use the existing `SESSION_TYPE_CONFIG` dot classes; pass it in as a prop, do not import it back from the modal to avoid a circular import); "Closed" in rose for closed dates; a small sparkle icon for dates with special hours. Legend underneath: Weekly hours / Special hours / Closed day / Not open.
- Clicking a date shows a panel: full date, where the hours come from ("From your weekly Monday hours" / "Special hours for this date only" / "Closed on this date" / "Not open. You have no weekly hours on Thursdays."), the windows with type badges, and actions:
  - **Close this day**: delete that date's `date_override` + `date_closed` rows, insert one `date_closed` row.
  - **Set special hours**: inline form (start, end, session type, optional label; start must be before end). Delete that date's `date_closed` row first, then insert a `date_override` row.
  - **Reset to weekly hours**: delete that date's `date_override` + `date_closed` rows. Only shown when such rows exist.
- After each action refresh the rules **without** showing the full loading spinner (so the selected month/date stay put), call `onUpdated`, show the existing success banner for 3 s, show errors in the existing error banner.
- Remove imports that become unused.

**Checks E:** typecheck method passes · open Manage Availability → calendar shows Mon/Wed coaching windows and Tue discovery windows with the right colours, Thu–Sun "Not open" · close a future Monday → it shows Closed and `/booking` has no times that day · reset it → hours return · set special hours on a Saturday → `/booking` shows those times that day.
**Commit:** `feat(admin): availability month calendar with real dates`

---

## Part F — Docs

Update `project-plan/booking/status.md` and `decisions.md` with what was actually done and verified in Parts A–E (not what was planned). Also:
- In `status.md`, correct the claim that `booking_blackouts` is "integrated": no Edge Function reads that table; the availability engine uses `coach_availability_rules` only, and `AdminBlackoutsModal.tsx` is not rendered anywhere.
- In `decisions.md`, record the offer decisions from `design/booking-plan.html` (three doors, Discovery Call EGP 500 separate fee required for new families, package prices and "use within" weeks, group rules 4–8 people / per person / 60 min / scheduled when filled, the 9 topics, the 5×5 suggestion matrix, PayTabs connected at launch).
- Tick the Stage 1 boxes in project-plan/offer-journey/next-steps.md and update the Stage Progress table in project-plan/offer-journey/status.md.

**Commit:** `docs(booking): Phase 1 status and offer decisions`

---

## 9. Final report (paste back to the user)

1. Commits created (hash + message).
2. For every part: each check, ✅ / ❌ / "not run" + reason.
3. `tsc-baseline` vs `tsc-after` error counts, and any new error lines (should be none).
4. Migration and deploy commands run and their output (success/fail).
5. Anything you found that did not match this prompt, and anything you would change but did not.
