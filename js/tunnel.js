const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROVIDER_TIMEOUT = 25000;

let tunnelInstance = null;
let currentUrl = null;
let currentProviderName = null;

function wrapTunnel(url, closeFn) {
  const cbs = { close: [], error: [] };
  let closed = false;
  const obj = {
    url,
    close: () => {
      if (closed) return;
      closed = true;
      closeFn();
      cbs.close.slice().forEach((fn) => fn());
    },
    onClose: (cb) => cbs.close.push(cb),
    onError: (cb) => cbs.error.push(cb),
  };
  obj._fireClose = () => {
    if (closed) return;
    closed = true;
    cbs.close.slice().forEach((fn) => fn());
  };
  obj._fireError = (err) => {
    cbs.error.slice().forEach((fn) => fn(err));
  };
  return obj;
}

const cancelRegistry = [];

function cancelAllInFlight() {
  const handlers = cancelRegistry.splice(0);
  handlers.forEach((fn) => fn());
}

function cleanupHandler(handler) {
  const idx = cancelRegistry.indexOf(handler);
  if (idx !== -1) cancelRegistry.splice(idx, 1);
}

function registerCancel(handler) {
  cancelRegistry.push(handler);
  return () => cleanupHandler(handler);
}

async function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms),
    ),
  ]);
}

function getCloudflaredPath() {
  const possiblePaths = [
    'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe',
    'C:\\Program Files\\cloudflared\\cloudflared.exe',
    path.join(
      process.env.LOCALAPPDATA || '',
      'Microsoft',
      'WinGet',
      'Links',
      'cloudflared.exe',
    ),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'cloudflared';
}

// ─── cloudflared provider ───────────────────────────────────────────────────

function tryCloudflared(port) {
  return new Promise((resolve, reject) => {
    const binPath = getCloudflaredPath();
    console.log(`[LS] Launching cloudflared using: ${binPath}`);
    const child = spawn(
      binPath,
      ['tunnel', '--url', `http://localhost:${port}`, '--no-autoupdate'],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let resolved = false;
    let buffer = '';

    const unreg = registerCancel(() => {
      if (resolved) return;
      resolved = true;
      try {
        child.kill('SIGTERM');
      } catch (_) {}
      reject(new Error('cancelled'));
    });

    function onOutput(data) {
      if (resolved) return;
      buffer += data.toString();
      const m = buffer.match(
        /https:\/\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.trycloudflare\.com/,
      );
      if (m) {
        resolved = true;
        unreg();
        child.stdout.removeAllListeners('data');
        child.stderr.removeAllListeners('data');
        const tw = wrapTunnel(m[0], () => child.kill('SIGTERM'));
        child.on('exit', () => tw._fireClose());
        child.on('error', (err) => tw._fireError(err));
        resolve(tw);
      }
    }

    child.stdout.on('data', onOutput);
    child.stderr.on('data', onOutput);

    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        unreg();
        reject(err);
      }
    });

    child.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        unreg();
        reject(new Error(`cloudflared exited with code ${code}`));
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unreg();
        try {
          child.kill('SIGTERM');
        } catch (_) {}
        reject(new Error('cloudflared timed out'));
      }
    }, PROVIDER_TIMEOUT);
  });
}

// ─── localhost.run provider (SSH) ─────────────────────────────────────────

function tryLocalhostRun(port) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'ssh',
      [
        '-o',
        'StrictHostKeyChecking=no',
        '-o',
        'ServerAliveInterval=30',
        '-R',
        `80:localhost:${port}`,
        'nokey@localhost.run',
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    let resolved = false;
    let buffer = '';

    const unreg = registerCancel(() => {
      if (resolved) return;
      resolved = true;
      try {
        child.kill('SIGTERM');
      } catch (_) {}
      reject(new Error('cancelled'));
    });

    function onOutput(data) {
      if (resolved) return;
      buffer += data.toString();
      const m = buffer.match(
        /https:\/\/[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.lhr\.life/,
      );
      if (m) {
        resolved = true;
        unreg();
        child.stdout.removeAllListeners('data');
        child.stderr.removeAllListeners('data');
        const tw = wrapTunnel(m[0], () => child.kill('SIGTERM'));
        child.on('exit', () => tw._fireClose());
        child.on('error', (err) => tw._fireError(err));
        resolve(tw);
      }
    }

    child.stdout.on('data', onOutput);
    child.stderr.on('data', onOutput);

    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        unreg();
        reject(err);
      }
    });

    child.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        unreg();
        reject(new Error(`ssh exited with code ${code}`));
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        unreg();
        try {
          child.kill('SIGTERM');
        } catch (_) {}
        reject(new Error('localhost.run timed out'));
      }
    }, PROVIDER_TIMEOUT);
  });
}

