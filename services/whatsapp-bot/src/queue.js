/**
 * Bounded Message Queue & Anti-Ban Rate Limiter with Generation Control.
 *
 * Contract:
 * - Serialized delivery with randomized human-like jitter (3-8 seconds).
 * - Returns a Promise settling ONLY after whatsapp-web.js sendMessage resolves.
 * - Resolves with the actual serialized message ID from WhatsApp.
 * - A resolved send without a message ID is reported as submitted with
 *   unconfirmed delivery; callers must not automatically retry.
 * - Catches synchronous and asynchronous sendMessage throws identically.
 * - Removes jobs strictly by identity; timing out during jitter sleep never drops adjacent jobs.
 * - PRIVACY: Serialized message ID is returned to the HTTP response, but NEVER logged.
 * - On failure: Rejects with generic non-2xx and sanitized reason code.
 * - On bounded timeout: Rejects with status 504 and code DELIVERY_OUTCOME_UNKNOWN.
 * - On reset/clear: Rejects all waiting callers immediately so no promise hangs.
 */

const crypto = require('crypto');
const config = require('./config');
const logger = require('./logger');

class MessageQueue {
  constructor(options = {}) {
    this.maxSize = options.maxSize || config.QUEUE_MAX_SIZE;
    this.minDelayMs = options.minDelayMs !== undefined ? options.minDelayMs : config.RATE_LIMIT_MIN_MS;
    this.maxDelayMs = options.maxDelayMs !== undefined ? options.maxDelayMs : config.RATE_LIMIT_MAX_MS;
    this.defaultTimeoutMs = options.defaultTimeoutMs || 30000;

    this.queue = [];
    this.isProcessing = false;
    this.isSending = false;
    this.activeSendPromise = null;
    this.generation = 0;
    this.currentSleepAbort = null;
    this.totalProcessed = 0;
    this.totalFailed = 0;
    this.totalUnconfirmed = 0;
    this.client = null;
  }

  /**
   * Set active WhatsApp client instance.
   * @param {object} client
   */
  setClient(client) {
    this.client = client;
  }

  /**
   * Update delay parameters (useful for tests or environment overrides).
   */
  setDelays(minMs, maxMs) {
    this.minDelayMs = minMs;
    this.maxDelayMs = maxMs;
  }

  /**
   * Calculate random jitter delay between minDelayMs and maxDelayMs.
   */
  getRandomDelay() {
    return Math.floor(Math.random() * (this.maxDelayMs - this.minDelayMs + 1)) + this.minDelayMs;
  }

