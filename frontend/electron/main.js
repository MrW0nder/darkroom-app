const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  // Sometimes, Vite outputs to dist/index.html instead of dist/public/index.html
  // Let's check for both locations to be safe
  let buildPath = path.join(__dirname, '..', 'dist', 'index.html');
  if (!fs.existsSync(buildPath)) {
    buildPath = path.join(__dirname, '..', 'dist', 'public', 'index.html');
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  });

  win.loadFile(buildPath);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});