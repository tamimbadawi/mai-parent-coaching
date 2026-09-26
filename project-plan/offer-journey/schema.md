# Offer & Booking Journey — Database Schema (Planned)

All changes go in timestamped migrations under `supabase/migrations/`. Every new table gets RLS enabled with admin-only policies using `public.is_admin()`, matching existing repository patterns.

Not applied yet except where marked. Column names may be adjusted during the stage that builds them; update this file when they are.

---

## Stage 1 — `bookings` intake columns

```sql
alter table public.bookings
  add column if not exists intake_topics text[],
  add column if not exists intake_need text,
  add column if not exists intake_duration text,
  add column if not exists intake_suggested_package text;
```

> [!NOTE]
> No RLS change is required: existing `bookings` policies cover all columns.

---

## Stage 3 — `client_packages` + link from bookings

```sql
create table if not exists public.client_packages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  package_id text not null check (package_id in ('single','starter','growth','deep-work','full')),
  sessions_total integer not null check (sessions_total > 0),
  price_egp integer not null check (price_egp >= 0),
  status text not null default 'pending_payment'
    check (status in ('pending_payment','active','expired','cancelled')),
  activated_at timestamptz,
  expires_at timestamptz,
  source text not null default 'admin' check (source in ('admin','paytabs')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bookings
  add column if not exists client_package_id uuid references public.client_packages(id) on delete set null;
```

### Business & Validation Rules
- Sessions used = count of bookings with this `client_package_id` and status in (`pending`,`confirmed`,`pending_calendar_sync`,`completed`). Sessions left = `sessions_total` − used. No stored counter.
- `expires_at` = `activated_at` + (2 weeks × sessions_total), set when the package becomes `active`.
- RLS: owner can `select` own rows; admin full CRUD; **no client insert/update** (rows are created by admin or, at Stage 5, by the payment Edge Function with the service role).
- `create-booking` must check server-side, for a package booking: logged-in owner, `status = 'active'`, not expired, sessions left > 0.

---

## Stage 4 — groups

```sql
create table if not exists public.coaching_groups (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('mai','private')),
  topic_id text not null,
  title text not null,
  description text,
  package_id text not null check (package_id in ('group-growth','group-deep-work','group-full')),
  sessions_total integer not null check (sessions_total > 0),
  price_egp_per_person integer not null check (price_egp_per_person >= 0),
  min_members integer not null default 4,
  max_members integer not null default 8,
  status text not null default 'forming'
    check (status in ('requested','forming','scheduled','completed','cancelled')),
  organizer_user_id uuid references auth.users(id) on delete set null,
  invite_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_members = 4 and max_members = 8)
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.coaching_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'reserved' check (status in ('reserved','active','cancelled')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

create table if not exists public.group_sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.coaching_groups(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  google_calendar_event_id text,
  google_meet_url text,
  created_at timestamptz not null default now()
);
```

### Business & Validation Rules
- Seat count = `group_members` rows with status in (`reserved`,`active`). Display state is derived, not stored: `< 4` "Filling (n more needed)", `4–7` "Confirmed, Mai sets dates", `8` "Full". Stored `status` only holds Mai-controlled states.
- Joining goes through one Postgres function `public.join_coaching_group(p_group_id uuid, p_invite_code text default null)` (`security definer`, `set search_path = public`): locks the group row (`select … for update`), rejects if status not `forming`/`scheduled`, rejects private groups without the matching `invite_code`, rejects when seats = `max_members`, inserts the member. This is the only way to join (no direct insert policy).
- Private group: organiser creates it with `kind = 'private'`, `status = 'requested'`; Mai approves → `forming`; organiser shares the `invite_code`.
- Public read: a view exposing only group fields + seat count (never member names/emails).
- RLS: members `select` their own `group_members` rows; admin full CRUD on all three tables.
- Group calendar events: one event per session on Mai's calendar, members as attendees with `guestsCanSeeOtherGuests: false`.

---

## Stage 5 — payments (outline only; final design follows `project-plan/payments/`)

- `orders` table (item_type `discovery_call` | `package` | `group_place`, item id, amount EGP, PayTabs refs, status).
- If Discovery bookings wait for payment, a new booking status (e.g. `pending_payment`) must be added to:
  1. The `bookings.status` check constraint
  2. The overlap exclusion constraint predicate in `20260915120000_harden_booking_reservations.sql`
  3. `get-availability`'s blocking-status list
  4. `create-booking`'s conflict query
  5. `customer_journey_state` view
