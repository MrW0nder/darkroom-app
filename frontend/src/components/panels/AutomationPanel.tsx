import React from 'react';

const AutomationPanel: React.FC = () => {
  return (
    <div className="p-4 bg-gray-800 text-white">
      <h3 className="text-lg font-bold mb-4">Automation</h3>
      <div className="space-y-4">
        <button className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded">
          + Create New Workflow
        </button>
        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-semibold mb-2">My Workflows</h4>
          <div className="space-y-2">
            <div className="bg-gray-700 p-3 rounded">
              <div className="font-medium">Auto Export for Web</div>
              <div className="text-xs text-gray-400 mt-1">Resize → Export (JPEG 85%)</div>
              <div className="flex gap-2 mt-2">
                <button className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded">Run</button>
                <button className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded">Edit</button>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-semibold mb-2">Templates</h4>
          <select className="w-full bg-gray-700 p-2 rounded text-sm">
            <option>Social Media Export</option>
            <option>RAW Development</option>
            <option>Batch Watermark</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default AutomationPanel;
