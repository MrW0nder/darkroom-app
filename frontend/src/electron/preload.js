const { contextBridge, ipcRenderer } = require('electron');

/**
 * A small, explicit, and safe API exposed to renderer code.
 * - Prefer file paths for large images to avoid massive structured-clone IPC overhead.
 * - For in-memory buffers, use ArrayBuffer and keep sizes reasonable.
 * - All inputs must be validated again in the main process.
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // Process an image by file path. Returns a Promise resolved with the result or an error.
  processImage: async (filePath, options = {}) => {
    if (typeof filePath !== 'string') {
      throw new Error('processImage expects a file path string as the first argument');
    }
    return ipcRenderer.invoke('process-image', { filePath, options });
  },

  // Process an image by ArrayBuffer (use only for small/medium sizes).
  // Convert Node Buffer to ArrayBuffer in renderer before calling if needed.
  processImageBuffer: async (arrayBuffer, options = {}) => {
    if (!(arrayBuffer instanceof ArrayBuffer)) {
      throw new Error('processImageBuffer expects an ArrayBuffer');
    }
    // Sending ArrayBuffer is fine for moderate sizes; main should handle streaming for very large files.
    return ipcRenderer.invoke('process-image-buffer', { buffer: arrayBuffer, options });
  },

  // Subscribe to progress or status events from the main process.
  // Returns an unsubscribe function to remove the listener.
  onProgress: (callback) => {
    if (typeof callback !== 'function') {
      throw new Error('onProgress requires a callback function');
    }
    const listener = (event, payload) => {
      try {
        callback(payload);
      } catch (err) {
        console.error('Error in progress callback:', err);
      }
    };
    ipcRenderer.on('ai-progress', listener);
    return () => {
      ipcRenderer.removeListener('ai-progress', listener);
    };
  },

  // Model-related helpers (read-only queries or explicit download commands).
  getAvailableModels: async () => {
    return ipcRenderer.invoke('models-list');
  },

  downloadModel: async (modelName) => {
    if (typeof modelName !== 'string') {
      throw new Error('downloadModel expects a model name string');
    }
    return ipcRenderer.invoke('models-download', { modelName });
  },

  // Open external links in the user's default browser via the main process
  openExternal: (url) => {
    if (typeof url !== 'string') {
      throw new Error('openExternal expects a URL string');
    }
    ipcRenderer.invoke('open-external', url);
  },

  // Small helper to get app info
  getAppInfo: async () => {
    return ipcRenderer.invoke('app-info');
  },
});