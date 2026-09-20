const test = require('node:test');
const assert = require('node:assert/strict');
const { MessageQueue } = require('../src/queue');

test('MessageQueue and Anti-Flood Limiter', async (t) => {
  await t.test('enqueues messages and resolves with actual serialized messageId only when sent', async () => {
    const queue = new MessageQueue({ maxSize: 10, minDelayMs: 10, maxDelayMs: 20 });
    const mockClient = {
      sendMessage: async () => ({ id: { _serialized: 'true_966501234567@c.us_3EB0123456789' } }),
    };
    queue.setClient(mockClient);

    const result = await queue.enqueue({ to: '966501234567@c.us', text: 'Test message 1' });

    assert.equal(result.success, true);
    assert.equal(result.status, 'sent');
    assert.equal(result.messageId, 'true_966501234567@c.us_3EB0123456789');
    assert.match(result.jobId, /^msg_/);
  });

  await t.test('rejects enqueuing when queue exceeds maxSize (bounded limit)', async () => {
    const queue = new MessageQueue({ maxSize: 1, minDelayMs: 200, maxDelayMs: 300 });
    queue.setClient({ sendMessage: async () => new Promise(() => {}) });

    // Enqueue first item (starts processing/sleeping)
    queue.enqueue({ to: '966501234567@c.us', text: 'Msg 1' }).catch(() => {});

    // Second item exceeds max size
    await assert.rejects(
      () => queue.enqueue({ to: '966501234567@c.us', text: 'Msg 2' }),
      (err) => {
        assert.equal(err.status, 429);
        assert.equal(err.code, 'QUEUE_FULL');
        return true;
      }
    );

    queue.clear();
  });

  await t.test('computes random jitter delay within bounds', () => {
    const queue = new MessageQueue({ minDelayMs: 3000, maxDelayMs: 8000 });
    for (let i = 0; i < 20; i++) {
      const delay = queue.getRandomDelay();
      assert.ok(delay >= 3000, `Delay ${delay} is below 3000ms`);
      assert.ok(delay <= 8000, `Delay ${delay} exceeds 8000ms`);
    }
  });

  await t.test('getStatus reports queue metrics and generation accurately', () => {
    const queue = new MessageQueue({ maxSize: 50 });
    const status = queue.getStatus();
    assert.equal(status.queueLength, 0);
    assert.equal(status.maxSize, 50);
    assert.equal(typeof status.isProcessing, 'boolean');
    assert.equal(typeof status.isSending, 'boolean');
    assert.equal(typeof status.generation, 'number');
  });

  await t.test('no premature success response occurs during jitter delay', async () => {
    const queue = new MessageQueue({ maxSize: 10, minDelayMs: 120, maxDelayMs: 180 });
    let sendExecuted = false;
    let promiseResolved = false;

    queue.setClient({
      sendMessage: async () => {
        sendExecuted = true;
        return { id: { _serialized: 'real_send_id_999' } };
      },
    });

    const sendPromise = queue.enqueue({ to: '966501234567@c.us', text: 'Delay check' }).then((res) => {
      promiseResolved = true;
      return res;
    });

    // Check at 40ms (jitter delay is at least 120ms)
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(sendExecuted, false, 'sendMessage should not execute before delay');
    assert.equal(promiseResolved, false, 'enqueue promise must NOT resolve prematurely before send');

    const result = await sendPromise;
    assert.equal(promiseResolved, true);
    assert.equal(sendExecuted, true);
    assert.equal(result.messageId, 'real_send_id_999');
  });

  await t.test('send failure rejects waiting caller with non-2xx code and does not claim success', async () => {
    const queue = new MessageQueue({ maxSize: 10, minDelayMs: 10, maxDelayMs: 20 });
    queue.setClient({
      sendMessage: async () => {
        throw new Error('Connection closed by remote WhatsApp server');
      },
    });

    await assert.rejects(
      () => queue.enqueue({ to: '966501234567@c.us', text: 'Should fail' }),
      (err) => {
        assert.equal(err.status, 502);
        assert.equal(err.code, 'SEND_MESSAGE_FAILED');
        return true;
      }
    );
  });

  await t.test('bounded timeout rejects with 504 DELIVERY_OUTCOME_UNKNOWN', async () => {
    const queue = new MessageQueue({ maxSize: 10, minDelayMs: 200, maxDelayMs: 300 });
    queue.setClient({
      sendMessage: async () => new Promise((resolve) => setTimeout(resolve, 500)),
    });

    await assert.rejects(
      () => queue.enqueue({ to: '966501234567@c.us', text: 'Timeout test', timeoutMs: 50 }),
      (err) => {
        assert.equal(err.status, 504);
        assert.equal(err.code, 'DELIVERY_OUTCOME_UNKNOWN');
        assert.match(err.message, /Do not blindly retry/);
        return true;
      }
    );

    queue.clear();
  });

  await t.test('clear() immediately rejects all waiting callers so no promise hangs', async () => {
    const queue = new MessageQueue({ maxSize: 10, minDelayMs: 300, maxDelayMs: 500 });
    queue.setClient({ sendMessage: async () => ({ id: { _serialized: 'id_1' } }) });

    let p1Settled = false;
    let p2Settled = false;

    const p1 = queue.enqueue({ to: '966501234567@c.us', text: 'M1' }).catch((err) => {
      p1Settled = true;
      assert.equal(err.status, 503);
      assert.equal(err.code, 'SESSION_RESET_CANCELLED');
    });

    const p2 = queue.enqueue({ to: '966501234567@c.us', text: 'M2' }).catch((err) => {
      p2Settled = true;
      assert.equal(err.status, 503);
      assert.equal(err.code, 'SESSION_RESET_CANCELLED');
    });

    // Clear queue while jobs are waiting
    await new Promise((r) => setTimeout(r, 30));
    queue.clear();

    await Promise.all([p1, p2]);
    assert.equal(p1Settled, true, 'Job 1 promise must settle upon clear()');
    assert.equal(p2Settled, true, 'Job 2 promise must settle upon clear()');
    assert.equal(queue.getStatus().queueLength, 0);
  });

  await t.test('synchronous throw in sendMessage is caught identically to async failure and does not stop processing', async () => {
    const queue = new MessageQueue({ maxSize: 10, minDelayMs: 10, maxDelayMs: 20 });
    let syncCallCount = 0;

    // Client that throws synchronously (not a rejected promise, but a raw sync throw)
    queue.setClient({
      sendMessage: () => {
        syncCallCount++;
        throw new TypeError('Synchronous exception from WhatsApp client');
      },
    });

    const startTime = Date.now();
    await assert.rejects(
      () => queue.enqueue({ to: '966501234567@c.us', text: 'Sync throw test', timeoutMs: 3000 }),
      (err) => {
        assert.equal(err.status, 502);
        assert.equal(err.code, 'SEND_MESSAGE_FAILED');
        assert.equal(err.message, 'Failed to dispatch WhatsApp message');
        return true;
      }
    );

    const elapsed = Date.now() - startTime;
    assert.ok(elapsed < 500, `Synchronous throw must reject immediately, not hang until timeout (took ${elapsed}ms)`);
    assert.equal(syncCallCount, 1);

    // Verify queue processing is not stopped: subsequent message can be enqueued and delivered
    queue.setClient({
      sendMessage: async () => ({ id: { _serialized: 'subsequent_msg_id_123' } }),
    });

    const nextResult = await queue.enqueue({ to: '966501234567@c.us', text: 'Subsequent message' });
    assert.equal(nextResult.success, true);
    assert.equal(nextResult.messageId, 'subsequent_msg_id_123');
  });

  await t.test('two queued jobs where first times out during jitter delay and second is still delivered', async () => {
    const queue = new MessageQueue({ maxSize: 10, minDelayMs: 60, maxDelayMs: 80 });
    const dispatchedMessages = [];

    queue.setClient({
      sendMessage: async (to, text) => {
        dispatchedMessages.push(text);
        return { id: { _serialized: `delivered_${text}` } };
      },
    });

    // Enqueue Job 1 with short timeout (25ms) so it times out during the 60-80ms jitter delay
    const job1Promise = queue.enqueue({ to: '966501234567@c.us', text: 'job1', timeoutMs: 25 });

    // Enqueue Job 2 immediately after with normal timeout
    const job2Promise = queue.enqueue({ to: '966501234567@c.us', text: 'job2', timeoutMs: 2000 });

    // Job 1 must reject with 504 DELIVERY_OUTCOME_UNKNOWN due to timeout during jitter delay
    await assert.rejects(
      job1Promise,
      (err) => {
        assert.equal(err.status, 504);
        assert.equal(err.code, 'DELIVERY_OUTCOME_UNKNOWN');
        assert.match(err.message, /Do not blindly retry/);
        return true;
      }
    );

    // Job 2 must NOT be shifted out or dropped; it must be delivered after Job 1 delay
    const job2Result = await job2Promise;
    assert.equal(job2Result.success, true);
    assert.equal(job2Result.status, 'sent');
    assert.equal(job2Result.messageId, 'delivered_job2');

    // Confirm that only job2 reached the mock client
    assert.deepEqual(dispatchedMessages, ['job2']);
    assert.equal(queue.getStatus().queueLength, 0);
  });

  await t.test('missing or empty messageId from WhatsApp is treated as DELIVERY_OUTCOME_UNKNOWN (502)', async () => {
    const queue = new MessageQueue({ maxSize: 10, minDelayMs: 10, maxDelayMs: 20 });

    // Client returning no ID at all
    queue.setClient({
      sendMessage: async () => ({ id: null }),
    });

    await assert.rejects(
      () => queue.enqueue({ to: '966501234567@c.us', text: 'No ID test' }),
      (err) => {
        assert.equal(err.status, 502);
        assert.equal(err.code, 'DELIVERY_OUTCOME_UNKNOWN');
        assert.match(err.message, /unconfirmed message ID; delivery outcome unknown\. Do not blindly retry/);
        return true;
      }
    );

    // Client returning empty serialized string
    queue.setClient({
      sendMessage: async () => ({ id: { _serialized: '   ' } }),
    });

    await assert.rejects(
      () => queue.enqueue({ to: '966501234567@c.us', text: 'Empty ID test' }),
      (err) => {
        assert.equal(err.status, 502);
        assert.equal(err.code, 'DELIVERY_OUTCOME_UNKNOWN');
        return true;
      }
    );
  });
});
