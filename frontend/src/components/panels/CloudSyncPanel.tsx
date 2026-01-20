import React, { useState } from 'react';

const CloudSyncPanel: React.FC = () => {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<string>('idle');

  const providers = [
    { name: 'google_drive', label: 'Google Drive', icon: '📁' },
    { name: 'dropbox', label: 'Dropbox', icon: '📦' },
    { name: 'onedrive', label: 'OneDrive', icon: '☁️' },
    { name: 'icloud', label: 'iCloud', icon: '☁️' }
  ];

  return (
    <div className="p-4 bg-gray-800 text-white">
      <h3 className="text-lg font-bold mb-4">Cloud Sync</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-2">Cloud Provider</label>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="w-full bg-gray-700 p-2 rounded"
          >
            <option value="">Select provider...</option>
            {providers.map(p => (
              <key={p.name}option value={p.name}>{p.icon} {p.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 p-2 rounded">
            Connect
          </button>
          <button className="flex-1 bg-green-600 hover:bg-green-700 p-2 rounded">
            Sync Now
          </button>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-semibold mb-2">Sync Status</h4>
          <div className="text-sm space-y-1">
            <div>Status: <span className="text-green-400">{syncStatus}</span></div>
            <div>Files Synced: <span className="text-blue-400">1,247</span></div>
            <div>Storage Used: <span className="text-yellow-400">5.0 GB / 100 GB</span></div>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-semibold mb-2">Settings</h4>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked className="rounded" />
            Auto-sync on changes
          </label>
          <label className="flex items-center gap-2 text-sm mt-2">
            <input type="checkbox" className="rounded" />
            Selective folder sync
          </label>
        </div>
      </div>
    </div>
  );
};

export default CloudSyncPanel;