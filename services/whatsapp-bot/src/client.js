/**
 * WhatsApp Client Manager using whatsapp-web.js and LocalAuth.
 *
 * Manages full lifecycle states, QR code generation, safe restarts,
 * and fail-closed session resets with generation control.
 */

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const config = require('./config');
const logger = require('./logger');
const { messageQueue } = require('./queue');

// Formal Lifecycle States
const STATES = {
  INITIALIZING: 'INITIALIZING',
  QR_READY: 'QR_READY',
  AUTHENTICATED: 'AUTHENTICATED',
  READY: 'READY',
  AUTH_FAILURE: 'AUTH_FAILURE',
  DISCONNECTED: 'DISCONNECTED',
  RESETTING: 'RESETTING',
  ERROR: 'ERROR',
};

/**
 * Validate and safely resolve session storage path before any filesystem operations.
 * Cross-platform check: prevents accidental root directory or system directory deletion.
 */
function resolveSafeSessionPath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string' || inputPath.trim() === '') {
    const err = new Error('Invalid session path configuration: path must be non-empty');
    err.code = 'INVALID_SESSION_PATH';
    throw err;
  }

  const trimmed = inputPath.trim();
  if (trimmed === '.' || trimmed === '..') {
    const err = new Error('Security violation: session path directory name is unsafe');
    err.code = 'UNSAFE_PATH_NAME';
    throw err;
  }

  const resolved = path.resolve(trimmed);
  const parsed = path.parse(resolved);

  // Forbid filesystem root deletion (e.g. "/" or "C:\" or "D:\")
  if (resolved === parsed.root) {
    const err = new Error('Security violation: session path cannot be filesystem root');
    err.code = 'UNSAFE_PATH_ROOT';
    throw err;
  }

  // 2. Basename restriction: MUST be the dedicated LocalAuth directory name ".wwebjs_auth"
  // Forbids general directories such as "/home/ubuntu", "/app/uploads", "/var/data"
  const base = path.basename(resolved);
  if (base !== '.wwebjs_auth') {
    const err = new Error('Security violation: session path basename must be exactly .wwebjs_auth');
    err.code = 'UNSAFE_PATH_NAME';
    throw err;
  }

  // 3. System directories check: strip drive letter if present on Windows ("d:/etc" -> "/etc")
  const normalized = resolved.replace(/\\/g, '/').toLowerCase();
  const noDrive = normalized.replace(/^[a-z]:/i, '');

  const dangerousSystemDirs = [
    '/bin', '/boot', '/dev', '/etc', '/home', '/lib', '/proc', '/root',
    '/run', '/sbin', '/sys', '/tmp', '/usr', '/var', '/app',
    '/windows', '/winnt', '/program files', '/program files (x86)',
  ];

  for (const dangerous of dangerousSystemDirs) {
    if (noDrive === dangerous) {
      const err = new Error('Security violation: session path matches protected system directory');
      err.code = 'UNSAFE_PATH_SYSTEM';
      throw err;
    }
  }

  // Ensure path is not placed directly inside high-risk system root (e.g. "/.wwebjs_auth", "/etc/.wwebjs_auth")
  const dangerousParentDirs = [
    '/', '', '/bin', '/boot', '/dev', '/etc', '/lib', '/proc', '/root',
    '/run', '/sbin', '/sys', '/windows', '/winnt',
  ];
  const parentNoDrive = path.dirname(noDrive);
  if (dangerousParentDirs.includes(parentNoDrive)) {
    const err = new Error('Security violation: session path cannot be directly inside protected system directory');
    err.code = 'UNSAFE_PATH_SYSTEM';
    throw err;
  }

  // 4. Reject symbolic links and verify canonical resolution
  try {
    const lstats = fs.lstatSync(resolved);
    if (lstats.isSymbolicLink()) {
      const err = new Error('Security violation: session path cannot be a symbolic link');
      err.code = 'UNSAFE_PATH_SYMLINK';
      throw err;
    }

    const real = fs.realpathSync(resolved);
    if (path.basename(real) !== '.wwebjs_auth') {
      const err = new Error('Security violation: canonical session path basename must be .wwebjs_auth');
      err.code = 'UNSAFE_PATH_NAME';
      throw err;
    }
  } catch (err) {
    if (err.code === 'UNSAFE_PATH_SYMLINK' || err.code === 'UNSAFE_PATH_NAME' || err.code === 'UNSAFE_PATH_SYSTEM') {
      throw err;
    }
    // If the directory does not exist yet (ENOENT), that is allowed prior to initialization
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }

  // 5. Walk up ancestor tree and ensure no existing ancestor is a symbolic link
  let currentAncestor = resolved;
  while (currentAncestor) {
    const parent = path.dirname(currentAncestor);
    if (parent === currentAncestor) break; // reached filesystem root
    currentAncestor = parent;
    try {
      if (fs.existsSync(currentAncestor)) {
        const parentStat = fs.lstatSync(currentAncestor);
        if (parentStat.isSymbolicLink()) {
          const err = new Error('Security violation: session path ancestor cannot be a symbolic link');
          err.code = 'UNSAFE_PATH_SYMLINK';
          throw err;
        }
      }
    } catch (err) {
      if (err.code === 'UNSAFE_PATH_SYMLINK') throw err;
    }
  }

  return resolved;
}

