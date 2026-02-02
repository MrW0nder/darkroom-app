const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, whitelist-based API to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, ...args) => {
    const validChannels = ['toMain']; // add allowed channel names here
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },
  on: (channel, listener) => {
    const validChannels = ['fromMain']; // add allowed channels here
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => listener(...args));
    }
  },
  invoke: (channel, ...args) => {
    const validChannels = ['invokeMain']; // add allowed invoke channels here
    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error('Channel not allowed'));
  }
});