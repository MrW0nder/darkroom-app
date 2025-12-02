const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const DEV_PORT = 5173;
// try both common loopback names (IPv4 and IPv6)
const DEV_HOSTS = ['127.0.0.1', 'localhost', '::1'];
const DEV_URLS = DEV_HOSTS.map(h => `http://${h}:${DEV_PORT}/`);

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev') || process.env.ELECTRON_DEV === '1';

function checkDevUrl(url, timeout = 1000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      // consider any 2xx-3xx response as "up"
      const ok = res.statusCode >= 200 && res.statusCode < 400;
      res.resume();
      resolve(ok);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function findWorkingDevUrl() {
  for (const url of DEV_URLS) {
    try {
      const ok = await checkDevUrl(url);
      if (ok) return url;
    } catch (e) {
      // continue to next
    }
  }
  return null;
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  if (isDev) {
    const devUrl = await findWorkingDevUrl();
    if (devUrl) {
      try {
        await win.loadURL(devUrl);
        win.webContents.openDevTools();
      } catch (err) {
        console.error('Failed to load dev URL, falling back to built index:', err);
        loadBuiltIndex(win);
      }
    } else {
      console.warn(`Dev server not reachable at any of: ${DEV_URLS.join(', ')}, loading built files instead.`);
      loadBuiltIndex(win);
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
  app.on('second-instance', () => {
    // Optional: focus existing window
  });

  app.whenReady().then(createWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}