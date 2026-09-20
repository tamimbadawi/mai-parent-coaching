/**
 * Live HTTP verification script for Mai WhatsApp Microservice.
 * Runs standalone on port 3099, performs live HTTP requests without pairing,
 * prints exact responses, and exits cleanly.
 */

const http = require('http');
const config = require('../src/config');
const { app } = require('../src/index');

const TEST_PORT = 3099;
const TEST_KEY = 'verify_secret_token_12345';
config.API_SECRET_KEY = TEST_KEY;

async function runLiveChecks() {
  const server = app.listen(TEST_PORT, '127.0.0.1');
  console.log(`[LIVE-CHECK] Server listening on http://127.0.0.1:${TEST_PORT}`);

  const baseUrl = `http://127.0.0.1:${TEST_PORT}`;

  async function check(name, path, options = {}) {
    console.log(`\n=== CHECK: ${name} (${options.method || 'GET'} ${path}) ===`);
    try {
      const res = await fetch(`${baseUrl}${path}`, options);
      const text = await res.text();
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
      console.log(`Status: ${res.status} ${res.statusText}`);
      console.log('Headers: Content-Type =', res.headers.get('content-type'));
      console.log('Body:', parsed ? JSON.stringify(parsed, null, 2) : text.slice(0, 300));
      return { status: res.status, body: parsed || text };
    } catch (err) {
      console.error(`Error in ${name}:`, err.message);
      return { error: err.message };
    }
  }

  // 1. Health check (unauthenticated)
  await check('1. Health Check (Unauthenticated)', '/health');

  // 2. Status without auth (should 401)
  await check('2. Status (Unauthenticated - Expect 401)', '/status');

  // 3. Status with auth (should 200)
  await check('3. Status (Authenticated - Expect 200)', '/status', {
    headers: { Authorization: `Bearer ${TEST_KEY}` },
  });

  // 4. Status with token in query param (security rejection - expect 400)
  await check('4. Status with Token in URL (Expect 400)', `/status?token=${TEST_KEY}`);

  // 5. QR endpoint with auth JSON format (should 200 with state)
  await check('5. QR Status (Authenticated JSON - Expect 200)', '/qr?format=json', {
    headers: { Authorization: `Bearer ${TEST_KEY}` },
  });

  // 6. Send message without client ready (should 503 Service Unavailable)
  await check('6. Send Message without Client Ready (Expect 503)', '/send-message', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TEST_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: '+966501234567',
      text: 'Test message verification',
    }),
  });

  // 7. Reset session without confirmation (should 400 Bad Request)
  await check('7. Reset Session without Confirm (Expect 400)', '/reset-session', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TEST_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirm: 'no' }),
  });

  // 8. Reset session with confirmation (should 200 OK)
  await check('8. Reset Session with Valid Confirm (Expect 200)', '/reset-session', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TEST_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirm: 'yes' }),
  });

  // 9. Template catalog (authenticated - should 200 OK)
  await check('9. Template Catalog (Authenticated - Expect 200)', '/templates', {
    headers: { Authorization: `Bearer ${TEST_KEY}` },
  });

  console.log('\n[LIVE-CHECK] All HTTP checks finished. Closing test server.');
  server.close(() => {
    console.log('[LIVE-CHECK] Server cleanly stopped.');
    process.exit(0);
  });
}

runLiveChecks();
