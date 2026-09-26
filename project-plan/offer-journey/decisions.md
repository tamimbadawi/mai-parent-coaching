# Offer & Booking Journey — Decisions

Reviewed and agreed on 2026-09-26 (Claude Code review + user decisions). This file records what is settled. Treat these as decisions unless the user explicitly revisits them.

---

## 1. Three doors on `/booking`

The left column of `/booking` stops listing session lengths (Initial / 60 / 90 / Family / Follow-up) and becomes three doors, same card style:
1. **Discovery Call** ("New here"): 30 min, EGP 500. Tuesday slots 11:00, 11:45, 12:30 (Africa/Cairo).
2. **1:1 Coaching** ("Ready to work with Mai"): packages; each 60-min session booked on Monday or Wednesday (12:00 or 13:30).
3. **Group Coaching** ("Learn with other parents"): join one of Mai's topic groups or start your own.

---

## 2. Discovery Call

- Appointment type id stays `initial` (never renamed). Title "Discovery Call". 30 min + 15 min buffer. Price **EGP 500**.
- The fee is **separate**: it is **not** deducted from any package.
- **Required for new families** before they can buy a package. Returning clients buy directly.
- "New family" = no booking with status `completed` (any type) and no `client_packages` row (Stage 3). Admin can always override (manual bookings, admin-assigned packages).

---

## 3. 1:1 packages (EGP)

| id | Package | Sessions | Total | Per session | Saves | Use within |
| :--- | :--- | ---: | ---: | ---: | ---: | :--- |
| `single` | Single Session | 1 | 3,500 | 3,500 | — | 2 weeks |
| `starter` | Starter Package | 2 | 6,650 | 3,325 | 5% | 4 weeks |
| `growth` | Growth Package | 4 | 11,200 | 2,800 | 20% | 8 weeks |
| `deep-work` | Deep Work Package | 8 | 21,000 | 2,625 | 25% | 16 weeks |
| `full` | Full Transformation | 12 | 29,400 | 2,450 | 30% | 24 weeks |

Rule: validity ≈ 2 weeks per session, counted from the day the package becomes active.

---

## 4. Group coaching

| id | Package | Sessions | Price per person | Per session |
| :--- | :--- | ---: | ---: | ---: |
| `group-growth` | Group Growth | 4 | 7,200 | 1,800 |
| `group-deep-work` | Group Deep Work | 8 | 12,960 | 1,620 |
| `group-full` | Group Full Transformation | 12 | 17,496 | 1,458 |

- Prices are **per person**. Sessions are **60 min**.
- A group needs **4 people to start** and **closes at 8**.
- Groups have **no fixed weekday**: Mai sets the day and dates for each group once it reaches 4.
- Two ways in: (a) join one of Mai's groups (Mai picks the topic); (b) start your own group: an organiser brings 4–8 people and picks the focus **from Mai's topic list**; Mai approves it.
- Group members must not see each other's email addresses (calendar invites use `guestsCanSeeOtherGuests: false`).

---

## 5. Topics (9, all confirmed by Mai)

Used by the Discovery intake **and** as the group topic list:

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

---

## 6. "Help me choose"

- Two single-choice questions, 5 answers each, shown as chips. No free-text fields.
- Q1 "What would help most right now?":
  - `one-thing`: A second opinion on one thing
  - `quick-tools`: Quick tools for one problem
  - `steady`: Steady support while we change things
  - `several`: Help with several things at once
  - `reset`: A real reset for our family
- Q2 "How long has it felt hard?":
  - `just-started`: It just started
  - `weeks`: A few weeks
  - `months`: A few months
  - `year`: About a year
  - `over-year`: Longer than a year
- 5×5 matrix (rows Q1, columns Q2):
```
one-thing:   single,  single,    single,    starter,   starter
quick-tools: single,  starter,   starter,   growth,    growth
steady:      starter, growth,    growth,    growth,    deep-work
several:     growth,  growth,    deep-work, deep-work, full
reset:       growth,  deep-work, deep-work, full,      full
```
- It only **suggests**. Wording always includes "Mai will confirm the right fit on your call."
- The server computes the suggestion; the browser never sends it.

---

## 7. Discovery intake pop-up

- Opens when a parent confirms a Discovery Call booking; coaching bookings never show it.
- 3 screens: topics → two quick taps → review with suggested package. Replaces the older 4-step draft (children's ages and "three months from now" text were dropped).
- Answers stored on the booking (`intake_*` columns), shown to Mai in AdminBookings and in the Google Calendar event description.

---

## 8. Google Calendar events

- Colours: Discovery Call `colorId 5` (Banana), 60-min coaching `colorId 2` (Sage), others default.
- One shared title/description builder for approve, reschedule and sync. Title `<type> — <parent name>`.
- **No internal ids (Booking ID) in the description**: the client is an attendee and can read it.
- Before launch, set `GOOGLE_CALENDAR_OWNER_EMAIL` to Mai's Gmail and reconnect signed in as Mai.

---

## 9. Payments timing

- PayTabs is connected **at launch** (Stage 5), not before. The site is still being built.
- Until then every flow is built and tested without real money; admin can activate packages / group places manually for testing.
- **No fake payment screens** and no "payment successful" messages before Stage 5.
- Stage 5 follows `project-plan/payments/decisions.md` exactly (Hosted Payment Page, IPN signature verification, never trust `return_url`).

---

## 10. Build on what exists

| Existing piece | Location | How this plan uses it |
|---|---|---|
| Availability rules (closed by default) | `coach_availability_rules`, `_shared/booking-scheduling.ts` | Weekly hours + date overrides; admin month calendar in Stage 1 |
| Booking overlap protection | exclusion constraint in `20260915120000_harden_booking_reservations.sql` (statuses pending/confirmed/pending_calendar_sync) | Must be extended in Stage 5 if a new status is added |
| Customer journey view | `public.customer_journey_state` (`20260923130000_...`) | Source for "new vs returning" counts in admin views |
| Calendar helper | `_shared/google-calendar.ts` | Colours, group events |
| Payments architecture | `project-plan/payments/decisions.md` | Stage 5 |
