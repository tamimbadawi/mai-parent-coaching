const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const config = require('../src/config');
const { messageQueue } = require('../src/queue');
const {
  resolveSafeSessionPath,
  WhatsAppClientManager,
  STATES,
} = require('../src/client');

test('Client Session Safety & Reset Fail-Closed', async (t) => {
  await t.test('resolveSafeSessionPath approves valid relative and subfolder paths', () => {
    const valid = resolveSafeSessionPath('./.wwebjs_auth');
    assert.equal(path.isAbsolute(valid), true);
    assert.equal(path.basename(valid), '.wwebjs_auth');

    const dockerPath = resolveSafeSessionPath('/app/.wwebjs_auth');
    assert.equal(path.basename(dockerPath), '.wwebjs_auth');

    const subfolderPath = resolveSafeSessionPath('./custom/data/.wwebjs_auth');
    assert.equal(path.basename(subfolderPath), '.wwebjs_auth');
  });

  await t.test('resolveSafeSessionPath rejects filesystem root', () => {
    const rootPath = path.parse(process.cwd()).root;
    assert.throws(
      () => resolveSafeSessionPath(rootPath),
      /cannot be filesystem root/
    );
  });

  await t.test('resolveSafeSessionPath rejects protected system directories and system root children', () => {
    assert.throws(
      () => resolveSafeSessionPath('/etc'),
      /basename must be exactly \.wwebjs_auth/
    );
    assert.throws(
      () => resolveSafeSessionPath('/app'),
      /basename must be exactly \.wwebjs_auth/
    );
    assert.throws(
      () => resolveSafeSessionPath('/.wwebjs_auth'),
      /cannot be directly inside protected system directory/
    );
  });

  await t.test('resolveSafeSessionPath rejects non-auth directories like /home/ubuntu and /app/uploads', () => {
    assert.throws(
      () => resolveSafeSessionPath('/home/ubuntu'),
      /basename must be exactly \.wwebjs_auth/
    );
    assert.throws(
      () => resolveSafeSessionPath('/app/uploads'),
      /basename must be exactly \.wwebjs_auth/
    );
    assert.throws(
      () => resolveSafeSessionPath('/var/data'),
      /basename must be exactly \.wwebjs_auth/
    );
    assert.throws(
      () => resolveSafeSessionPath('/tmp/sessions'),
      /basename must be exactly \.wwebjs_auth/
    );
  });

  await t.test('resolveSafeSessionPath rejects symlinked targets and symlinked ancestors', () => {
    const tempTarget = path.resolve(__dirname, '../.test_symlink_target');
    const symlinkDir = path.resolve(__dirname, '../.test_symlink_dir');
    const symlinkAuth = path.join(symlinkDir, '.wwebjs_auth');

    try {
      if (!fs.existsSync(tempTarget)) fs.mkdirSync(tempTarget, { recursive: true });
      if (!fs.existsSync(symlinkDir)) fs.mkdirSync(symlinkDir, { recursive: true });

      const symlinkType = process.platform === 'win32' ? 'junction' : 'dir';
      fs.symlinkSync(tempTarget, symlinkAuth, symlinkType);

      assert.throws(
        () => resolveSafeSessionPath(symlinkAuth),
        (err) => {
          assert.equal(err.code, 'UNSAFE_PATH_SYMLINK');
          assert.match(err.message, /cannot be a symbolic link/);
          return true;
        }
      );
    } finally {
      try {
        if (fs.existsSync(symlinkAuth)) fs.unlinkSync(symlinkAuth);
      } catch {}
      if (fs.existsSync(symlinkDir)) fs.rmSync(symlinkDir, { recursive: true, force: true });
      if (fs.existsSync(tempTarget)) fs.rmSync(tempTarget, { recursive: true, force: true });
    }
  });

  await t.test('resolveSafeSessionPath rejects invalid/empty directory names', () => {
    assert.throws(
      () => resolveSafeSessionPath(''),
      /Invalid session path/
    );
    assert.throws(
      () => resolveSafeSessionPath('.'),
      /directory name is unsafe/
    );
  });

  await t.test('stale events from older generations do not mutate client state', () => {
    const manager = new WhatsAppClientManager();
    manager.sessionGeneration = 1;

    // Simulate dummy client with an emitter
    const listeners = {};
    const mockClient = {
      on(event, fn) {
        listeners[event] = fn;
      },
    };

    // Register events bound to generation 1
    manager.registerEvents(mockClient, 1);

    // Now simulate reset / generation advance to generation 2
    manager.sessionGeneration = 2;
    manager.state = STATES.INITIALIZING;

    // Trigger ready event on mock client from gen 1
    if (listeners.ready) {
      listeners.ready();
    }

    // State should remain INITIALIZING, not READY, because gen 1 event was ignored!
    assert.equal(manager.state, STATES.INITIALIZING);
  });

  await t.test('resetSession clears contents while preserving the mounted session directory', async () => {
    const parentDir = path.resolve(__dirname, '../.test_auth_mounted_reset');
    const testDir = path.join(parentDir, '.wwebjs_auth');
    const sessionDir = path.join(testDir, 'session-mai');
    const outsideCanary = path.join(parentDir, 'outside.txt');
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(path.join(sessionDir, 'session.json'), 'old session');
    fs.writeFileSync(outsideCanary, 'keep');

    const originalPath = config.SESSION_DATA_PATH;
    config.SESSION_DATA_PATH = testDir;
    const manager = new WhatsAppClientManager();
    manager.client = {
      removeAllListeners() {},
      logout: async () => {},
      destroy: async () => {},
    };
    manager.initialize = async () => {};

    try {
      const result = await manager.resetSession();
      assert.equal(result.status, 'ok');
      assert.equal(fs.existsSync(testDir), true, 'volume mount directory must remain');
      assert.deepEqual(fs.readdirSync(testDir), [], 'old session data must be removed');
      assert.equal(fs.readFileSync(outsideCanary, 'utf8'), 'keep');
    } finally {
      config.SESSION_DATA_PATH = originalPath;
      fs.rmSync(parentDir, { recursive: true, force: true });
    }
  });

  await t.test('resetSession fails closed before logout/destroy if path is unsafe (no deletion, no success)', async () => {
    const originalPath = config.SESSION_DATA_PATH;

    try {
      config.SESSION_DATA_PATH = '/home/ubuntu';
      const manager = new WhatsAppClientManager();
      let logoutCalled = false;
      let destroyCalled = false;

      manager.client = {
        logout: async () => { logoutCalled = true; },
        destroy: async () => { destroyCalled = true; },
      };

      await assert.rejects(
        async () => {
          await manager.resetSession();
        },
        (err) => {
          assert.equal(err.code, 'UNSAFE_SESSION_PATH');
          return true;
        }
      );

      // Verify manager enters ERROR state and does not claim ok
      assert.equal(manager.state, STATES.ERROR);
      assert.equal(manager.lastError, 'UNSAFE_SESSION_PATH');

      // CRITICAL: logout and destroy MUST NOT be invoked when path is unsafe!
      assert.equal(logoutCalled, false, 'client.logout() must NOT be called on unsafe path');
      assert.equal(destroyCalled, false, 'client.destroy() must NOT be called on unsafe path');
    } finally {
      config.SESSION_DATA_PATH = originalPath;
    }
  });

  await t.test('resetSession fails closed when client.logout() fails (no deletion, no success)', async () => {
    const parentDir = path.resolve(__dirname, '../.test_auth_logout_fail');
    const testDir = path.join(parentDir, '.wwebjs_auth');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    const canaryFile = path.join(testDir, 'session_canary.txt');
    fs.writeFileSync(canaryFile, 'do_not_delete_if_logout_fails');

    const originalPath = config.SESSION_DATA_PATH;
    config.SESSION_DATA_PATH = testDir;

    const manager = new WhatsAppClientManager();
    manager.client = {
      removeAllListeners() {},
      logout: async () => {
        throw new Error('Forced simulated logout failure');
      },
      destroy: async () => {},
    };

    try {
      await assert.rejects(
        async () => {
          await manager.resetSession();
        },
        (err) => {
          assert.equal(err.code, 'LOGOUT_FAILED');
          return true;
        }
      );

      // Verify state is ERROR and fail-closed
      assert.equal(manager.state, STATES.ERROR);
      assert.equal(manager.lastError, 'LOGOUT_FAILED');

      // CRITICAL: Assert directory and canary file were NOT deleted!
      assert.equal(fs.existsSync(canaryFile), true, 'Canary file should not be deleted on logout failure');
      assert.equal(fs.existsSync(testDir), true, 'Session directory should not be deleted on logout failure');
    } finally {
      config.SESSION_DATA_PATH = originalPath;
      if (fs.existsSync(parentDir)) fs.rmSync(parentDir, { recursive: true, force: true });
    }
  });

  await t.test('resetSession fails closed when client.destroy() fails (no deletion, no success)', async () => {
    const parentDir = path.resolve(__dirname, '../.test_auth_destroy_fail');
    const testDir = path.join(parentDir, '.wwebjs_auth');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    const canaryFile = path.join(testDir, 'session_canary.txt');
    fs.writeFileSync(canaryFile, 'do_not_delete_if_destroy_fails');

    const originalPath = config.SESSION_DATA_PATH;
    config.SESSION_DATA_PATH = testDir;

    const manager = new WhatsAppClientManager();
    manager.client = {
      removeAllListeners() {},
      logout: async () => {}, // logout succeeds
      destroy: async () => {
        throw new Error('Forced simulated destroy failure');
      },
    };

    try {
      await assert.rejects(
        async () => {
          await manager.resetSession();
        },
        (err) => {
          assert.equal(err.code, 'DESTROY_FAILED');
          return true;
        }
      );

      // Verify state is ERROR and fail-closed
      assert.equal(manager.state, STATES.ERROR);
      assert.equal(manager.lastError, 'DESTROY_FAILED');

      // CRITICAL: Assert directory and canary file were NOT deleted!
      assert.equal(fs.existsSync(canaryFile), true, 'Canary file should not be deleted on destroy failure');
      assert.equal(fs.existsSync(testDir), true, 'Session directory should not be deleted on destroy failure');
    } finally {
      config.SESSION_DATA_PATH = originalPath;
      if (fs.existsSync(parentDir)) fs.rmSync(parentDir, { recursive: true, force: true });
    }
  });

  await t.test('resetSession fails closed if in-flight send times out (no deletion, no success)', async () => {
    const parentDir = path.resolve(__dirname, '../.test_auth_send_timeout');
    const testDir = path.join(parentDir, '.wwebjs_auth');
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
    const canaryFile = path.join(testDir, 'session_canary.txt');
    fs.writeFileSync(canaryFile, 'do_not_delete_if_send_hangs');

    const originalPath = config.SESSION_DATA_PATH;
    config.SESSION_DATA_PATH = testDir;

    const manager = new WhatsAppClientManager();
    manager.client = {
      removeAllListeners() {},
      logout: async () => {},
      destroy: async () => {},
    };

    // Simulate an active in-flight network send that never completes within timeout
    messageQueue.isSending = true;
    let cancelHangingSend;
    messageQueue.activeSendPromise = new Promise((resolve) => {
      cancelHangingSend = resolve;
    });

    // Temporarily mock waitForActiveSend to test timeout fail-closed
    const originalWaitForActive = messageQueue.waitForActiveSend;
    messageQueue.waitForActiveSend = async () => {
      const err = new Error('Timed out waiting for active message send to complete');
      err.code = 'ACTIVE_SEND_TIMEOUT';
      throw err;
    };

    try {
      await assert.rejects(
        async () => {
          await manager.resetSession();
        },
        (err) => {
          assert.equal(err.code, 'ACTIVE_SEND_TIMEOUT');
          return true;
        }
      );

      // Verify state is ERROR and fail-closed
      assert.equal(manager.state, STATES.ERROR);
      assert.equal(manager.lastError, 'ACTIVE_SEND_TIMEOUT');

      // CRITICAL: Assert directory and canary file were NOT deleted!
      assert.equal(fs.existsSync(canaryFile), true, 'Canary file should not be deleted on in-flight send timeout');
      assert.equal(fs.existsSync(testDir), true, 'Session directory should not be deleted on in-flight send timeout');
    } finally {
      messageQueue.waitForActiveSend = originalWaitForActive;
      messageQueue.isSending = false;
      messageQueue.activeSendPromise = null;
      if (cancelHangingSend) cancelHangingSend();
      config.SESSION_DATA_PATH = originalPath;
      if (fs.existsSync(parentDir)) fs.rmSync(parentDir, { recursive: true, force: true });
    }
  });
});
