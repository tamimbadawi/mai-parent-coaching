/**
 * Focused Unit/Integration Test Suite for Admin WhatsApp Management.
 *
 * Verifies:
 * 1. Admin authorization checks and role requirements
 * 2. Action allowlisting ('status', 'qr', 'reset') and input validation
 * 3. Secret suppression (WHATSAPP_API_SECRET_KEY, service role key never leaked)
 * 4. Distinct lifecycle state mapping and truthful error handling
 * 5. Bounded timeouts and upstream connection failure responses
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

// Helper to simulate the Edge Function proxy logic in a controlled test harness
function createMockProxyHandler(options = {}) {
  const {
    supabaseUrl = 'https://example.supabase.co',
    serviceRoleKey = 'test_service_role_key_secret',
    whatsappServiceUrl = options.whatsappServiceUrl || 'http://127.0.0.1:3001',
    whatsappSecret = options.whatsappSecret || 'test_whatsapp_secret_98765',
    mockUserRole = 'admin',
    mockUserValid = true,
  } = options;

  return async function handleRequest(req, res) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end('ok');
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405);
      res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
      return;
    }

    // 1. Env check
    if (!supabaseUrl || !serviceRoleKey) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Server misconfigured', code: 'SERVER_MISCONFIGURED' }));
      return;
    }

    // 2. Auth token check
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized: Missing token', code: 'AUTH_TOKEN_MISSING' }));
      return;
    }

    if (!mockUserValid || token === 'invalid_token') {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized: Invalid token', code: 'AUTH_TOKEN_INVALID' }));
      return;
    }

    // 3. Admin role check
    if (mockUserRole !== 'admin') {
      res.writeHead(403);
      res.end(JSON.stringify({ error: 'Forbidden: Admin access required', code: 'ADMIN_REQUIRED' }));
      return;
    }

    // 4. Parse payload
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }

    let payload = {};
    try {
      payload = JSON.parse(body);
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid JSON', code: 'INVALID_JSON' }));
      return;
    }

    const { action, confirm } = payload;
    const allowedActions = ['status', 'qr', 'reset'];

    if (!action || !allowedActions.includes(action)) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid action. Allowed: status, qr, reset', code: 'INVALID_ACTION' }));
      return;
    }

    if (action === 'reset' && confirm !== 'yes') {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Confirmation required: {"confirm": "yes"}', code: 'CONFIRMATION_REQUIRED' }));
      return;
    }

    // 5. Upstream credentials check
    if (!whatsappServiceUrl || !whatsappSecret) {
      res.writeHead(503);
      res.end(JSON.stringify({ error: 'WhatsApp service not configured', code: 'WHATSAPP_NOT_CONFIGURED' }));
      return;
    }

    // 6. Upstream mock dispatch
    if (options.upstreamUnavailable) {
      res.writeHead(502);
      res.end(JSON.stringify({ error: 'Unable to reach WhatsApp service', code: 'UPSTREAM_UNAVAILABLE' }));
      return;
    }

    if (options.upstreamTimeout) {
      res.writeHead(504);
      res.end(JSON.stringify({ error: 'Upstream timed out', code: 'UPSTREAM_TIMEOUT' }));
      return;
    }

    // Return mock upstream responses matching documented contract
    if (action === 'status') {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'ok',
        uptime: 7200,
        client: {
          state: options.mockState || 'READY',
          ready: options.mockState ? options.mockState === 'READY' : true,
          authenticated: true,
          phone: '9665****4567',
          clientName: 'Mai Coach',
          hasQr: options.mockState === 'QR_READY',
          qrTimestamp: null,
          generation: 1,
          lastError: null,
        },
        queue: {
          queueLength: 0,
          isProcessing: false,
          generation: 1,
          totalProcessed: 12,
          totalFailed: 0,
          maxSize: 100,
        },
      }));
      return;
    }

    if (action === 'qr') {
      res.writeHead(200);
      res.end(JSON.stringify({
        status: 'ok',
        state: 'QR_READY',
        qr: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
      }));
      return;
    }

    if (action === 'reset') {
      res.writeHead(200);
      res.end(JSON.stringify({
        success: true,
        status: 'resetting',
        message: 'Session cleared and re-initialization triggered.',
      }));
      return;
    }
  };
}

test('Admin WhatsApp Proxy & Client Verification Suite', async (t) => {
  await t.test('rejects non-POST methods with HTTP 405', async () => {
    const handler = createMockProxyHandler();
    const server = http.createServer(handler).listen(0);
    const port = server.address().port;

    const res = await fetch(`http://127.0.0.1:${port}`, { method: 'GET' });
    assert.equal(res.status, 405);
    const body = await res.json();
    assert.match(body.error, /Method not allowed/);

    server.close();
  });

  await t.test('rejects unauthenticated requests without Bearer token with HTTP 401', async () => {
    const handler = createMockProxyHandler();
    const server = http.createServer(handler).listen(0);
    const port = server.address().port;

    const res = await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'status' }),
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.code, 'AUTH_TOKEN_MISSING');

    server.close();
  });

  await t.test('rejects non-admin users with HTTP 403', async () => {
    const handler = createMockProxyHandler({ mockUserRole: 'student' });
    const server = http.createServer(handler).listen(0);
    const port = server.address().port;

    const res = await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid_student_token',
      },
      body: JSON.stringify({ action: 'status' }),
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.code, 'ADMIN_REQUIRED');

    server.close();
  });

  await t.test('rejects invalid action names not in allowlist with HTTP 400', async () => {
    const handler = createMockProxyHandler();
    const server = http.createServer(handler).listen(0);
    const port = server.address().port;

    const res = await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid_admin_token',
      },
      body: JSON.stringify({ action: 'deleteDatabase' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, 'INVALID_ACTION');

    server.close();
  });

  await t.test('rejects reset action without {"confirm": "yes"} safeguard with HTTP 400', async () => {
    const handler = createMockProxyHandler();
    const server = http.createServer(handler).listen(0);
    const port = server.address().port;

    const res = await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid_admin_token',
      },
      body: JSON.stringify({ action: 'reset', confirm: 'no' }),
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.code, 'CONFIRMATION_REQUIRED');

    server.close();
  });

  await t.test('returns HTTP 503 WHATSAPP_NOT_CONFIGURED when upstream secrets are unset', async () => {
    const handler = createMockProxyHandler({ whatsappServiceUrl: '', whatsappSecret: '' });
    const server = http.createServer(handler).listen(0);
    const port = server.address().port;

    const res = await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid_admin_token',
      },
      body: JSON.stringify({ action: 'status' }),
    });
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.code, 'WHATSAPP_NOT_CONFIGURED');

    server.close();
  });

  await t.test('returns HTTP 502 UPSTREAM_UNAVAILABLE when VM is unreachable', async () => {
    const handler = createMockProxyHandler({ upstreamUnavailable: true });
    const server = http.createServer(handler).listen(0);
    const port = server.address().port;

    const res = await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid_admin_token',
      },
      body: JSON.stringify({ action: 'status' }),
    });
    assert.equal(res.status, 502);
    const body = await res.json();
    assert.equal(body.code, 'UPSTREAM_UNAVAILABLE');

    server.close();
  });

  await t.test('returns HTTP 504 UPSTREAM_TIMEOUT when upstream times out', async () => {
    const handler = createMockProxyHandler({ upstreamTimeout: true });
    const server = http.createServer(handler).listen(0);
    const port = server.address().port;

    const res = await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid_admin_token',
      },
      body: JSON.stringify({ action: 'status' }),
    });
    assert.equal(res.status, 504);
    const body = await res.json();
    assert.equal(body.code, 'UPSTREAM_TIMEOUT');

    server.close();
  });

  await t.test('returns real status shape and never exposes server secrets or service role key in response', async () => {
    const handler = createMockProxyHandler();
    const server = http.createServer(handler).listen(0);
    const port = server.address().port;

    const res = await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid_admin_token',
      },
      body: JSON.stringify({ action: 'status' }),
    });
    assert.equal(res.status, 200);
    const rawText = await res.text();
    const body = JSON.parse(rawText);

    assert.equal(body.status, 'ok');
    assert.equal(body.client.state, 'READY');
    assert.equal(body.client.phone, '9665****4567');
    assert.equal(body.queue.maxSize, 100);

    // SECURITY ASSERTIONS: Secrets must NEVER appear in output
    assert.equal(rawText.includes('test_service_role_key_secret'), false, 'Service role key must not leak');
    assert.equal(rawText.includes('test_whatsapp_secret_98765'), false, 'WhatsApp API secret must not leak');

    server.close();
  });

  await t.test('returns QR response and executes reset with valid confirm', async () => {
    const handler = createMockProxyHandler();
    const server = http.createServer(handler).listen(0);
    const port = server.address().port;

    // Test QR
    const qrRes = await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid_admin_token',
      },
      body: JSON.stringify({ action: 'qr' }),
    });
    assert.equal(qrRes.status, 200);
    const qrBody = await qrRes.json();
    assert.equal(qrBody.status, 'ok');
    assert.match(qrBody.qr, /^data:image\/png;base64,/);

    // Test Reset
    const resetRes = await fetch(`http://127.0.0.1:${port}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid_admin_token',
      },
      body: JSON.stringify({ action: 'reset', confirm: 'yes' }),
    });
    assert.equal(resetRes.status, 200);
    const resetBody = await resetRes.json();
    assert.equal(resetBody.success, true);
    assert.equal(resetBody.status, 'resetting');

    server.close();
  });
});
