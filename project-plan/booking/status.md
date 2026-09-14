# Booking System — Status

## Current Status: In Progress (#1 Priority)

> [!WARNING]
> This is the **#1 priority** for the project. An unwired booking flow is a **silently lost lead**, not a soft failure.

---

## What's Built

- **Frontend `/booking` Route & Flow**:
  - Distraction-free dedicated booking layout (Navbar & Footer intentionally hidden).
  - Session type selection with dynamic pricing, durations, and details.
  - Interactive date picker and time slot selection.
  - Client details form (parent name, email, phone, country, child name, child age, notes).
  - Live booking summary sidebar.
  - Form validation: the confirmation button only enables once all required fields are properly filled.

---

## What's NOT Built

- **Real Database Persistence**: Submitting the booking confirmation form does not insert a real record into Supabase (currently simulates/fakes confirmation in client state).
- **Real Availability Checking**: No integration with coach schedule; every calendar day looks equally selectable.
- **Timezone Handling**: Missing explicit timezone selection and conversion for international clients.
- **Admin Bookings Screen Mismatch**: `AdminBookings` currently displays sample/enrollment data rather than reading from a real persistent `bookings` table.
- **Google Calendar Integration**: No automatic event creation, calendar invite dispatch, or freebusy conflict checking.
