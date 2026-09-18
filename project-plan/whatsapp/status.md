# WhatsApp Automation — Status

## Current Status: In Progress (Stage 1: Oracle VM Setup)

> [!IMPORTANT]
> This service is developed in explicit, sequentially verified stages. No stage is marked complete without real command outputs and live execution evidence.

---

## Overview & Objective

Build a self-hosted WhatsApp automation companion microservice using **`whatsapp-web.js`** deployed on an **Oracle Cloud Always Free Ampere A1 VM**.

### Key Use Cases
1. **Welcome Messages**: Automated greeting to new registered/approved clients.
2. **Booking Confirmations**: Session details, date/time in client's timezone, and video meeting link.
3. **Session Reminders**: Automated 24-hour and 1-hour pre-session reminders.
4. **Post-Session Follow-Ups**: Check-ins 24–48 hours post-appointment with feedback links and notes.
5. **Dynamic Number Pairing**: Seamlessly switch WhatsApp accounts via `/reset-session` and `/qr` without SSH or file deletion.

---

## Stage Progress Tracker

| Stage | Focus | Status | Verification Gate |
| :--- | :--- | :--- | :--- |
| **Stage 1** | **Oracle VM Setup & Hardening** | 🟡 **In Progress** | Live SSH connection to running Ampere A1 instance + Docker installed. |
| **Stage 2** | **Microservice Build** | ⚪ Pending | Isolated build in `services/whatsapp-bot/` on `feature/whatsapp-service` branch. |
| **Stage 3** | **Deploy, Pair & Reboot Test** | ⚪ Pending | Pair via `/qr`, verify `/status`, reboot VM/process, verify persistent `/status` without rescanning. |
| **Stage 4** | **Real Test Message** | ⚪ Pending | Send live test message to personal number via `/send-message` with API key. |
| **Stage 5** | **Website & Booking Integration** | ⚪ Future / Post-Verification | Wire to `create-booking`, Supabase triggers, and admin dashboard. |
