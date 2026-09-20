# WhatsApp Automation — Status

## Current Status: Paired and sending; website release remains in progress

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
| **Stage 1** | **Oracle VM Setup & Hardening** | ✅ Complete | New Ubuntu 24.04 Ampere A1 VM at `144.24.209.195`; SSH, Docker, loopback API, and HTTPS firewall verified. |
| **Stage 2** | **Microservice Build** | ✅ Complete | Service in `services/whatsapp-bot/`; 59 tests pass; live `/health`, authenticated `/status`, and QR retrieval verified. |
| **Stage 3** | **Deploy, Pair & Reboot Test** | ✅ Complete | The linked account reached READY and remained paired after container restarts. The persistent session volume and live reset path were verified. |
| **Stage 4** | **Real Test Message** | ✅ Complete | A real message sent through `/send-message` to the requested number was confirmed received by the user. The service now returns `202 submitted` when WhatsApp Web omits a message ID, avoiding a false `502` while explicitly marking delivery unconfirmed. |
| **Stage 5** | **Website & Booking Integration** | 🟡 Partial | Admin connect/disconnect UI is on the `feature/whatsapp-service` Vercel preview. The protected Supabase proxy is deployed with server-side secrets. Booking messages and production website release remain. |

## Live deployment notes

- WhatsApp service: Oracle VM `whatsapp-bot-vm-new`, HTTPS endpoint `https://144.24.209.195`, with only `/status`, `/qr`, and `/reset-session` proxied. Port 3001 remains bound to localhost.
- TLS: Let's Encrypt IP certificate with automatic Certbot renewal and Nginx reload; renewal dry run passed on 2026-09-20.
- Supabase project: `qqnthevakllugdlioalm`, function `admin-whatsapp-manager`. `WHATSAPP_SERVICE_URL` and `WHATSAPP_API_SECRET_KEY` are stored as Edge Function secrets.
- Preview: `https://mai-parent-coaching-git-feature-whatsapp-service-asacontracting.vercel.app/admin/whatsapp`. Admin login is required.
- The original Oracle VM remains intact until paired operation is verified on the replacement.
- The user confirmed receipt of the requested test message on 2026-09-20. A subsequent live API test returned `submitted` and `deliveryConfirmed: false` because WhatsApp Web did not expose a message ID. Consumers must not automatically retry this response.
