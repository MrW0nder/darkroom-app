import React, { useState } from 'react';
import { Sparkles, Zap } from 'lucide-react';

const AIEnhancePanel: React.FC = () => {
  const [noiseStrength, setNoiseStrength] = useState<number>(0.5);
  const [sharpenStrength, setSharpenStrength] = useState<number>(0.5);
  const [preserveDetail, setPreserveDetail] = useState<boolean>(true);
  const [smartSharpen, setSmartSharpen] = useState<boolean>(true);
  const [denoiseType, setDenoiseType] = useState<string>('both');

  const handleDenoise = async () => {
    // API call placeholder
    console.log('Denoising with strength:', noiseStrength);
  };

  const handleSharpen = async () => {
    // API call placeholder
    console.log('Sharpening with strength:', sharpenStrength);
  };

  const handleAutoEnhance = async () => {
    // API call placeholder
    console.log('Auto-enhancing image');
  };

  return (
    <div className="p-4 space-y-4 bg-gray-900 text-white">
      <h3 className="text-lg font-semibold">AI Enhancement</h3>

      <button
        onClick={handleAutoEnhance}
        className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded flex items-center justify-center space-x-2"
      >
        <Sparkles size={18} />
        <span>Auto Enhance</span>
      </button>

      <div className="border-t border-gray-700 pt-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Noise Reduction</label>
            <Zap size={16} className="text-yellow-500" />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs">Strength: {(noiseStrength * 100).toFixed(0)}%</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={noiseStrength}
              onChange={(e) => setNoiseStrength(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs">Type</label>
            <select
              value={denoiseType}
              onChange={(e) => setDenoiseType(e.target.value)}
              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm"
            >
              <option value="luminance">Luminance</option>
              <option value="color">Color</option>
              <option value="both">Both</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={preserveDetail}
              onChange={(e) => setPreserveDetail(e.target.checked)}
              className="w-4 h-4"
            />
            <label className="text-xs">Preserve Detail</label>
          </div>

          <button
            onClick={handleDenoise}
            className="w-full px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Apply Noise Reduction
          </button>
        </div>

        <div className="border-t border-gray-700 pt-4 space-y-2">
          <label className="text-sm font-medium">AI Sharpening</label>
          
          <div className="space-y-2">
            <label className="text-xs">Strength: {(sharpenStrength * 100).toFixed(0)}%</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={sharpenStrength}
              onChange={(e) => setSharpenStrength(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={smartSharpen}
              onChange={(e) => setSmartSharpen(e.target.checked)}
              className="w-4 h-4"
            />
            <label className="text-xs">Smart Sharpen (Edge-Aware)</label>
          </div>

          <button
            onClick={handleSharpen}
            className="w-full px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            Apply Sharpening
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIEnhancePanel;