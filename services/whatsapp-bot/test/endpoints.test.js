const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const config = require('../src/config');
const { app } = require('../src/index');
const { whatsAppClientManager, STATES } = require('../src/client');
const { messageQueue } = require('../src/queue');

const TEST_SECRET = 'super_secret_test_token_mai_987654';

test('HTTP Endpoints & Routing Suite', async (t) => {
  // Ensure test secret key is configured
  config.API_SECRET_KEY = TEST_SECRET;

  await t.test('GET /health returns 200 without authentication', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'mai-whatsapp-service');
    assert.equal(typeof res.body.uptime, 'number');
  });

  await t.test('Permissive CORS is disabled: no access-control-allow-origin wildcard header', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://malicious-site.com');

    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });

  await t.test('GET /status rejects request without Authorization header (401)', async () => {
    const res = await request(app).get('/status');
    assert.equal(res.status, 401);
    assert.match(res.body.error, /Missing Authorization header/);
    assert.equal(res.body.code, 'AUTH_HEADER_MISSING');
  });

  await t.test('GET /status returns 200 and operational metrics with valid Bearer token', async () => {
    const res = await request(app)
      .get('/status')
      .set('Authorization', `Bearer ${TEST_SECRET}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(res.body.client);
    assert.ok(res.body.queue);
    assert.equal(typeof res.body.uptime, 'number');
    assert.equal(typeof res.body.client.state, 'string');
    assert.equal(typeof res.body.client.generation, 'number');
  });

  await t.test('GET /qr rejects unauthenticated request (401)', async () => {
    const res = await request(app).get('/qr');
    assert.equal(res.status, 401);
  });

  await t.test('GET /qr returns 200 with JSON state when QR is not active', async () => {
    const res = await request(app)
      .get('/qr')
      .set('Authorization', `Bearer ${TEST_SECRET}`)
      .set('Accept', 'application/json');

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'unavailable');
    assert.ok(res.body.state);
  });

  await t.test('POST /send-message rejects unauthenticated request (401)', async () => {
    const res = await request(app)
      .post('/send-message')
      .send({ to: '+966501234567', text: 'Hello' });

    assert.equal(res.status, 401);
  });

  await t.test('POST /send-message rejects invalid phone number (400)', async () => {
    const res = await request(app)
      .post('/send-message')
      .set('Authorization', `Bearer ${TEST_SECRET}`)
      .send({ to: '123', text: 'Hello' });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /valid international phone number/);
    assert.equal(res.body.code, 'INVALID_PHONE_FORMAT');
  });

  await t.test('POST /send-message rejects missing text and template (400)', async () => {
    const res = await request(app)
      .post('/send-message')
      .set('Authorization', `Bearer ${TEST_SECRET}`)
      .send({ to: '+966501234567' });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /must provide either "text"\/\"message\" string or "template" name/);
    assert.equal(res.body.code, 'MISSING_MESSAGE_CONTENT');
  });

  await t.test('POST /send-message returns 503 when WhatsApp client is not READY', async () => {
    whatsAppClientManager.state = STATES.INITIALIZING;
    const res = await request(app)
      .post('/send-message')
      .set('Authorization', `Bearer ${TEST_SECRET}`)
      .send({ to: '+966501234567', text: 'Hello from test' });

    assert.equal(res.status, 503);
    assert.match(res.body.error, /WhatsApp client is not ready/);
    assert.equal(res.body.code, 'CLIENT_NOT_READY');
  });

  await t.test('POST /send-message returns 200 with real messageId ONLY after sendMessage resolves', async () => {
    // Put manager in READY state and attach mock client
    whatsAppClientManager.state = STATES.READY;
    messageQueue.setDelays(15, 25); // fast for tests

    const mockClient = {
      sendMessage: async (to, text) => {
        return {
          id: { _serialized: 'true_966501234567@c.us_3EB0777AAABBBCCC' },
        };
      },
    };
    whatsAppClientManager.client = mockClient;
    messageQueue.setClient(mockClient);

    const res = await request(app)
      .post('/send-message')
      .set('Authorization', `Bearer ${TEST_SECRET}`)
      .send({ to: '+966501234567', text: 'Testing real resolution' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.status, 'sent');
    assert.equal(res.body.messageId, 'true_966501234567@c.us_3EB0777AAABBBCCC');
    assert.match(res.body.jobId, /^msg_/);

    // Reset back to INITIALIZING
    whatsAppClientManager.state = STATES.INITIALIZING;
    whatsAppClientManager.client = null;
    messageQueue.setClient(null);
  });

  await t.test('POST /send-message returns non-2xx (502) when sendMessage rejects', async () => {
    whatsAppClientManager.state = STATES.READY;
    messageQueue.setDelays(10, 15);

    const mockFailingClient = {
      sendMessage: async () => {
        throw new Error('Upstream WhatsApp protocol failure');
      },
    };
    whatsAppClientManager.client = mockFailingClient;
    messageQueue.setClient(mockFailingClient);

    const res = await request(app)
      .post('/send-message')
      .set('Authorization', `Bearer ${TEST_SECRET}`)
      .send({ to: '+966501234567', text: 'Should fail' });

    assert.equal(res.status, 502);
    assert.equal(res.body.code, 'SEND_MESSAGE_FAILED');
    assert.equal(res.body.error, 'Failed to dispatch WhatsApp message');

    whatsAppClientManager.state = STATES.INITIALIZING;
    whatsAppClientManager.client = null;
    messageQueue.setClient(null);
  });

  await t.test('POST /send-message returns 502 with generic DELIVERY_OUTCOME_UNKNOWN when message ID is missing', async () => {
    whatsAppClientManager.state = STATES.READY;
    messageQueue.setDelays(10, 15);

    const mockClientNoId = {
      sendMessage: async () => ({ id: null }),
    };
    whatsAppClientManager.client = mockClientNoId;
    messageQueue.setClient(mockClientNoId);

    const res = await request(app)
      .post('/send-message')
      .set('Authorization', `Bearer ${TEST_SECRET}`)
      .send({ to: '+966501234567', text: 'Missing ID check' });

    assert.equal(res.status, 502);
    assert.equal(res.body.code, 'DELIVERY_OUTCOME_UNKNOWN');
    assert.equal(res.body.error, 'Message dispatch timed out or unconfirmed; delivery outcome unknown. Do not blindly retry.');

    whatsAppClientManager.state = STATES.INITIALIZING;
    whatsAppClientManager.client = null;
    messageQueue.setClient(null);
  });

  await t.test('POST /send-message returns generic error message on 5xx without leaking raw upstream text', async () => {
    whatsAppClientManager.state = STATES.READY;
    messageQueue.setDelays(10, 15);

    const rawError = 'Chromium driver exploded at Target.sendMessage: failed to evaluate script in Frame';
    const mockFailingClient = {
      sendMessage: async () => {
        throw new Error(rawError);
      },
    };
    whatsAppClientManager.client = mockFailingClient;
    messageQueue.setClient(mockFailingClient);

    const res = await request(app)
      .post('/send-message')
      .set('Authorization', `Bearer ${TEST_SECRET}`)
      .send({ to: '+966501234567', text: 'Raw error leak check' });

    assert.equal(res.status, 502);
    assert.equal(res.body.code, 'SEND_MESSAGE_FAILED');
    assert.equal(res.body.error, 'Failed to dispatch WhatsApp message');
    assert.equal(res.body.error.includes(rawError), false, 'Must not leak raw upstream error message');
    assert.equal(res.text.includes('Chromium'), false, 'Response text must not contain internal driver names');

    whatsAppClientManager.state = STATES.INITIALIZING;
    whatsAppClientManager.client = null;
    messageQueue.setClient(null);
  });


  await t.test('POST /reset-session rejects unauthenticated request (401)', async () => {
    const res = await request(app)
      .post('/reset-session')
      .send({ confirm: 'yes' });

    assert.equal(res.status, 401);
  });

  await t.test('POST /reset-session rejects request without {"confirm": "yes"} safeguard (400)', async () => {
    const res = await request(app)
      .post('/reset-session')
      .set('Authorization', `Bearer ${TEST_SECRET}`)
      .send({ confirm: 'no' });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /requires explicit confirmation payload: \{"confirm": "yes"\}/);
    assert.equal(res.body.code, 'CONFIRMATION_REQUIRED');
  });

  await t.test('POST /reset-session rejects empty body (400)', async () => {
    const res = await request(app)
      .post('/reset-session')
      .set('Authorization', `Bearer ${TEST_SECRET}`)
      .send({});

    assert.equal(res.status, 400);
    assert.match(res.body.error, /requires explicit confirmation payload/);
    assert.equal(res.body.code, 'CONFIRMATION_REQUIRED');
  });

  await t.test('GET /templates returns 200 with catalog when authenticated', async () => {
    const res = await request(app)
      .get('/templates')
      .set('Authorization', `Bearer ${TEST_SECRET}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.ok(Array.isArray(res.body.templates));
    assert.ok(res.body.templates.length >= 5);
  });
});
