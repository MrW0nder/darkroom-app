import React, { useState } from 'react';

export const AnalyticsPanel: React.FC = () => {
  const [timeRange, setTimeRange] = useState('30d');

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Analytics</h2>
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Library Stats */}
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-sm font-semibold mb-3">Library Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-gray-400">Total Images</p>
            </div>
            <div>
              <p className="text-2xl font-bold">0 GB</p>
              <p className="text-xs text-gray-400">Storage Used</p>
            </div>
          </div>
        </div>

        {/* Editing Patterns */}
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-sm font-semibold mb-3">Most Used Tools</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Exposure</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-gray-700 rounded overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: '0%' }}></div>
                </div>
                <span className="text-gray-400 w-8 text-right">0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Storage Breakdown */}
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-sm font-semibold mb-3">Storage Breakdown</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Originals</span>
              <span className="text-gray-400">0 GB</span>
            </div>
            <div className="flex justify-between">
              <span>Cache</span>
              <span className="text-gray-400">0 GB</span>
            </div>
            <div className="flex justify-between">
              <span>Exports</span>
              <span className="text-gray-400">0 GB</span>
            </div>
          </div>
        </div>

        {/* Export History */}
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-sm font-semibold mb-3">Recent Exports</h3>
          <div className="text-sm text-gray-400">
            <p>No exports in the selected time range</p>
          </div>
        </div>
      </div>
    </div>
  );
};