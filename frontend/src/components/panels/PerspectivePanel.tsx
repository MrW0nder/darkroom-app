import React, { useState } from 'react';
import { RotateCw, Grid, Maximize2 } from 'lucide-react';

export const PerspectivePanel: React.FC = () => {
  const [vertical, setVertical] = useState(0);
  const [horizontal, setHorizontal] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [fourPointMode, setFourPointMode] = useState(false);
  const [showGuides, setShowGuides] = useState(true);

  const handleAutoCorrect = async () => {
    // Auto-detect perspective distortion using Hough line detection
    console.log('Auto-correcting perspective...');
  };

  const handleReset = () => {
    setVertical(0);
    setHorizontal(0);
    setRotation(0);
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Maximize2 size={20} />
        Perspective Correction
      </h3>

      {/* Auto Correct */}
      <button
        onClick={handleAutoCorrect}
        className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2"
      >
        <Grid size={16} />
        Auto-Correct Perspective
      </button>

      {/* Keystone Correction */}
      <div className="space-y-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Vertical Keystone: {vertical}°
          </label>
          <input
            type="range"
            min="-45"
            max="45"
            value={vertical}
            onChange={(e) => setVertical(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Horizontal Keystone: {horizontal}°
          </label>
          <input
            type="range"
            min="-45"
            max="45"
            value={horizontal}
            onChange={(e) => setHorizontal(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <RotateCw size={16} />
            Rotation: {rotation}°
          </label>
          <input
            type="range"
            min="-180"
            max="180"
            value={rotation}
            onChange={(e) => setRotation(parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      {/* Four-Point Mode */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-gray-300">
          <input
            type="checkbox"
            checked={fourPointMode}
            onChange={(e) => setFourPointMode(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Four-point transformation mode</span>
        </label>
        {fourPointMode && (
          <p className="text-xs text-gray-400 mt-2">
            Click four corners on the image to define the perspective plane
          </p>
        )}
      </div>

      {/* Guide Lines */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-gray-300">
          <input
            type="checkbox"
            checked={showGuides}
            onChange={(e) => setShowGuides(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Show alignment guides</span>
        </label>
      </div>

      {/* Reset */}
      <button
        onClick={handleReset}
        className="w-full px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
      >
        Reset All
      </button>
    </div>
  );
};