# CRM & Client Engagement — Architectural Decisions

> [!NOTE]
> All decisions recorded in this file are **settled**. They define the engagement architecture, lifecycle tracks, content model, and safety guardrails for the Mai Website CRM. Do not alter these principles without explicit instruction.

---

## 1. Two-Track Engagement Architecture

To serve parents at their exact stage of readiness without creating pressure or transactional friction, the CRM operates on a **Two-Track Engagement Model**:

```
[ New Client / Contact / Free Initial Session ]
                     │
                     ▼
           ┌───────────────────┐
           │      TRACK A      │ ◄── Lighter cadence (10–14 days)
           │ Nurture & "Taste" │     Generic worksheets, tips, reflective prompts
           └─────────┬─────────┘
                     │
         First Paid Session Marked
               'completed'
                     │
                     ▼
           ┌───────────────────┐
           │      TRACK B      │ ◄── Tied to session rhythm
           │   Continuity &    │     Takeaways, integration exercises,
           │   Relationship    │     session-specific context
           └───────────────────┘
```

### Track A: Nurture & "Taste"
- **Target Audience**: 
  - Newly registered users who have not yet had a paid session.
  - Parents who submitted a contact inquiry.
  - Parents who booked or completed only a free **Initial Consultation** (`appointment_type_id: 'initial'`).
  - Parents with a paid session booked in the future who have not yet completed it.
- **Cadence**: Lighter rhythm — default **every 10–14 days** (configurable; hard minimum interval: 7 days).
- **Content Style**: Generic "taste" content that showcases Mai’s evidence-based philosophy:
  - Reflective parenting prompts ("One small moment to pause today...").
  - Printable/downloadable micro-worksheets (e.g. emotion regulation thermometers).
  - Quick, actionable nervous system regulation tips.
- **Goal**: Establish psychological safety, build warm familiarity, and demonstrate practical value without sales pressure.

### Track B: Relationship Continuity & Post-Care
- **Target Audience**: Parents who have completed at least one **paid** coaching session.
- **Cadence**: Tied directly to clinical / coaching cadence:
  - **Immediate Follow-up (24–48h)**: Post-session reflection, encouragement, and resource links.
  - **Integration Check-in (7–14 days post-session)**: Checking on implementation of discussed strategies.
  - **Rhythm Cadence (21–30 days post-session)**: Follow-up check-in if no subsequent session has been scheduled.
- **Content Style**: Deep continuity care:
  - Reflection on ongoing family dynamics and coaching takeaways.
  - Advanced integration exercises.
  - Thoughtful check-ins acknowledging their ongoing courage and commitment.
- **Goal**: Long-term family support, sustained behavioral transformation, and effortless relationship continuity.

---

## 2. Transition Trigger: Track A → Track B

- **Strict Promotion Rule**: A client transitions from Track A to Track B **only when their first paid session is marked as actually `completed`** in the `bookings` table.
- **Eligibility Filter**:
  ```sql
  status = 'completed' AND appointment_type_id != 'initial'
  ```
- **Booked-But-Not-Attended Rule**:
  - Booking or confirming a paid session **does NOT** trigger Track B.
  - A client with an upcoming paid session remains in Track A until the session actually concludes and is marked `completed` by the admin/coach.
  - Pre-session touchpoints (24-hour reminder, 1-hour reminder, booking confirmation) are handled automatically by the existing appointment event engine regardless of lifecycle track.
  - If a paid session is cancelled or marked no-show, the client remains firmly in Track A.

---

## 3. Content is Data, Not Hardcoded

- **Database-Driven Content Library**: Content pieces are stored as database rows in a dedicated table (`crm_content_library`), not hardcoded in server files or templates.
- **Admin-Editable Studio**:
  - Mai must be able to view, create, edit, categorize, and archive content pieces directly from the Admin Panel.
  - Editable fields: `title`, `body_template`, `type` (`prompt`, `tip`, `worksheet`, `check_in`), `track` (`track_a`, `track_b`, `all`), `tags` (e.g. `burnout`, `tantrums`, `sleep`, `nervous-system`), and `is_active`.
- **Target Library Scale & Runway**:
  - Launch target: **15–20+ pieces** for Track A.
  - Mathematical Runway: At a 10–14 day delivery cadence, a 20-piece library delivers **6 to 9+ months of completely fresh, non-repeating nurture** for any given parent before reaching the end of the rotation.
- **Anti-Repeat Guarantee**: The dispatch system maintains a persistent log of sent content per client (`crm_message_delivery_log` or enriched `whatsapp_messages`), ensuring no client receives the same content twice until the entire active library has been exhausted.

---

## 4. Explicit "Gone Quiet" Thresholds & Re-Engagement

To prevent indefinite messaging to inactive recipients, the system applies mathematically precise, adjustable "gone quiet" thresholds:

| Lifecycle Track | Trigger Condition | State Transition | Automated Behavior |
| :--- | :--- | :--- | :--- |
| **Track A** | **60 days** without any booking, inquiry, or client message | `gone_quiet_taper` | Cadence automatically tapers (slows to 30 days). Halts completely at 90 days of inactivity to prevent fatigue. |
| **Track B** | **45 days** after typical session gap (no future booking scheduled) | `gone_quiet_reengagement` | Delivers a single, gentle, open-ended check-in: *"Thinking of you and your family. How have things been settling since our last session?"* |

> [!IMPORTANT]
> **Adjustable Defaults**: The 60-day and 45-day thresholds must be stored in database configuration (`crm_settings` or `whatsapp_automation_rules`), never hardcoded in SQL or TypeScript. Mai can adjust the day thresholds at any time through the Admin UI.

---

## 5. Hard Constraint: Zero-Pressure & Anti-Spam Safeguards

Mai’s practice is built on emotional safety, nervous system healing, and deep trust. Marketing pressure or high-urgency tactics directly destroy this brand promise.

1. **Global Frequency Cap**:
   - Hard upper limit: **No automated CRM message may be dispatched to a client if any outbound message was sent to them in the preceding 7 days** (reminders for upcoming scheduled sessions bypass this cap, but general CRM nurture respects it unconditionally).
2. **Per-Client Opt-Down & Opt-Out**:
   - Clients can reply with standard keywords (e.g. "STOP", "PAUSE", "UNSUBSCRIBE") on WhatsApp to instantly disable automated CRM sequences.
   - Admins can toggle `engagement_status: 'active' | 'paused' | 'opted_out'` per client with a single click.
3. **Copy Tone Standards — Offer, Never Push**:
   - Every piece must provide standalone, complete value (a question to ponder, an emotion-regulation tool, or grounding words).
   - Never use false urgency ("Only 2 slots left this week!"), scarcity, guilt, or fear-based hooks.
   - Any booking links are offered gently as an open invitation ("Whenever you feel ready to reconnect, my door is open here...").
