# CRM & Client Engagement — Status

## Current Status: In Progress (Stages 1, 2, and 3 Complete — Ready for Stage 4)

> [!IMPORTANT]
> - This feature is executed in **strict, sequential stages**.
> - Each stage must be confirmed and verified before starting the next.
> - **Do not batch multiple stages into one pass.**
> - Stages 1, 2, and 3 have been fully built, deployed, and verified with live database and Edge Function tests.

---

## Overview & Purpose

Build an automated, respectful, and relationship-centric CRM engagement engine on top of Supabase and the self-hosted WhatsApp automation infrastructure.

### Core Objectives
1. **Two-Track Nurture**: Differentiate between pre-client taste content (Track A) and post-paid session relationship continuity (Track B).
2. **Automated Derivation**: Compute client stage, track, and engagement recency directly from database records (`bookings`, `profiles`, `whatsapp_messages`) without manual upkeep for Mai.
3. **Admin Content Studio**: Empower Mai to curate a dynamic, non-repeating library of 15–20+ prompts, worksheets, and micro-tips.
4. **Intelligent Rotation**: Seamlessly deliver unseen content on a calm cadence (every 10–14 days) with zero repeats.
5. **Unified Admin CRM**: Consolidate booking history, WhatsApp transcripts, and client lifecycle state into a single view.

---

## Stage Progress Tracker

| Stage | Focus | Status | Verification Gate |
| :--- | :--- | :--- | :--- |
| **Stage 1** | **Data Model (`customer_journey_state`)** | ✅ Complete | Computed view `public.customer_journey_state` deployed. Verified: 0-paid -> Track A, free consultation -> Track A, upcoming paid -> Track A (stage: `track_a_booked`), completed paid -> Track B promotion, and opt-out propagation. |
| **Stage 2** | **Content Library & Admin CRUD UI** | ✅ Complete | Table `crm_content_library` with RLS deployed and 5 starter pieces seeded. `ContentLibraryStudio` UI built and integrated into `/admin/whatsapp` under "Nurture Library (CRM)". Verified full CRUD (insert, update, toggle archive, delete) and clean build. |
| **Stage 3** | **Rotation, Dispatch & Inbound Opt-Out** | ✅ Complete | Table `crm_deliveries` deployed with partial unique index. `whatsapp-dispatcher` and `whatsapp-scheduler` extended for `'crm_nurture'` and 7-day frequency caps. Microservice inbound listener and `whatsapp-inbound-handler` deployed for STOP/START keyword opt-outs. Verified 100% via `scripts/verify-stage-3-crm.js`. |
| **Stage 4** | **Per-Client Admin CRM View** | 📋 Next | Single-screen dossier displaying client track, stage, next touchpoint, and unified chronological interaction history. |
| **Stage 5** | **Real Loop Verification & Cleanup** | 📋 Planned | Live message delivery to test number, duplicate prevention verification, state transition test, and clean test artifact disposal. |

---

## Technical Dependencies & Readiness

- **WhatsApp Microservice**: Live and verified on Oracle Always Free VM (`https://144.24.209.195`).
- **Edge Functions**: `whatsapp-scheduler` and `whatsapp-dispatcher` deployed with RLS and admin authentication.
- **Booking Database**: `bookings` table holds session types, statuses (`pending`, `confirmed`, `completed`, `cancelled`), dates, and phone numbers.
- **Git Discipline**: Current git branch is `feature/crm-engagement-system`. Stage 2 is verified; Stage 3 will proceed upon explicit user instruction.
