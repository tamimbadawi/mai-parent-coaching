# CRM & Client Engagement — Status

## Current Status: Planned (Architecture & Staged Plan Documented)

> [!IMPORTANT]
> - This feature is executed in **strict, sequential stages**.
> - Each stage must be confirmed and verified before starting the next.
> - **Do not batch multiple stages into one pass.**
> - Stage 1 build has **not** started yet — this document and its companion files record the approved blueprint.

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
| **Stage 1** | **Data Model (`customer_journey_state`)** | 📋 Planned | Computed view/table accurately derives track, lifecycle stage, and recency from real booking/message data without manual intervention. |
| **Stage 2** | **Content Library & Admin CRUD UI** | 📋 Planned | Admin can create, edit, categorize, preview, and archive content items; verified with test content. |
| **Stage 3** | **Rotation, Dispatch & Inbound Opt-Out** | 📋 Planned | `whatsapp-scheduler`/`dispatcher` selects unseen library pieces and enforces frequency caps; microservice inbound listener processes opt-out keywords ("STOP") via Supabase webhook. |
| **Stage 4** | **Per-Client Admin CRM View** | 📋 Planned | Single-screen view displaying client track, stage, next touchpoint, and unified chronological interaction history. |
| **Stage 5** | **Real Loop Verification & Cleanup** | 📋 Planned | Live message delivery to test number, duplicate prevention verification, state transition test, and clean test artifact disposal. |

---

## Technical Dependencies & Readiness

- **WhatsApp Microservice**: Live and verified on Oracle Always Free VM (`https://144.24.209.195`).
- **Edge Functions**: `whatsapp-scheduler` and `whatsapp-dispatcher` deployed with RLS and admin authentication.
- **Booking Database**: `bookings` table holds session types, statuses (`pending`, `confirmed`, `completed`, `cancelled`), dates, and phone numbers.
- **Git Discipline**: Current git branch is `main`. A dedicated branch (e.g. `feature/crm-engagement-system`) will be confirmed with the user prior to code execution in Stage 1.
