# Payments — Architectural Decisions

> [!NOTE]
> All decisions in this file are **settled**. Do not revisit or swap these architectural choices unless explicitly instructed.

---

## 1. Gateway Choice: PayTabs

- **Selected**: **PayTabs** (Hosted Payment Page + IPN webhook verification).
- **Why NOT Stripe?** Stripe does not support direct merchant payouts to Egyptian bank accounts.
- **Why NOT Paymob?** While Paymob is a strong local Egyptian gateway, it settles strictly in local currencies (EGP/AED/SAR/PKR/OMR). An international client charging a USD card gets forced into an EGP conversion at fluctuating rates with no currency choice, exposing the merchant to severe EGP foreign exchange volatility.
- **Why PayTabs?** PayTabs was selected specifically because the business serves both Egyptian and international clientele. It supports **true multi-currency settlement** while simultaneously supporting key local Egyptian payment methods (Meeza, Fawry/Masary aggregators, valU/Souhoola BNPL).

---

## 2. Secondary Local Gateways (Open for Future Evaluation)

- A secondary local-only gateway (such as Paymob) may be introduced in a future phase specifically for local Egyptian transactions if real-world card conversion data warrants it.
- **Current Directive**: Do not build a multi-gateway system now; a single PayTabs integration is sufficient until production transaction volume justifies expansion.

---

## 3. Architecture & Security Standards

- **Server-Side Exclusivity**: The frontend client never interacts with PayTabs API credentials directly.
- **Validation**: A Supabase Edge Function validates product IDs, course IDs, and pricing against database records server-side before initiating any payment session.
- **Hosted Payment Page**: The Edge Function requests a secure PayTabs Hosted Payment Page session and returns the checkout URL to the user.
- **IPN Webhook Verification**:
  - PayTabs sends an Instant Payment Notification (IPN) callback to a Supabase Edge Function.
  - The Edge Function verifies the cryptographic signature on the payload.
  - **Orders and course enrollments are created/granted strictly upon verified webhook receipt**, never based on frontend client redirects or `return_url` params alone.

---

## 4. Implementation Guidelines

- Exact API field names, payload keys, endpoint URLs, and HMAC/signature algorithms must be validated against official PayTabs documentation during implementation.
- This document establishes the mandatory security architecture, trust boundaries, and workflow.
