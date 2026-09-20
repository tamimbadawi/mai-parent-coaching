# Mai WhatsApp Automation Microservice

Standalone companion microservice providing reliable, self-hosted WhatsApp automation for Mai Parent Coaching using [`whatsapp-web.js`](https://wwebjs.dev/) and `LocalAuth` session persistence.

---

## 1. Architectural Principles & Security Isolation

- **Complete Isolation**: Lives exclusively under `services/whatsapp-bot/` with its own dependency tree, configuration, and Docker container.
- **LocalAuth Persistence**: Stores authenticated session state on disk (`SESSION_DATA_PATH`), surviving process restarts and VM reboots without requiring rescanning.
- **Fail-Closed Session Reset**: `/reset-session` validates target directory safety before deletion, purges session files, detaches message queue, advances generation counters, and rejects subsequent operations if filesystem or client cleanup fails.
- **Generation & Cancellation Control**: Queue operations and client event listeners are bound to explicit generation IDs. Old worker loops and stale Puppeteer events abort cleanly upon session reset or queue clearing.
- **No Direct Browser Ingress (Zero Open CORS)**: Permissive CORS is disabled. The microservice is invoked strictly server-to-server by the Supabase Edge Function proxy or via local SSH tunnel. Direct browser calls are forbidden.
- **Zero Sensitive Logging & Error Scrubbing**:
  - Raw QR strings, cleartext phone numbers, message bodies, API secrets, and session tokens are **never** logged.
  - Server (5xx) errors return generic descriptions and sanitized reason codes; raw upstream stack traces or exception texts are suppressed.
- **Bearer Authentication & URL Secret Rejection**: All operational endpoints require `Authorization: Bearer <API_SECRET_KEY>`. Passing tokens in URL query strings is explicitly rejected with HTTP 400.
- **Anti-Ban Mitigation**: Bounded FIFO queue with randomized human-like jitter (3–8 seconds) between consecutive outbound messages.

---

## 2. Network Security & Staged Access Architecture

### Plain HTTP Security Constraint
Because the microservice natively runs plain HTTP, sending `Authorization: Bearer <API_SECRET_KEY>` across the unencrypted public internet exposes the secret key to interception.

To maintain security:
1. **Loopback Binding**: `docker-compose.yml` binds the host port strictly to `127.0.0.1:3001` (`127.0.0.1:3001:3001`).
2. **Firewall Rule**: Oracle Cloud Security List and host `ufw` must keep port `3001` **closed** to public internet traffic (`0.0.0.0/0`).
3. **Staged Access Paths**:
   - **Stage 3 Operator Pairing**: The operator connects via an encrypted SSH local port forward:
     ```bash
     ssh -i ~/.ssh/oracle_whatsapp_key -L 3001:127.0.0.1:3001 ubuntu@193.122.89.176
     ```
     The operator then accesses `http://localhost:3001/status` and `http://localhost:3001/qr` securely over the SSH tunnel.
   - **Stage 5 Supabase Proxy Ingress**: Prior to connecting the Supabase Edge Function proxy, an HTTPS reverse proxy (such as Caddy or Nginx with Let's Encrypt automated TLS) must be configured on the VM to terminate TLS securely.
4. **Settled Architecture Note**: Settled planning documents referenced public port 3001 for service ingress. Binding to `127.0.0.1` and requiring TLS termination for public ingress is a necessary transport-layer security refinement to prevent plaintext transmission of `API_SECRET_KEY`.

---

## 3. API Endpoints

### `GET /health`
- **Access**: Public (Unauthenticated)
- **Description**: Uptime check used by load balancers, container orchestrators, and monitoring probes.
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2026-09-20T12:00:00.000Z",
  "service": "mai-whatsapp-service"
}
```

---

### `GET /status`
- **Access**: Authenticated (`Authorization: Bearer <API_SECRET_KEY>`)
- **Description**: Returns live connection state, masked phone number, generation ID, and queue statistics.
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "uptime": 3600,
  "client": {
    "state": "READY",
    "ready": true,
    "authenticated": true,
    "phone": "9665****4567",
    "clientName": "Mai Coach",
    "hasQr": false,
    "qrTimestamp": null,
    "generation": 1,
    "lastError": null
  },
  "queue": {
    "queueLength": 0,
    "isProcessing": false,
    "generation": 1,
    "totalProcessed": 42,
    "totalFailed": 0,
    "maxSize": 100
  },
  "timestamp": "2026-09-20T12:00:00.000Z"
}
```

---

### `GET /qr`
- **Access**: Authenticated (`Authorization: Bearer <API_SECRET_KEY>`)
- **Description**: Visual web page rendering dynamic pairing QR code, or JSON with base64 PNG data URL.
- **Formats**:
  - **Browser (HTML)**: Request with `Accept: text/html` returns a styled pairing page with auto-refresh.
  - **API (JSON)**: Default or `?format=json` returns:
```json
{
  "status": "ok",
  "state": "QR_READY",
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANSU...",
  "timestamp": "2026-09-20T12:00:00.000Z"
}
```

---

### `POST /send-message`
- **Access**: Authenticated (`Authorization: Bearer <API_SECRET_KEY>`)
- **Headers**: `Content-Type: application/json`
- **Description**: Validates recipient and content, enqueues message into rate-limited anti-ban queue.
- **Option A — Raw Text**:
```json
{
  "to": "+966501234567",
  "text": "Hello, this is a test notification from Mai Parent Coaching."
}
```
- **Option B — Decoupled Template**:
```json
{
  "to": "+966501234567",
  "template": "booking_confirmation",
  "params": {
    "parentName": "Sarah",
    "appointmentType": "Parent Coaching Intake",
    "date": "2026-09-25",
    "time": "15:00",
    "timezone": "AST (UTC+3)",
    "meetingLink": "https://meet.google.com/xyz-abcd-efg"
  }
}
```
- **Response**: `200 OK` when whatsapp-web.js returns a message ID
```json
{
  "success": true,
  "status": "sent",
  "messageId": "true_966501234567@c.us_3EB0123456789ABC",
  "jobId": "msg_1726833600000_a1b2c3d4"
}
```
- **`202 Accepted`**: WhatsApp Web resolved the send request without returning a message ID. Delivery is unconfirmed; do not automatically retry because the message may already have arrived.
```json
{
  "success": true,
  "status": "submitted",
  "deliveryConfirmed": false,
  "messageId": null,
  "jobId": "msg_1726833600000_a1b2c3d4"
}
```
- **Error Responses**:
  - `502 Bad Gateway`: `{ "error": "Failed to dispatch WhatsApp message", "code": "SEND_MESSAGE_FAILED" }` (network/protocol delivery failure)
  - `503 Service Unavailable`: `{ "error": "WhatsApp client is not ready...", "code": "CLIENT_NOT_READY" }` or `{ "error": "Message dispatch cancelled due to session reset", "code": "SESSION_RESET_CANCELLED" }`
  - `504 Gateway Timeout`: `{ "error": "Message dispatch timed out; delivery outcome unknown. Do not blindly retry.", "code": "DELIVERY_OUTCOME_UNKNOWN" }`
  - `429 Too Many Requests`: `{ "error": "Message queue is full...", "code": "QUEUE_FULL" }`

---

### `POST /reset-session`
- **Access**: Authenticated (`Authorization: Bearer <API_SECRET_KEY>`)
- **Headers**: `Content-Type: application/json`
- **Description**: Fail-closed session reset: safely detaches queue, removes listeners, destroys existing client, purges LocalAuth files from disk, advances generation, and reinitializes back to `QR_READY`.
- **Payload**:
```json
{
  "confirm": "yes"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "status": "resetting",
  "message": "Session cleared and re-initialization triggered. New QR will be available shortly."
}
```

---

### `GET /templates`
- **Access**: Authenticated (`Authorization: Bearer <API_SECRET_KEY>`)
- **Description**: Returns registered message templates with required and optional parameters.

---

## 4. Configuration (`.env`)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | HTTP server listening port |
| `HOST` | `0.0.0.0` | Binding host address inside container |
| `API_SECRET_KEY` | *(Required)* | Secret token checked via `Authorization: Bearer <token>` |
| `SESSION_DATA_PATH` | `./.wwebjs_auth` | Persistent directory for LocalAuth credentials |
| `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/chromium` *(in Docker)* | Path to Chromium binary |
| `QUEUE_MAX_SIZE` | `100` | Maximum queued messages before returning HTTP 429 |
| `RATE_LIMIT_MIN_MS` | `3000` | Minimum randomized delay between sends (ms) |
| `RATE_LIMIT_MAX_MS` | `8000` | Maximum randomized delay between sends (ms) |

---

## 5. Local Development & Testing

```bash
# 1. Enter service directory
cd services/whatsapp-bot

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Edit .env and set API_SECRET_KEY

# 4. Run automated test suite
npm test

# 5. Run live HTTP validation check
node test/live-http-check.js
```

---

## 6. Docker & Oracle Ampere A1 (ARM64) Deployment

- The `Dockerfile` uses Debian 12 (`node:20-bookworm-slim`) and installs Debian's native `chromium` package.
- It asserts `test -x /usr/bin/chromium` at image build time to ensure the executable exists.
- **IMPORTANT**: Building the image locally on an x86/Windows machine does **not** verify ARM64 execution. The ARM64 image must be built on the Oracle Ampere A1 instance (or via multi-arch `docker buildx`) and verified on the live VM.
- Local test passes verify software architecture, route auth, and queue mechanics only; they do **not** prove WhatsApp phone pairing, actual message delivery to physical devices, reboot persistence, or remote Oracle VM deployment.

```bash
# Inside the VM over SSH:
docker compose up -d --build
docker compose logs -f whatsapp-bot
```
