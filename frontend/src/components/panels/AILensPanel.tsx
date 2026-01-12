import React, { useState } from 'react';
import { Camera, Aperture } from 'lucide-react';

const AILensPanel: React.FC = () => {
  const [autoDetect, setAutoDetect] = useState<boolean>(true);
  const [correctDistortion, setCorrectDistortion] = useState<boolean>(true);
  const [correctVignetting, setCorrectVignetting] = useState<boolean>(true);
  const [correctChromatic, setCorrectChromatic] = useState<boolean>(true);
  const [detectedCamera, setDetectedCamera] = useState<string>('');
  const [detectedLens, setDetectedLens] = useState<string>('');

  const handleDetectLens = async () => {
    // API call placeholder
    setDetectedCamera('Canon EOS 5D Mark IV');
    setDetectedLens('Canon EF 24-70mm f/2.8L II');
  };

  const handleCorrectLens = async () => {
    // API call placeholder
    console.log('Correcting lens distortion');
  };

  return (
    <div className="p-4 space-y-4 bg-gray-900 text-white">
      <h3 className="text-lg font-semibold">AI Lens Correction</h3>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={autoDetect}
          onChange={(e) => setAutoDetect(e.target.checked)}
          className="w-4 h-4"
        />
        <label className="text-sm">Auto-Detect Camera & Lens</label>
      </div>

      {autoDetect && (
        <button
          onClick={handleDetectLens}
          className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Detect Lens
        </button>
      )}

      {detectedCamera && (
        <div className="space-y-1 p-2 bg-gray-800 rounded">
          <div className="flex items-center space-x-2 text-sm">
            <Camera size={16} />
            <span>{detectedCamera}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <Aperture size={16} />
            <span>{detectedLens}</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Corrections</h4>
        
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={correctDistortion}
            onChange={(e) => setCorrectDistortion(e.target.checked)}
            className="w-4 h-4"
          />
          <label className="text-sm">Lens Distortion</label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={correctVignetting}
            onChange={(e) => setCorrectVignetting(e.target.checked)}
            className="w-4 h-4"
          />
          <label className="text-sm">Vignetting</label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={correctChromatic}
            onChange={(e) => setCorrectChromatic(e.target.checked)}
            className="w-4 h-4"
          />
          <label className="text-sm">Chromatic Aberration</label>
        </div>
      </div>

      <button
        onClick={handleCorrectLens}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
      >
        Apply Corrections
      </button>
    </div>
  );
};

export default AILensPanel;
