# WhatsApp Automation — Next Steps & Staged Execution

Follow these implementation stages in exact sequential order.

> [!IMPORTANT]
> - Do **NOT** mark any stage as completed without running it and verifying real output.
> - Stop for user confirmation after each stage before advancing.
> - Do **NOT** wire into `BookingPage.tsx` or `AdminBookings.tsx` until Stages 1–4 are fully confirmed.

---

## Staged Implementation Plan

### STAGE 1 — Oracle Always Free VM Setup & Hardening *(Active)*
1. [ ] Generate local SSH key (`oracle_whatsapp_key`).
2. [ ] Provision Oracle Cloud Always Free Ampere A1 VM (Ubuntu 22.04/24.04, 2 OCPU / 12 GB RAM).
3. [ ] Configure Cloud Security List (allow port 22 and port 3001).
4. [ ] SSH into the VM, update OS, configure `ufw` firewall, and install Docker.
5. [ ] **Verification Gate**: Live SSH login verified and Docker command output confirmed.

---

### STAGE 2 — Microservice Build (Isolated in `services/whatsapp-bot/`)
1. [ ] Create and checkout git branch `feature/whatsapp-service`.
2. [ ] Initialize `services/whatsapp-bot/package.json` with dependencies (`whatsapp-web.js`, `express`, `cors`, `dotenv`, `qrcode`).
3. [ ] Create `Dockerfile` with ARM64/AMD64 Chromium compatibility.
4. [ ] Implement `src/index.js` with:
   - Express server on port 3001.
   - `whatsapp-web.js` client with `LocalAuth` session persistence.
   - `GET /health` (uptime check).
   - `GET /qr` (interactive QR pairing web interface).
   - `GET /status` (live connection state).
   - `POST /send-message` (protected by `API_SECRET_KEY` with queue & rate limiter).
   - `POST /reset-session` (protected by `API_SECRET_KEY` + `{"confirm": "yes"}` payload safeguard to disconnect and regenerate QR).
5. [ ] Create `src/templates.js` for welcome, booking confirmation, reminder, and follow-up copy.
6. [ ] Create comprehensive `README.md` documenting endpoints, number swapping flow, and configuration.
7. [ ] **Verification Gate**: Local testing and verification of endpoints.

---

### STAGE 3 — Deploy, Pair & Reboot Test (Persistence Verification)
1. [ ] Deploy the microservice to the Oracle VM via Docker.
2. [ ] Open `/qr` in browser and scan pairing code using personal test WhatsApp account.
3. [ ] Query `GET /status` and verify live `"ready"` status output.
4. [ ] Deliberately restart the VM / Docker container (`sudo reboot` or `docker restart`).
5. [ ] Query `GET /status` again without rescanning to prove session persistence survived the reboot.
6. [ ] **Verification Gate**: Real `"ready"` response verified immediately after reboot.

---

### STAGE 4 — Real Test Message Dispatch
1. [ ] Call `POST /send-message` with `API_SECRET_KEY` targeting personal phone number.
2. [ ] Verify real HTTP 200 response with message ID.
3. [ ] Confirm message was physically received on the WhatsApp device.
4. [ ] **Verification Gate**: Physical message receipt confirmed.

---

### STAGE 5 — Website & Booking Flow Integration *(Future / After Stages 1–4)*
1. [ ] Create Supabase Edge Function / webhook dispatcher to forward confirmed booking events to `POST /send-message`.
2. [ ] Trigger welcome messages on user approval.
3. [ ] Configure scheduled reminders (24h/1h) and post-session follow-ups via database cron.
