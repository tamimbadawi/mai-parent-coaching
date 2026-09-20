/**
 * Sanitized Logger for Mai WhatsApp Automation Microservice.
 *
 * CRITICAL PRIVACY & SECURITY RULES:
 * - NEVER log raw QR payloads or strings.
 * - NEVER log client or recipient phone numbers in cleartext.
 * - NEVER log message bodies or text payloads.
 * - NEVER log API keys, Bearer tokens, or session secrets.
 * - NEVER log raw upstream exception text that could leak data.
 */

/**
 * Mask a phone number to protect client privacy.
 * Shows prefix and last 4 digits only, e.g. "9665****4567"
 *
 * @param {string|null|undefined} phone
 * @returns {string} Masked phone number or "[not_available]"
 */
function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '[not_available]';

  // Strip WhatsApp suffix if present and non-digits
  const clean = phone.replace(/@c\.us$/, '').replace(/[^\d+]/g, '');
  if (clean.length <= 4) return '****';

  const prefix = clean.slice(0, Math.min(4, clean.length - 4));
  const suffix = clean.slice(-4);
  return `${prefix}****${suffix}`;
}

/**
 * Keys that must be completely redacted if present in log metadata.
 */
const SENSITIVE_KEYS_REGEX = /^(authorization|token|secret|api_?key|password|qr|raw_?qr|qr_?code|text|message|body|phone|to|recipient|stack)$/i;

/**
 * Sanitize error objects to safe reason codes and error names only.
 * Prevents leaking upstream URLs, phone numbers, or tokens embedded in Error.message.
 */
function sanitizeError(err) {
  if (!err) return '[none]';
  if (typeof err === 'string') {
    // Strip anything resembling phone numbers or long tokens
    return err
      .replace(/[a-f0-9]{32,}/gi, '[REDACTED_TOKEN]')
      .replace(/\+?\d{8,15}/g, '[REDACTED_PHONE]');
  }
  if (typeof err === 'object') {
    return {
      name: err.name || 'Error',
      code: err.code || 'UNKNOWN_ERROR',
      reasonCode: err.reasonCode || err.code || 'ERROR',
    };
  }
  return '[error]';
}

/**
 * Recursively sanitize metadata objects before logging.
 */
function sanitizeMetadata(data) {
  if (!data || typeof data !== 'object') return data;

  if (data instanceof Error) {
    return sanitizeError(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeMetadata(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS_REGEX.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (key === 'error' || key === 'err') {
      sanitized[key] = sanitizeError(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeMetadata(value);
    } else if (typeof value === 'string') {
      // Scrub tokens and phone numbers from string values
      sanitized[key] = value
        .replace(/[a-f0-9]{32,}/gi, '[REDACTED_TOKEN]')
        .replace(/\+?\d{8,15}/g, '[REDACTED_PHONE]');
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function formatLog(level, message, meta) {
  const timestamp = new Date().toISOString();
  // Ensure message itself does not contain leaked tokens or phone numbers
  const safeMessage = typeof message === 'string'
    ? message
        .replace(/[a-f0-9]{32,}/gi, '[REDACTED_TOKEN]')
        .replace(/\+?\d{8,15}/g, '[REDACTED_PHONE]')
    : '[log]';

  const metaString = meta && Object.keys(meta).length > 0
    ? ` | ${JSON.stringify(sanitizeMetadata(meta))}`
    : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${safeMessage}${metaString}`;
}

const logger = {
  info(message, meta) {
    console.log(formatLog('info', message, meta));
  },

  warn(message, meta) {
    console.warn(formatLog('warn', message, meta));
  },

  error(message, meta) {
    console.error(formatLog('error', message, meta));
  },

  debug(message, meta) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(formatLog('debug', message, meta));
    }
  },

  maskPhone,
  sanitizeError,
};

module.exports = logger;