// ─── main public methods ───────────────────────────────────────────────────

async function startCloudflareTunnel(port) {
  stopTunnel();
  console.log('[LS] Starting Cloudflare Tunnel (TryCloudflare)...');
  try {
    const instance = await withTimeout(tryCloudflared(port), PROVIDER_TIMEOUT);
    cancelAllInFlight();

    currentUrl = instance.url;
    tunnelInstance = instance;
    currentProviderName = 'cloudflared';

    instance.onClose(() => {
      console.log('[LS] Cloudflare Tunnel closed');
      tunnelInstance = null;
      currentUrl = null;
      currentProviderName = null;
    });

    instance.onError((err) => {
      console.error('[LS] Cloudflare Tunnel error:', err);
    });

    console.log(`[LS] Cloudflare Tunnel started: ${currentUrl}`);
    return { url: currentUrl, errors: [] };
  } catch (e) {
    cancelAllInFlight();
    const msg = `Cloudflare: ${e.message || e}`;
    console.warn(`[LS] Cloudflare tunnel failed: ${msg}`);
    return { url: null, errors: [msg] };
  }
}

async function startSSHTunnel(port) {
  stopTunnel();
  console.log('[LS] Starting Windows SSH tunnel (localhost.run)...');
  try {
    const instance = await withTimeout(tryLocalhostRun(port), PROVIDER_TIMEOUT);
    cancelAllInFlight();

    currentUrl = instance.url;
    tunnelInstance = instance;
    currentProviderName = 'localhost.run';

    instance.onClose(() => {
      console.log('[LS] SSH Tunnel closed');
      tunnelInstance = null;
      currentUrl = null;
      currentProviderName = null;
    });

    instance.onError((err) => {
      console.error('[LS] SSH Tunnel error:', err);
    });

    console.log(`[LS] SSH Tunnel started: ${currentUrl}`);
    return { url: currentUrl, errors: [] };
  } catch (e) {
    cancelAllInFlight();
    const msg = `SSH: ${e.message || e}`;
    console.warn(`[LS] SSH tunnel failed: ${msg}`);
    return { url: null, errors: [msg] };
  }
}

const PROVIDERS = [
  { name: 'cloudflared', fn: tryCloudflared },
  { name: 'localhost.run', fn: tryLocalhostRun },
];

async function startTunnel(port) {
  stopTunnel();
  const errors = [];

  for (const provider of PROVIDERS) {
    console.log(`[LS] Tunnel: trying ${provider.name}...`);
    try {
      const instance = await withTimeout(provider.fn(port), PROVIDER_TIMEOUT);

      cancelAllInFlight();

      currentUrl = instance.url;
      tunnelInstance = instance;
      currentProviderName = provider.name;

      instance.onClose(() => {
        console.log(`[LS] Tunnel closed (${provider.name})`);
        tunnelInstance = null;
        currentUrl = null;
        currentProviderName = null;
      });

      instance.onError((err) => {
        console.error(`[LS] Tunnel error (${provider.name}):`, err);
      });

      console.log(`[LS] Tunnel started via ${provider.name}: ${currentUrl}`);
      return { url: currentUrl, errors: [] };
    } catch (e) {
      cancelAllInFlight();
      const msg = `${provider.name}: ${e.message || e}`;
      errors.push(msg);
      console.warn(
        `[LS] Tunnel provider ${provider.name} failed: ${e.message || e}`,
      );
    }
  }

  console.error('[LS] All tunnel providers failed');
  return { url: null, errors };
}

function getTunnelUrl() {
  return currentUrl;
}

function stopTunnel() {
  cancelAllInFlight();
  if (tunnelInstance) {
    try {
      tunnelInstance.close();
    } catch (e) {
      console.error('[LS] Error closing tunnel:', e);
    }
    tunnelInstance = null;
    currentUrl = null;
    currentProviderName = null;
  }
}

module.exports = {
  startCloudflareTunnel,
  startSSHTunnel,
  startTunnel,
  getTunnelUrl,
  stopTunnel,
  getCloudflaredPath,
};