class WhatsAppClientManager {
  constructor() {
    this.client = null;
    this.state = STATES.INITIALIZING;
    this.sessionGeneration = 0;
    this.qrDataUrl = null;
    this.qrTimestamp = null;
    this.connectedPhone = null;
    this.connectedName = null;
    this.lastError = null;
    this.isResetting = false;
  }

  /**
   * Determine the best Chromium executable path.
   */
  resolveChromiumPath() {
    if (config.PUPPETEER_EXECUTABLE_PATH) {
      return config.PUPPETEER_EXECUTABLE_PATH;
    }

    if (process.platform === 'linux') {
      const standardLinuxPaths = [
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
      ];
      for (const p of standardLinuxPaths) {
        if (fs.existsSync(p)) {
          return p;
        }
      }
    }

    return undefined;
  }

  /**
   * Initialize the whatsapp-web.js client.
   * Guaranteed not to crash the host Express server on failure.
   */
  async initialize() {
    if (this.isResetting) {
      logger.info('Initialization deferred: session reset in progress');
      return;
    }

    this.sessionGeneration++;
    const currentGen = this.sessionGeneration;

    this.state = STATES.INITIALIZING;
    this.lastError = null;
    logger.info('Initializing WhatsApp Web client...', { generation: currentGen });

    // Validate safe session directory path
    let safeSessionPath;
    try {
      safeSessionPath = resolveSafeSessionPath(config.SESSION_DATA_PATH);
      if (!fs.existsSync(safeSessionPath)) {
        fs.mkdirSync(safeSessionPath, { recursive: true });
      }
    } catch (err) {
      this.state = STATES.ERROR;
      this.lastError = 'SESSION_STORAGE_INIT_FAILED';
      logger.error('Failed to validate or create session storage path', {
        reasonCode: err.code || 'STORAGE_INIT_ERROR',
      });
      return;
    }

    const executablePath = this.resolveChromiumPath();
    logger.info('Configuring Chromium launch parameters', {
      customPathSpecified: Boolean(executablePath),
      platform: process.platform,
      arch: process.arch,
      generation: currentGen,
    });

    try {
      this.client = new Client({
        authStrategy: new LocalAuth({
          dataPath: safeSessionPath,
          clientId: 'mai-whatsapp-session',
        }),
        puppeteer: {
          headless: true,
          executablePath,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
          ],
        },
      });

      this.registerEvents(this.client, currentGen);

      // Initialize in background without blocking server startup
      this.client.initialize().catch((err) => {
        if (this.sessionGeneration !== currentGen) return;
        this.state = STATES.ERROR;
        this.lastError = 'CLIENT_INIT_FAILED';
        logger.error('WhatsApp client initialization failed', {
          reasonCode: 'CLIENT_INIT_FAILED',
          errorCode: err?.code || 'UNKNOWN',
        });
      });
    } catch (err) {
      this.state = STATES.ERROR;
      this.lastError = 'CONSTRUCTOR_FAILED';
      logger.error('Synchronous error constructing WhatsApp client', {
        reasonCode: 'CONSTRUCTOR_FAILED',
        errorCode: err?.code || 'UNKNOWN',
      });
    }
  }

  /**
   * Register event handlers tied strictly to the specified session generation.
   * Prevents stale client callbacks from mutating state after a reset.
   */
  registerEvents(clientInstance, boundGeneration) {
    if (!clientInstance) return;

    // Pairing QR Code received
    clientInstance.on('qr', async (qrString) => {
      // Ignore callbacks from obsolete generations
      if (this.sessionGeneration !== boundGeneration || this.isResetting) return;

      try {
        this.qrDataUrl = await QRCode.toDataURL(qrString, {
          width: 320,
          margin: 2,
          color: {
            dark: '#1e293b',
            light: '#fdfbf7',
          },
        });
        this.qrTimestamp = new Date();
        this.state = STATES.QR_READY;

        // PRIVACY RULE: Log only that QR is available; NEVER log raw QR payload!
        logger.info('New pairing QR code generated. Ready for scanning at /qr', {
          generation: boundGeneration,
        });
      } catch (err) {
        logger.error('Failed to generate QR data URL', {
          reasonCode: 'QR_RENDER_FAILED',
        });
      }
    });

    // Session Authenticated
    clientInstance.on('authenticated', () => {
      if (this.sessionGeneration !== boundGeneration || this.isResetting) return;
      this.state = STATES.AUTHENTICATED;
      this.qrDataUrl = null;
      logger.info('WhatsApp session authenticated successfully', { generation: boundGeneration });
    });

    // Client Ready for message dispatch
    clientInstance.on('ready', () => {
      if (this.sessionGeneration !== boundGeneration || this.isResetting) return;
      this.state = STATES.READY;
      this.qrDataUrl = null;

      try {
        const widUser = clientInstance.info?.wid?.user;
        const pushname = clientInstance.info?.pushname;
        this.connectedPhone = widUser || null;
        this.connectedName = pushname || null;
      } catch {
        this.connectedPhone = null;
        this.connectedName = null;
      }

      // Attach client to message queue for processing
      messageQueue.setClient(clientInstance);

      logger.info('WhatsApp client is ready to send messages', {
        state: this.state,
        generation: boundGeneration,
        maskedPhone: logger.maskPhone(this.connectedPhone),
      });
    });

    // Authentication Failure
    clientInstance.on('auth_failure', () => {
      if (this.sessionGeneration !== boundGeneration || this.isResetting) return;
      this.state = STATES.AUTH_FAILURE;
      this.qrDataUrl = null;
      this.lastError = 'AUTH_FAILURE';
      logger.warn('WhatsApp authentication failed', { reasonCode: 'AUTH_FAILURE', generation: boundGeneration });
    });

    // Disconnected
    clientInstance.on('disconnected', (reason) => {
      if (this.sessionGeneration !== boundGeneration) return;
      this.state = STATES.DISCONNECTED;
      this.qrDataUrl = null;
      this.connectedPhone = null;
      this.connectedName = null;
      messageQueue.setClient(null);
      logger.warn('WhatsApp client disconnected', {
        reasonCode: typeof reason === 'string' ? reason : 'DISCONNECTED',
        generation: boundGeneration,
      });
    });
  }

  /**
   * Reset the WhatsApp session with STRICT FAIL-CLOSED guarantees.
   *
   * Strict Rules:
   * 1. Must wait for any active in-flight network send to finish; if timeout, FAIL CLOSED.
   * 2. If client.logout() fails, STOP, set ERROR, do NOT delete files, do NOT reinitialize, return 500.
   * 3. If client.destroy() fails, STOP, set ERROR, do NOT delete files, do NOT reinitialize, return 500.
   * 4. If path resolution is unsafe, STOP, set ERROR, do NOT delete, return 500.
   * 5. If file deletion fails, STOP, set ERROR, do NOT reinitialize, return 500.
   */
  async resetSession() {
    if (this.isResetting) {
      const err = new Error('Session reset is already in progress');
      err.status = 409;
      err.code = 'RESET_IN_PROGRESS';
      throw err;
    }

    // 0. Pre-flight path safety check: validate session storage path BEFORE ANY client actions or modifications (FAIL-CLOSED)
    let safePath;
    try {
      safePath = resolveSafeSessionPath(config.SESSION_DATA_PATH);
    } catch (err) {
      this.state = STATES.ERROR;
      this.lastError = 'UNSAFE_SESSION_PATH';
      this.isResetting = false;
      logger.error('Session reset aborted: unsafe session data path', {
        reasonCode: err.code || 'UNSAFE_SESSION_PATH',
      });
      const failError = new Error('Session reset failed: invalid session storage configuration');
      failError.status = 500;
      failError.code = 'UNSAFE_SESSION_PATH';
      throw failError;
    }

    this.isResetting = true;
    this.state = STATES.RESETTING;
    logger.info('Starting full WhatsApp session reset and cache purge');

    // 1. Invalidate queue generation immediately to cancel in-flight sleeps and discard pending items
    this.sessionGeneration++;
    messageQueue.clear();

    // 2. Wait for any active in-flight network send to finish (FAIL-CLOSED)
    try {
      await messageQueue.waitForActiveSend(5000);
    } catch (err) {
      this.state = STATES.ERROR;
      this.lastError = 'ACTIVE_SEND_TIMEOUT';
      this.isResetting = false;
      logger.error('Session reset aborted: active message send timed out', {
        reasonCode: 'ACTIVE_SEND_TIMEOUT',
      });
      const failError = new Error('Session reset failed: active send timed out');
      failError.status = 500;
      failError.code = 'ACTIVE_SEND_TIMEOUT';
      throw failError;
    }

    // 3. Detach queue from client
    messageQueue.setClient(null);

    // 4. Capture reference to client and null it on manager immediately
    const oldClient = this.client;
    this.client = null;

    if (oldClient) {
      // Remove all listeners immediately so no callbacks fire
      try {
        if (typeof oldClient.removeAllListeners === 'function') {
          oldClient.removeAllListeners();
        }
      } catch (err) {
        // Ignored
      }

      // 5. Logout step (FAIL-CLOSED: if logout rejects, stop immediately)
      if (typeof oldClient.logout === 'function') {
        try {
          await oldClient.logout();
        } catch (err) {
          this.state = STATES.ERROR;
          this.lastError = 'LOGOUT_FAILED';
          this.isResetting = false;
          logger.error('Session reset aborted: client logout failed', {
            reasonCode: 'LOGOUT_FAILED',
          });
          const failError = new Error('Session reset failed: client logout failed');
          failError.status = 500;
          failError.code = 'LOGOUT_FAILED';
          throw failError;
        }
      }

      // 6. Destroy step (FAIL-CLOSED: if destroy rejects, stop immediately)
      if (typeof oldClient.destroy === 'function') {
        try {
          await oldClient.destroy();
        } catch (err) {
          this.state = STATES.ERROR;
          this.lastError = 'DESTROY_FAILED';
          this.isResetting = false;
          logger.error('Session reset aborted: client destroy failed', {
            reasonCode: 'DESTROY_FAILED',
          });
          const failError = new Error('Session reset failed: client destroy failed');
          failError.status = 500;
          failError.code = 'DESTROY_FAILED';
          throw failError;
        }
      }
    }

    // 7. Re-verify safe session storage path immediately prior to deletion (defense-in-depth)
    try {
      safePath = resolveSafeSessionPath(config.SESSION_DATA_PATH);
    } catch (err) {
      this.state = STATES.ERROR;
      this.lastError = 'UNSAFE_SESSION_PATH';
      this.isResetting = false;
      logger.error('Session reset aborted: unsafe session data path', { reasonCode: err.code });
      const failError = new Error('Session reset failed: invalid session storage configuration');
      failError.status = 500;
      failError.code = 'UNSAFE_SESSION_PATH';
      throw failError;
    }

    // 8. Purge session storage directory (FAIL-CLOSED)
    if (fs.existsSync(safePath)) {
      try {
        fs.rmSync(safePath, { recursive: true, force: true });
        if (fs.existsSync(safePath)) {
          throw new Error('Directory still present after deletion');
        }
        logger.info('LocalAuth session data directory removed successfully');
      } catch (err) {
        // FAIL-CLOSED: do NOT proceed to re-initialize; mark ERROR and reject
        this.state = STATES.ERROR;
        this.lastError = 'SESSION_PURGE_FAILED';
        this.isResetting = false;
        logger.error('Failed to remove session directory during reset; aborting', {
          reasonCode: 'SESSION_PURGE_FAILED',
        });
        const failError = new Error('Session reset failed: session directory could not be cleared');
        failError.status = 500;
        failError.code = 'RESET_PURGE_FAILED';
        throw failError;
      }
    }

    // 9. Reset internal state variables
    this.qrDataUrl = null;
    this.qrTimestamp = null;
    this.connectedPhone = null;
    this.connectedName = null;
    this.lastError = null;

    // 10. Complete reset and schedule clean re-initialization
    this.isResetting = false;
    setTimeout(() => {
      this.initialize();
    }, 1000);

    return {
      status: 'ok',
      message: 'Session cleared and re-initialization triggered. New QR will be available shortly.',
    };
  }

  /**
   * Get current operational status.
   */
  getStatus() {
    return {
      state: this.state,
      ready: this.state === STATES.READY,
      authenticated: this.state === STATES.AUTHENTICATED || this.state === STATES.READY,
      phone: logger.maskPhone(this.connectedPhone),
      clientName: this.connectedName || null,
      hasQr: Boolean(this.qrDataUrl),
      qrTimestamp: this.qrTimestamp,
      generation: this.sessionGeneration,
      lastError: this.lastError,
    };
  }

  /**
   * Get the active QR data URL if available.
   */
  getQrDataUrl() {
    return this.qrDataUrl;
  }
}

// Export singleton
const whatsAppClientManager = new WhatsAppClientManager();

module.exports = {
  STATES,
  WhatsAppClientManager,
  whatsAppClientManager,
  resolveSafeSessionPath,
};
