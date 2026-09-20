/**
 * Mai WhatsApp Automation Companion Microservice.
 *
 * Exposes authenticated HTTP endpoints for WhatsApp automation,
 * lifecycle state reporting, pairing QR viewing, and safe session reset.
 *
 * Direct browser access is disabled (no permissive CORS);
 * ingress is reserved for server-side Supabase Edge Functions or local SSH tunnel.
 */

const express = require('express');
const config = require('./config');
const logger = require('./logger');
const { whatsAppClientManager, STATES } = require('./client');
const { messageQueue } = require('./queue');
const { getTemplateCatalog } = require('./templates');
const {
  authenticate,
  validateSendMessage,
  validateResetSession,
  errorHandler,
} = require('./middleware');

const app = express();

// Disable x-powered-by header
app.disable('x-powered-by');

// Global middleware (NO open CORS; service is invoked by backend proxy only)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * --------------------------------------------------------------------------
 * Public Health Endpoint (Unauthenticated)
 * --------------------------------------------------------------------------
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    service: 'mai-whatsapp-service',
  });
});

/**
 * --------------------------------------------------------------------------
 * Live Status Endpoint (Authenticated)
 * Returns current lifecycle state, masked phone, and queue status.
 * --------------------------------------------------------------------------
 */
app.get('/status', authenticate, (req, res) => {
  const clientStatus = whatsAppClientManager.getStatus();
  const queueStatus = messageQueue.getStatus();

  res.status(200).json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    client: clientStatus,
    queue: queueStatus,
    timestamp: new Date().toISOString(),
  });
});

/**
 * --------------------------------------------------------------------------
 * Visual QR Code Endpoint (Authenticated)
 * Returns visual HTML pairing page or JSON payload with base64 QR data URL.
 * --------------------------------------------------------------------------
 */
