import React, { useState } from 'react';

interface TimelapseDialogProps {
  open: boolean;
  onClose: () => void;
}

export const TimelapseDialog: React.FC<TimelapseDialogProps> = ({ open, onClose }) => {
  const [frameRate, setFrameRate] = useState(24);
  const [codec, setCodec] = useState('H.264');
  const [transition, setTransition] = useState('none');
  const [deflicker, setDeflicker] = useState(false);
  const [outputFormat, setOutputFormat] = useState('MP4');

  if (!open) return null;

  const handleCreate = async () => {
    // Call API to create timelapse
    console.log('Creating timelapse with:', { frameRate, codec, transition, deflicker, outputFormat });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-2xl">
        <h2 className="text-xl font-bold text-white mb-4">Create Timelapse</h2>
        
        <div className="space-y-4">
          {/* Frame Rate */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Frame Rate (fps)</label>
            <input
              type="range"
              min="1"
              max="120"
              value={frameRate}
              onChange={(e) => setFrameRate(Number(e.target.value))}
              className="w-full"
            />
            <span className="text-white">{frameRate} fps</span>
          </div>

          {/* Codec */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Codec</label>
            <select
              value={codec}
              onChange={(e) => setCodec(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded"
            >
              <option value="H.264">H.264</option>
              <option value="H.265">H.265</option>
              <option value="ProRes">ProRes</option>
            </select>
          </div>

          {/* Transition */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Transition Effect</label>
            <select
              value={transition}
              onChange={(e) => setTransition(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded"
            >
              <option value="none">None</option>
              <option value="fade">Fade</option>
              <option value="dissolve">Dissolve</option>
              <option value="wipe">Wipe</option>
            </select>
          </div>

          {/* Deflicker */}
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={deflicker}
              onChange={(e) => setDeflicker(e.target.checked)}
              className="mr-2"
            />
            <label className="text-gray-300">Apply Deflicker</label>
          </div>

          {/* Output Format */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Output Format</label>
            <select
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              className="w-full bg-gray-700 text-white p-2 rounded"
            >
              <option value="MP4">MP4</option>
              <option value="MOV">MOV</option>
              <option value="AVI">AVI</option>
            </select>
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
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create Timelapse
          </button>
        </div>
      </div>
    </div>
  );
};
