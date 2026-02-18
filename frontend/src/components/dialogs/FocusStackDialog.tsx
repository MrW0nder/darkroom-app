import React, { useState } from 'react';

interface FocusStackDialogProps {
  open: boolean;
  onClose: () => void;
}

export const FocusStackDialog: React.FC<FocusStackDialogProps> = ({ open, onClose }) => {
  const [alignment, setAlignment] = useState(true);
  const [generateDepthMap, setGenerateDepthMap] = useState(false);
  const [quality, setQuality] = useState('high');

  if (!open) return null;

  const handleStack = async () => {
    // Call API to perform focus stacking
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-2xl">
        <h2 className="text-xl font-bold text-white mb-4">Focus Stacking</h2>
        
        <div className="space-y-4">
          {/* Auto-Alignment */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={alignment}
              onChange={(e) => setAlignment(e.target.checked)}
              className="mr-2"
            />
            <label className="text-gray-300">Auto-Align Images</label>
          </div>

          {/* Depth Map */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={generateDepthMap}
              onChange={(e) => setGenerateDepthMap(e.target.checked)}
              className="mr-2"
            />
            <label className="text-gray-300">Generate Depth Map</label>
          </div>

          {/* Quality */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Quality</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded"
            >
              <option value="draft">Draft</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="ultra">Ultra</option>
            </select>
          </div>

          {/* Info */}
          <div className="bg-gray-700 p-4 rounded">
            <p className="text-sm text-gray-300">
              Focus stacking combines multiple images taken at different focus distances to create
              an image with extended depth of field. This is particularly useful for macro photography.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleStack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Stack Images
          </button>
        </div>
      </div>
    </div>
  );
};