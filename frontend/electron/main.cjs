const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const DEV_PORT = 5173;
// try common loopback names (IPv4, hostname and IPv6)
const DEV_HOSTS = ['127.0.0.1', 'localhost', '::1'];

// format a host into a valid URL host part (bracket IPv6 literals)
function hostForUrl(host) {
  if (host.includes(':') && !host.startsWith('[')) {
    return `[${host}]`;
  }
  return host;
}

const DEV_URLS = DEV_HOSTS.map(h => `http://${hostForUrl(h)}:${DEV_PORT}/`);

// Detect dev mode
const isDev = process.env.NODE_ENV === 'development'
  || process.argv.includes('--dev')
  || process.env.ELECTRON_DEV === '1';

// Force Chromium to use a direct connection (bypass system proxy) for this process.
// This helps if Chromium/Electron net stack is being routed through a system proxy.
app.commandLine.appendSwitch('proxy-server', 'direct://');

// Try a single HTTP GET to the URL
function checkDevUrl(url, timeout = 1000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      const ok = res.statusCode >= 200 && res.statusCode < 400;
      res.resume();
      resolve(ok);
    });
    req.on('error', (err) => {
      // log error for visibility
      console.debug(`checkDevUrl error for ${url}:`, err && err.code ? err.code : err);
      resolve(false);
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Poll each URL repeatedly for up to `maxWaitMs`
async function findWorkingDevUrlWithRetry(maxWaitMs = 5000, intervalMs = 300) {
  const start = Date.now();
  const tried = new Set();

  while (Date.now() - start < maxWaitMs) {
    for (const url of DEV_URLS) {
      if (!tried.has(url)) {
        console.log(`Probing dev server: ${url}`);
      }
      const ok = await checkDevUrl(url, Math.min(1000, intervalMs));
      tried.add(url);
      if (ok) {
        console.log(`Dev server responded at ${url}`);
        return url;
      } else {
        console.log(`No response at ${url}`);
      }
    }
    // wait before retrying
    await new Promise(r => setTimeout(r, intervalMs));
  }

  console.warn(`Dev server not reachable after ${maxWaitMs}ms at any of: ${DEV_URLS.join(', ')}`);
  return null;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true
    }
  });

  if (isDev) {
    console.log('Running in dev mode; attempting to detect Vite dev server...');

    // Allow forcing a dev URL via environment (convenient for the workaround)
    const forcedDevUrl = process.env.DEV_SERVER_URL && process.env.DEV_SERVER_URL.trim();
    const defaultDevUrl = `http://127.0.0.1:${DEV_PORT}/`;

    if (forcedDevUrl) {
      console.log(`DEV_SERVER_URL set, skipping probe and loading: ${forcedDevUrl}`);
      try {
        await win.loadURL(forcedDevUrl);
        win.webContents.openDevTools();
        console.log(`Loaded dev URL: ${forcedDevUrl}`);
        win.once('ready-to-show', () => win.show());
        return;
      } catch (err) {
        console.error('Failed to load forced DEV_SERVER_URL, falling back to probe:', err);
      }
    }

    // Normal probe flow (tries 127.0.0.1, localhost, ::1)
    const devUrl = await findWorkingDevUrlWithRetry(5000, 300); // 5s total, 300ms interval
    if (devUrl) {
      try {
        await win.loadURL(devUrl);
        win.webContents.openDevTools();
        console.log(`Loaded dev URL: ${devUrl}`);
      } catch (err) {
        console.error('Failed to load dev URL after detection, falling back to built index:', err);
        loadBuiltIndex(win);
      }
    } else {
      // Final fallback: try direct IPv4 dev URL once (useful workaround)
      console.log(`Attempting final direct load to ${defaultDevUrl} as a last-ditch workaround`);
      try {
        await win.loadURL(defaultDevUrl);
        win.webContents.openDevTools();
        console.log(`Loaded dev URL (direct): ${defaultDevUrl}`);
      } catch (err) {
        console.error('Failed direct dev URL load, falling back to built index:', err);
        loadBuiltIndex(win);
      }
    }
  } else {
    loadBuiltIndex(win);
  }

  win.once('ready-to-show', () => win.show());
  win.on('closed', () => {});
}

function loadBuiltIndex(win) {
  let buildPath = path.join(__dirname, '..', 'dist', 'index.html');
  if (!fs.existsSync(buildPath)) {
    buildPath = path.join(__dirname, '..', 'dist', 'public', 'index.html');
  }

  if (fs.existsSync(buildPath)) {
    console.log('Loading built index:', buildPath);
    win.loadFile(buildPath).catch((err) => {
      console.error('Error loading built index.html:', buildPath, err);
      win.loadURL('about:blank');
    });
  } else {
    console.error('No built index.html found at expected locations. Expected', buildPath);
    win.loadURL('about:blank');
  }
}

// Single instance lock
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {});

  app.whenReady().then(createWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}