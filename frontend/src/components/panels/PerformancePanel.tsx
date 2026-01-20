import React from 'react';

const PerformancePanel: React.FC = () => {
  return (
    <div className="p-4 bg-gray-800 text-white">
      <h3 className="text-lg font-bold mb-4">Performance</h3>
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">Cache Management</h4>
          <div className="bg-gray-700 p-3 rounded">
            <div className="flex justify-between text-sm mb-2">
              <span>Cache Size:</span>
              <span className="text-blue-400">8.5 GB / 10 GB</span>
            </div>
            <button className="w-full bg-red-600 hover:bg-red-700 p-2 rounded text-sm">
              Clear Cache
            </button>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2">Hardware Acceleration</h4>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" defaultChecked className="rounded" />
            Use GPU Acceleration
          </label>
          <select className="w-full bg-gray-700 p-2 rounded text-sm mt-2">
            <option>CUDA (NVIDIA)</option>
            <option>Metal (Apple)</option>
            <option>OpenCL</option>
          </select>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2">Render Queue</h4>
          <div className="text-sm text-gray-400">No active renders</div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2">Performance Stats</h4>
          <div className="text-xs space-y-1">
            <div>CPU: <span className="text-green-400">45%</span></div>
            <div>GPU: <span className="text-blue-400">62%</span></div>
            <div>Memory: <span className="text-yellow-400">8.2 GB</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformancePanel;
