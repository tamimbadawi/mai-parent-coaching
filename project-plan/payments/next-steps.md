# Payments — Next Steps

Follow these implementation steps in exact sequential order:

> [!IMPORTANT]
> Do **NOT** start payments implementation until Booking Steps 1–3 (table migration, form persistence, AdminBookings fix) are fully completed.

---

## Ordered Implementation Plan

1. **Prerequisite Check**: Confirm Booking Steps 1–3 are complete and verified in production/staging.
2. **Remove Leftover Stripe Artifacts**: Clean out unused Stripe frontend dependencies and dead code.
3. **Configure PayTabs Merchant Credentials**:
   - Store PayTabs Profile ID, Server Key, and Client Key in Supabase secrets/environment variables.
   - Keep all credentials strictly server-side.
4. **Build Payment Session Edge Function**:
   - Validate course/product price server-side.
   - Initiate Hosted Payment Page request to PayTabs and return session URL.
5. **Build PayTabs IPN Webhook Edge Function**:
   - Receive server-to-server callback from PayTabs.
   - Verify cryptographic signature and transaction status.
6. **Create Orders Table Migration + RLS**:
   - Create `orders` table to log transactions (`id`, `user_id`, `amount`, `currency`, `status`, `payment_ref`, `product_type`, `product_id`, timestamps).
   - Configure strict RLS policies (admin-read, user-read-own, no public read).
7. **Wire Fulfillment Logic**:
   - Trigger `course_enrollments` insertion or digital product access automatically inside the verified IPN webhook handler.
8. **Replace AdminOrders Placeholder**:
   - Connect the `AdminOrders` screen to query real records from the `orders` table with status badges and filters.
9. **Sandbox Testing**:
   - Execute test transactions in PayTabs Sandbox mode across currencies and test card scenarios before enabling live transactions.
