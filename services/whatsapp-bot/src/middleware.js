/**
 * Security & Validation Middleware for Mai WhatsApp Automation Microservice.
 */

const crypto = require('crypto');
const config = require('./config');
const logger = require('./logger');
const { renderTemplate } = require('./templates');

/**
 * Constant-time string equality check to prevent timing attacks.
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Authenticate incoming requests using Bearer token matching API_SECRET_KEY.
 *
 * PRIVACY & SECURITY RULES:
 * - Reject any tokens sent via query parameters (no secrets in URLs).
 * - Never echo provided tokens in errors or logs.
 */
function authenticate(req, res, next) {
  // Reject query parameter tokens immediately
  if (req.query && (req.query.token || req.query.api_key || req.query.key || req.query.secret)) {
    return res.status(400).json({
      error: 'Security restriction: API secrets must never be passed in URL query parameters. Use the "Authorization: Bearer <token>" header.',
      code: 'SECRET_IN_URL_FORBIDDEN',
    });
  }

  // If no secret key is configured on the server, reject with 500 configuration error
  if (!config.API_SECRET_KEY) {
    logger.error('Authentication attempt rejected: API_SECRET_KEY is not configured on server', {
      reasonCode: 'MISSING_SERVER_SECRET',
    });
    return res.status(500).json({
      error: 'Server security misconfiguration: API_SECRET_KEY is not set.',
      code: 'SERVER_MISCONFIGURED',
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized: Missing Authorization header.',
      code: 'AUTH_HEADER_MISSING',
    });
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      error: 'Unauthorized: Format must be "Authorization: Bearer <token>".',
      code: 'AUTH_SCHEME_INVALID',
    });
  }

  const providedToken = parts[1];
  if (!safeCompare(providedToken, config.API_SECRET_KEY)) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid API secret token.',
      code: 'AUTH_TOKEN_INVALID',
    });
  }

  next();
}

/**
 * Validate and sanitize message dispatch payloads.
 */
function validateSendMessage(req, res, next) {
  const { to, text, message, template, params } = req.body || {};

  // 1. Validate recipient phone number
  if (!to || typeof to !== 'string') {
    return res.status(400).json({
      error: 'Validation failed: "to" phone number is required and must be a string.',
      code: 'INVALID_RECIPIENT_TYPE',
    });
  }

  // Strip all non-digit characters except leading plus
  const digitsOnly = to.replace(/@c\.us$/, '').replace(/[^\d]/g, '');
  if (digitsOnly.length < 8 || digitsOnly.length > 15) {
    return res.status(400).json({
      error: 'Validation failed: "to" must contain a valid international phone number (8 to 15 digits).',
      code: 'INVALID_PHONE_FORMAT',
    });
  }

  const cleanTo = `${digitsOnly}@c.us`;

  // 2. Validate and render message content
  let finalText = '';

  if (template) {
    try {
      finalText = renderTemplate(template, params || {});
    } catch (err) {
      return res.status(400).json({
        error: `Template rendering failed: ${err.message}`,
        code: 'TEMPLATE_RENDER_FAILED',
      });
    }
  } else if (typeof text === 'string' && text.trim().length > 0) {
    finalText = text.trim();
  } else if (typeof message === 'string' && message.trim().length > 0) {
    finalText = message.trim();
  } else {
    return res.status(400).json({
      error: 'Validation failed: must provide either "text"/"message" string or "template" name.',
      code: 'MISSING_MESSAGE_CONTENT',
    });
  }

  if (finalText.length > 4096) {
    return res.status(400).json({
      error: 'Validation failed: message content exceeds maximum length of 4096 characters.',
      code: 'MESSAGE_TOO_LONG',
    });
  }

  req.validatedMessage = {
    cleanTo,
    finalText,
  };

  next();
}

/**
 * Safeguard for /reset-session: strictly requires {"confirm": "yes"}.
 */
function validateResetSession(req, res, next) {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({
      error: 'Validation failed: request body must be JSON containing {"confirm": "yes"}.',
      code: 'INVALID_PAYLOAD',
    });
  }

  if (req.body.confirm !== 'yes') {
    return res.status(400).json({
      error: 'Action aborted: session reset requires explicit confirmation payload: {"confirm": "yes"}.',
      code: 'CONFIRMATION_REQUIRED',
    });
  }

  next();
}

/**
 * Global Error Handler.
 * Returns generic messages on server (5xx) errors to prevent leaking raw upstream exception text.
 */
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const code = err.code || (status >= 500 ? 'SERVER_ERROR' : 'REQUEST_ERROR');

  logger.error('Unhandled request processing error', {
    status,
    reasonCode: code,
  });

  res.status(status).json({
    error: status >= 500 ? 'Internal Server Error' : err.message,
    code,
  });
}

module.exports = {
  authenticate,
  validateSendMessage,
  validateResetSession,
  errorHandler,
};
