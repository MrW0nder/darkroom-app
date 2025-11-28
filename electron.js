// electron.js
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const isDev = require('electron-is-dev');

let mainWindow;

// On Windows set AppUserModelId for notifications / taskbar behavior
if (process.platform === 'win32') {
  app.setAppUserModelId('com.darkroom.app');
}

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus existing window if the user tries to open another instance
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1a1a1a',
    show: false, // hide until ready to avoid visual flash
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webviewTag: false,
      // devTools left default (devTools allowed in development only below)
    },
  });

  const startURL = isDev
    ? 'http://localhost:5173'
    : pathToFileURL(path.join(__dirname, 'dist', 'index.html')).href;

  mainWindow.loadURL(startURL).catch((err) => {
    console.error('Failed to load URL:', err);
  });

  // Show when ready to avoid blank white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // Prevent the app from navigating the main window to unexpected locations
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow navigation only to app startURL in production/dev environment
    if (url !== startURL) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Handle attempts to open new windows (e.g., window.open / target="_blank")
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open any external link in the OS default browser
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Basic process-level error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception in main process:', err);
  // Optionally: write to a crash log or show a dialog
});