app.get('/qr', authenticate, (req, res) => {
  const clientStatus = whatsAppClientManager.getStatus();
  const qrDataUrl = whatsAppClientManager.getQrDataUrl();
  const wantsHtml = req.headers.accept && req.headers.accept.includes('text/html') && req.query.format !== 'json';

  if (!qrDataUrl || clientStatus.state !== STATES.QR_READY) {
    if (wantsHtml) {
      return res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>WhatsApp Status — Mai Parent Coaching</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fdfbf7; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
            .card { background: white; border-radius: 16px; padding: 36px; max-width: 440px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06); text-align: center; border: 1px solid #e2e8f0; }
            .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-weight: 600; font-size: 13px; margin-bottom: 16px; background: #e0f2fe; color: #0369a1; }
            .badge.ready { background: #dcfce7; color: #15803d; }
            h1 { font-size: 22px; margin: 0 0 12px 0; color: #0f172a; }
            p { color: #64748b; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0; }
            .btn { display: inline-block; background: #0f172a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; cursor: pointer; border: none; }
          </style>
        </head>
        <body>
          <div class="card">
            <span class="badge ${clientStatus.ready ? 'ready' : ''}">Status: ${clientStatus.state}</span>
            <h1>WhatsApp Connection</h1>
            <p>${clientStatus.ready ? `WhatsApp is connected and active (${clientStatus.phone}). No pairing QR required.` : `Client is currently in state <strong>${clientStatus.state}</strong>. If disconnected, please wait or re-initialize.`}</p>
            <button class="btn" onclick="location.reload()">Refresh Status</button>
          </div>
        </body>
        </html>
      `);
    }

    return res.status(200).json({
      status: 'unavailable',
      state: clientStatus.state,
      ready: clientStatus.ready,
      message: `QR code not active. Client state is "${clientStatus.state}".`,
    });
  }

  // Active QR available
  if (wantsHtml) {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pair WhatsApp — Mai Parent Coaching</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fdfbf7; color: #1e293b; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
          .card { background: white; border-radius: 16px; padding: 36px; max-width: 420px; width: 100%; box-shadow: 0 10px 30px -5px rgba(0,0,0,0.08); text-align: center; border: 1px solid #e2e8f0; }
          h1 { font-size: 22px; margin: 0 0 8px 0; color: #0f172a; }
          p { color: #64748b; font-size: 14px; margin: 0 0 20px 0; }
          .qr-box { background: #f8fafc; border-radius: 12px; padding: 16px; display: inline-block; border: 1px solid #e2e8f0; margin-bottom: 20px; }
          .qr-box img { display: block; width: 280px; height: 280px; border-radius: 8px; }
          .instructions { text-align: left; background: #f8fafc; border-radius: 8px; padding: 14px 18px; font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 20px; }
          .instructions ol { margin: 0; padding-left: 20px; }
          .footer-note { font-size: 12px; color: #94a3b8; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Scan with WhatsApp</h1>
          <p>Link the coach WhatsApp number for automated notifications.</p>
          <div class="qr-box">
            <img src="${qrDataUrl}" alt="WhatsApp Pairing QR Code" />
          </div>
          <div class="instructions">
            <ol>
              <li>Open <strong>WhatsApp</strong> on the dedicated phone</li>
              <li>Tap <strong>Settings</strong> &gt; <strong>Linked Devices</strong></li>
              <li>Tap <strong>Link a Device</strong> and point camera here</li>
            </ol>
          </div>
          <div class="footer-note">This page will automatically refresh every 15 seconds.</div>
        </div>
        <script>
          setTimeout(() => location.reload(), 15000);
        </script>
      </body>
      </html>
    `);
  }

  return res.status(200).json({
    status: 'ok',
    state: STATES.QR_READY,
    qr: qrDataUrl,
    timestamp: clientStatus.qrTimestamp,
  });
});

/**
 * --------------------------------------------------------------------------
 * Message Dispatch Endpoint (Authenticated)
 * Awaits serialized rate-limited delivery and returns HTTP 200 with the real
 * WhatsApp message ID ONLY after sendMessage resolves.
 * --------------------------------------------------------------------------
 */
app.post('/send-message', authenticate, validateSendMessage, async (req, res) => {
  const clientStatus = whatsAppClientManager.getStatus();

  if (!clientStatus.ready) {
    return res.status(503).json({
      error: `WhatsApp client is not ready (current state: ${clientStatus.state}). Please scan QR or check connection.`,
      code: 'CLIENT_NOT_READY',
      state: clientStatus.state,
    });
  }

  try {
    const { cleanTo, finalText } = req.validatedMessage;
    // Await actual network dispatch resolution from whatsapp-web.js
    const result = await messageQueue.enqueue({ to: cleanTo, text: finalText });

    return res.status(result.status === 'submitted' ? 202 : 200).json(result);
  } catch (err) {
    const status = err.status || 500;
    const code = err.code || (status >= 500 ? 'SERVER_ERROR' : 'REQUEST_ERROR');

    // Generic messages based on reason code without raw upstream exception text
    let errorMessage = 'Internal Server Error';
    if (code === 'DELIVERY_OUTCOME_UNKNOWN') {
      errorMessage = 'Message dispatch timed out or unconfirmed; delivery outcome unknown. Do not blindly retry.';
    } else if (code === 'SEND_MESSAGE_FAILED') {
      errorMessage = 'Failed to dispatch WhatsApp message';
    } else if (code === 'SESSION_RESET_CANCELLED') {
      errorMessage = 'Message dispatch cancelled due to session reset';
    } else if (code === 'CLIENT_NOT_READY') {
      errorMessage = 'WhatsApp client is not ready to send messages';
    } else if (code === 'QUEUE_FULL') {
      errorMessage = 'Message queue is full. Try again later.';
    } else if (status < 500 && err.message) {
      errorMessage = err.message;
    }

    return res.status(status).json({
      error: errorMessage,
      code,
    });
  }
});

/**
 * --------------------------------------------------------------------------
 * Session Reset Endpoint (Authenticated + Confirmation Safeguard)
 * Disconnects current session, destroys client, purges LocalAuth files,
 * and reinitializes fresh client back into QR_READY state.
 * --------------------------------------------------------------------------
 */
app.post('/reset-session', authenticate, validateResetSession, async (req, res) => {
  try {
    const result = await whatsAppClientManager.resetSession();
    return res.status(200).json({
      success: true,
      status: 'resetting',
      message: result.message,
    });
  } catch (err) {
    const status = err.status || 500;
    logger.error('Session reset request failed', { reasonCode: err.code || 'RESET_FAILED' });
    return res.status(status).json({
      error: 'Session reset failed',
      code: err.code || 'RESET_FAILED',
    });
  }
});

/**
 * --------------------------------------------------------------------------
 * Template Catalog Endpoint (Authenticated)
 * Returns all available message templates and their parameter definitions.
 * --------------------------------------------------------------------------
 */
app.get('/templates', authenticate, (req, res) => {
  res.status(200).json({
    status: 'ok',
    templates: getTemplateCatalog(),
  });
});

// Register global error handler
app.use(errorHandler);

/**
 * Start Express server and initialize WhatsApp Web in background.
 */
let server = null;

function startServer(port = config.PORT) {
  server = app.listen(port, config.HOST, () => {
    logger.info(`Mai WhatsApp Microservice listening on http://${config.HOST}:${port}`);
    logger.info(`Environment: ${config.NODE_ENV} | Session Path: ${config.SESSION_DATA_PATH}`);

    // Check if API_SECRET_KEY is configured
    if (!config.API_SECRET_KEY) {
      logger.warn('WARNING: API_SECRET_KEY is not set! Authenticated routes will return HTTP 500 until configured.');
    }

    // Launch WhatsApp client asynchronously
    whatsAppClientManager.initialize();
  });

  return server;
}

// Graceful shutdown handlers
function handleShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Start server if executed directly
if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
};
