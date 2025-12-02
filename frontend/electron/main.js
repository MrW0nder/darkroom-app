const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev') || process.env.ELECTRON_DEV === '1';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // avoid white flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  if (isDev) {
    // Dev: load Vite dev server
    const devUrl = 'http://localhost:5173';
    win.loadURL(devUrl).catch((err) => {
      console.error('Failed to load dev server at', devUrl, err);
      // fallback to built file if available
      loadBuiltIndex(win);
    });
    win.webContents.openDevTools();
  } else {
    // Prod: load built index.html
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

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to open another instance — focus main window if needed.
  });

  app.whenReady().then(createWindow);

  app.on('activate', () => {
    // macOS: recreate window when dock icon is clicked and there are no other windows
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}