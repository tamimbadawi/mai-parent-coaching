# WhatsApp Automation — Architectural Decisions

> [!NOTE]
> All decisions recorded in this file are **settled**. Do not modify or swap these architectural choices unless explicitly instructed.

---

## 1. Core Technology & Library: `whatsapp-web.js`

- **Selected**: `whatsapp-web.js` running headless Chromium with `LocalAuth` session persistence.
- **Why**: Allows direct automated messaging for client care, reminders, and engagement without third-party per-conversation message fees.
- **Session Strategy**: `LocalAuth` persists authenticated session tokens directly to the VM filesystem, surviving process restarts.

---

## 2. Infrastructure & Hosting: Oracle Cloud Always Free VM

- **Selected**: Dedicated Ampere A1 Compute Instance (Ubuntu Linux, up to 4 OCPUs / 24 GB RAM Always Free).
- **Why NOT Render / Vercel / Serverless Containers?**
  - Vercel and Render free tiers use ephemeral filesystems and put containers to sleep after periods of inactivity.
  - Sleeping containers terminate the persistent WebSocket connection required by WhatsApp Web and wipe `LocalAuth` session cache, forcing constant QR code rescanning.
  - Oracle Cloud provides a true, 24/7 persistent virtual machine with persistent disk storage.

---

## 3. Microservice Architecture & Isolation

- **Location**: Standalone directory `services/whatsapp-bot/` with its own `package.json`, `Dockerfile`, and dependency tree.
- **Git Branch**: `feature/whatsapp-service`.
- **Strict Decoupling**: The microservice is completely isolated from the main website codebase until Stages 1–4 are fully verified.
- **API Endpoints**:
  - `GET /health`: Health and uptime verification (returns `200 OK`).
  - `GET /status`: Returns JSON connection state (`ready`, `qr_pending`, `disconnected`, phone number info).
  - `GET /qr`: Visual web page rendering dynamic pairing QR code.
  - `POST /send-message`: Authenticated endpoint to deliver formatted messages.
  - `POST /reset-session`: Protected session reset endpoint to cleanly disconnect and pair a new number.

---

## 4. Dynamic Number Pairing & Session Reset (`/reset-session`)

- **Requirement**: Allow switching WhatsApp numbers at any time without SSH access or manual file deletion.
- **Safety Safeguard**:
  - Protected by `API_SECRET_KEY` header.
  - Requires explicit confirmation in request body: `{"confirm": "yes"}`.
  - Rejects bare or accidental POST requests.
- **Reset Behavior**:
  - Properly calls `client.logout()` and `client.destroy()`.
  - Clears stored `LocalAuth` data directory.
  - Re-initializes client back into `qr_pending` state so visiting `/qr` immediately provides a new QR code.
  - Preserves templates, environment variables, and server configuration.

---

## 5. Security & Rate Limiting

- **API Secret Key**: All mutative endpoints (`/send-message`, `/reset-session`) require `Authorization: Bearer <API_SECRET_KEY>` matching the server's environment variable.
- **Network Hardening**: VM ingress restricted strictly to port `22` (SSH via Ed25519 key only) and service port `3001`.
- **Anti-Ban Mitigation & Rate Limiting**:
  - Queue-based message dispatcher with randomized human-like delay between messages (e.g. 3–8 seconds).
  - *Honest Risk Assessment*: Rate limiting prevents flooding and automated burst detection by WhatsApp servers. It does **not** protect against WhatsApp bans if recipients manually report or block messages as unsolicited spam. Messages must only be sent to parents with active, opt-in relationships.

---

## 6. Message Templates Separation

- All message copy (welcome greetings, booking confirmations, 24h/1h reminders, post-session follow-ups) is maintained in `services/whatsapp-bot/src/templates.js`, separate from the server routing logic.