  /**
   * Safely remove a specific job by identity from the queue.
   * Prevents accidental removal of subsequent jobs if a job timed out.
   */
  removeJob(job) {
    if (!job) return;
    const idx = this.queue.indexOf(job);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
    }
  }

  /**
   * Enqueue a message for delivery and return a Promise settling only when sent.
   *
   * @param {object} param0
   * @param {string} param0.to Cleaned WhatsApp recipient ID (e.g., "966501234567@c.us")
   * @param {string} param0.text Formatted message text
   * @param {number} [param0.timeoutMs] Optional bounded timeout in ms
   * @returns {Promise<object>} Resolves with { success: true, status: 'sent', messageId, jobId }
   */
  enqueue({ to, text, timeoutMs }) {
    if (this.queue.length >= this.maxSize) {
      const error = new Error(`Message queue is full (max: ${this.maxSize}). Try again later.`);
      error.status = 429;
      error.code = 'QUEUE_FULL';
      return Promise.reject(error);
    }

    const jobId = `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const effectiveTimeout = timeoutMs || this.defaultTimeoutMs;

    return new Promise((resolve, reject) => {
      const job = {
        jobId,
        to,
        text,
        generation: this.generation,
        enqueuedAt: new Date(),
        resolve,
        reject,
        settled: false,
        timeoutTimer: null,
      };

      // Set bounded timeout to detect unknown delivery outcome
      job.timeoutTimer = setTimeout(() => {
        if (!job.settled) {
          job.settled = true;
          // Identity-based removal only
          this.removeJob(job);
          const timeoutErr = new Error('Message dispatch timed out; delivery outcome unknown. Do not blindly retry.');
          timeoutErr.status = 504;
          timeoutErr.code = 'DELIVERY_OUTCOME_UNKNOWN';
          job.reject(timeoutErr);
        }
      }, effectiveTimeout);

      this.queue.push(job);
      logger.info(`Message enqueued`, { jobId, queueLength: this.queue.length, generation: this.generation });

      // Trigger queue worker if idle
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Internal queue processing loop with rate limiting jitter and generation checks.
   */
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    const currentGen = this.generation;

    try {
      while (this.queue.length > 0) {
        // Generation guard: abort if session was reset or queue cleared
        if (this.generation !== currentGen) {
          logger.info('Queue worker detected generation change; aborting stale loop', {
            workerGen: currentGen,
            activeGen: this.generation,
          });
          break;
        }

        const currentJob = this.queue[0];
        const { jobId, to, text, generation: jobGen } = currentJob;

        // Discard already settled or timed out jobs strictly by identity
        if (currentJob.settled) {
          this.removeJob(currentJob);
          continue;
        }

        // Discard jobs from older generations
        if (jobGen !== this.generation) {
          logger.info('Discarding job from prior session generation', { jobId, jobGen, activeGen: this.generation });
          if (!currentJob.settled) {
            currentJob.settled = true;
            if (currentJob.timeoutTimer) clearTimeout(currentJob.timeoutTimer);
            const cancelErr = new Error('Message dispatch cancelled due to session reset');
            cancelErr.status = 503;
            cancelErr.code = 'SESSION_RESET_CANCELLED';
            currentJob.reject(cancelErr);
          }
          this.removeJob(currentJob);
          continue;
        }

        // Verify client availability
        if (!this.client || typeof this.client.sendMessage !== 'function') {
          logger.warn(`WhatsApp client is not available to dispatch message`, { jobId });
          if (!currentJob.settled) {
            currentJob.settled = true;
            if (currentJob.timeoutTimer) clearTimeout(currentJob.timeoutTimer);
            const clientErr = new Error('WhatsApp client is not ready to send messages');
            clientErr.status = 503;
            clientErr.code = 'CLIENT_NOT_READY';
            currentJob.reject(clientErr);
          }
          this.removeJob(currentJob);
          continue;
        }

        // Interruptible randomized human-like delay between outbound messages
        const delay = this.getRandomDelay();
        logger.debug(`Applying anti-flood delay before sending`, { jobId, delayMs: delay });

        let wasAborted = false;
        await new Promise((resolve) => {
          const timer = setTimeout(() => {
            this.currentSleepAbort = null;
            resolve();
          }, delay);

          this.currentSleepAbort = () => {
            clearTimeout(timer);
            wasAborted = true;
            resolve();
          };
        });

        // Verify generation after delay
        if (wasAborted || this.generation !== currentGen) {
          logger.info('In-flight delay aborted by reset', { jobId });
          break;
        }

        // Check if job settled (e.g., timed out) during jitter delay.
        // Identity-based removal ensures subsequent jobs in queue are NOT deleted!
        if (currentJob.settled) {
          this.removeJob(currentJob);
          continue;
        }

        // Verify client again before invoking network dispatch
        if (!this.client || typeof this.client.sendMessage !== 'function') {
          logger.warn('WhatsApp client became unavailable during jitter delay', { jobId });
          if (!currentJob.settled) {
            currentJob.settled = true;
            if (currentJob.timeoutTimer) clearTimeout(currentJob.timeoutTimer);
            const clientErr = new Error('WhatsApp client is not ready to send messages');
            clientErr.status = 503;
            clientErr.code = 'CLIENT_NOT_READY';
            currentJob.reject(clientErr);
          }
          this.removeJob(currentJob);
          continue;
        }

        // Dispatch message and track active send.
        // Wrap invocation inside try/catch to handle synchronous AND asynchronous errors identically!
        this.isSending = true;

        try {
          const sendPromise = Promise.resolve().then(() => this.client.sendMessage(to, text));
          this.activeSendPromise = sendPromise;

          const result = await sendPromise;
          this.totalProcessed++;

          // Extract serialized message ID; forbid fake placeholder values or empty/whitespace strings
          let rawId = null;
          if (typeof result?.id?._serialized === 'string') {
            rawId = result.id._serialized;
          } else if (typeof result?.id?.id === 'string') {
            rawId = result.id.id;
          } else if (typeof result?.id === 'string') {
            rawId = result.id;
          }

          const serializedId = (rawId && rawId.trim().length > 0) ? rawId.trim() : null;

          if (!serializedId) {
            this.totalUnconfirmed++;
            logger.warn('WhatsApp send resolved without a confirmable message ID', {
              jobId,
              reasonCode: 'MISSING_MESSAGE_ID',
            });

            if (!currentJob.settled) {
              currentJob.settled = true;
              if (currentJob.timeoutTimer) clearTimeout(currentJob.timeoutTimer);
              currentJob.resolve({
                success: true,
                status: 'submitted',
                deliveryConfirmed: false,
                messageId: null,
                jobId,
              });
            }
          } else {
            // PRIVACY RULE: Log only non-sensitive operational metadata (NEVER log messageId!)
            logger.info(`Message successfully dispatched`, {
              jobId,
              remainingQueue: Math.max(0, this.queue.length - 1),
            });

            if (!currentJob.settled) {
              currentJob.settled = true;
              if (currentJob.timeoutTimer) clearTimeout(currentJob.timeoutTimer);
              currentJob.resolve({
                success: true,
                status: 'sent',
                messageId: serializedId,
                jobId,
              });
            }
          }
        } catch (err) {
          this.totalFailed++;
          logger.error(`Failed to dispatch message`, {
            jobId,
            reasonCode: 'SEND_MESSAGE_FAILED',
            errorCode: err?.code || 'UNKNOWN',
          });

          if (!currentJob.settled) {
            currentJob.settled = true;
            if (currentJob.timeoutTimer) clearTimeout(currentJob.timeoutTimer);
            const sendErr = new Error('Failed to dispatch WhatsApp message');
            sendErr.status = 502;
            sendErr.code = 'SEND_MESSAGE_FAILED';
            currentJob.reject(sendErr);
          }
        } finally {
          this.isSending = false;
          this.activeSendPromise = null;
          this.removeJob(currentJob);
        }
      }
    } finally {
      this.isProcessing = false;
      this.currentSleepAbort = null;

      // If new jobs arrived for a newer generation while unwinding, start processing them
      if (this.queue.length > 0 && this.generation !== currentGen) {
        this.processQueue();
      }
    }
  }

  /**
   * Wait for any currently active in-flight send to complete, bounded by a timeout.
   * Enables resetSession to fail closed if an active send is hanging.
   *
   * @param {number} timeoutMs
   */
  async waitForActiveSend(timeoutMs = 5000) {
    if (!this.isSending || !this.activeSendPromise) {
      return;
    }

    logger.info('Active message send in progress; waiting for completion before proceeding...', {
      timeoutMs,
    });

    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => {
        const err = new Error('Timed out waiting for active message send to complete');
        err.code = 'ACTIVE_SEND_TIMEOUT';
        reject(err);
      }, timeoutMs);
    });

    try {
      await Promise.race([
        Promise.resolve(this.activeSendPromise).catch(() => {}),
        timeoutPromise,
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Get queue health and operational metrics.
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      isSending: this.isSending,
      generation: this.generation,
      totalProcessed: this.totalProcessed,
      totalFailed: this.totalFailed,
      totalUnconfirmed: this.totalUnconfirmed,
      maxSize: this.maxSize,
    };
  }

  /**
   * Settle all waiting callers, cancel in-flight operations, and safely empty the queue.
   */
  clear() {
    const clearedCount = this.queue.length;
    this.generation++;

    // Settle all waiting callers immediately so no promise hangs!
    const pendingJobs = this.queue.splice(0, this.queue.length);
    for (const job of pendingJobs) {
      if (!job.settled) {
        job.settled = true;
        if (job.timeoutTimer) clearTimeout(job.timeoutTimer);
        const cancelErr = new Error('Message dispatch cancelled due to session reset');
        cancelErr.status = 503;
        cancelErr.code = 'SESSION_RESET_CANCELLED';
        job.reject(cancelErr);
      }
    }

    // Abort active sleep if worker is currently in jitter delay
    if (this.currentSleepAbort) {
      this.currentSleepAbort();
      this.currentSleepAbort = null;
    }

    logger.info(`Message queue cleared and generation incremented`, {
      clearedCount,
      newGeneration: this.generation,
    });
  }
}

// Export singleton instance
const messageQueue = new MessageQueue();

module.exports = {
  MessageQueue,
  messageQueue,
};
