const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../src/config');
const { authenticate } = require('../src/middleware');

test('Authentication Middleware', async (t) => {
  // Set test API key in config
  config.API_SECRET_KEY = 'test_secret_key_1234567890';

  await t.test('rejects query parameter tokens with HTTP 400', () => {
    let statusCode = null;
    let jsonResponse = null;

    const req = {
      query: { token: 'test_secret_key_1234567890' },
      headers: {},
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };
    const next = () => {
      assert.fail('next() should not be called when token is in query params');
    };

    authenticate(req, res, next);
    assert.equal(statusCode, 400);
    assert.match(jsonResponse.error, /API secrets must never be passed in URL query parameters/);
  });

  await t.test('rejects request without Authorization header with HTTP 401', () => {
    let statusCode = null;
    let jsonResponse = null;

    const req = { query: {}, headers: {} };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };
    const next = () => {
      assert.fail('next() should not be called when Authorization header is missing');
    };

    authenticate(req, res, next);
    assert.equal(statusCode, 401);
    assert.match(jsonResponse.error, /Missing Authorization header/);
  });

  await t.test('rejects non-Bearer scheme with HTTP 401', () => {
    let statusCode = null;
    let jsonResponse = null;

    const req = {
      query: {},
      headers: { authorization: 'Basic dGVzdDp0ZXN0' },
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };
    const next = () => {
      assert.fail('next() should not be called with Basic auth');
    };

    authenticate(req, res, next);
    assert.equal(statusCode, 401);
    assert.match(jsonResponse.error, /Format must be "Authorization: Bearer <token>"/);
  });

  await t.test('rejects invalid secret token with HTTP 401', () => {
    let statusCode = null;
    let jsonResponse = null;

    const req = {
      query: {},
      headers: { authorization: 'Bearer wrong_token' },
    };
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonResponse = data;
        return this;
      },
    };
    const next = () => {
      assert.fail('next() should not be called with wrong token');
    };

    authenticate(req, res, next);
    assert.equal(statusCode, 401);
    assert.match(jsonResponse.error, /Invalid API secret token/);
  });

  await t.test('accepts valid Bearer token and calls next()', () => {
    let nextCalled = false;
    const req = {
      query: {},
      headers: { authorization: 'Bearer test_secret_key_1234567890' },
    };
    const res = {
      status() {
        assert.fail('res.status() should not be called on valid auth');
      },
      json() {
        assert.fail('res.json() should not be called on valid auth');
      },
    };
    const next = () => {
      nextCalled = true;
    };

    authenticate(req, res, next);
    assert.equal(nextCalled, true);
  });
});
