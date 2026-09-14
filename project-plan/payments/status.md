# Payments — Status

## Current Status: Planned

> [!CAUTION]
> Payments carry a higher risk than most features (real money, merchant liabilities, and security vulnerabilities). Do **NOT** rush once started, and do **NOT** begin building before booking persistence (Steps 1–3 of booking) is complete and verified.

---

## What's Built

- **Frontend Artifacts**: Stripe frontend packages and partial code currently exist in the codebase.
  - *Decision*: These are no longer part of the plan and must be removed rather than built upon.
- **Admin UI**: `AdminOrders` is currently a placeholder screen.
- **Shop Catalog**: Digital products and shop items are currently static.

---

## What's NOT Built

- **PayTabs Integration**: No PayTabs integration currently exists. This is a **clean build**, not a migration from working Stripe code.
- **Payment Session Edge Function**: No server-side function to create secure PayTabs Hosted Payment Page sessions.
- **Webhook / IPN Handler**: No endpoint to receive, signature-verify, and process PayTabs Instant Payment Notifications.
- **Orders Persistence**: No `orders` table or real persistent database tracking.
- **Fulfillment & Access Grants**: Nothing currently grants course enrollments or digital product downloads based on confirmed server-side payment.
