import React, { useState } from 'react';
import { Cloud, Sun, CloudRain, Moon } from 'lucide-react';

const AISkyPanel: React.FC = () => {
  const [skyType, setSkyType] = useState<string>('sunset');
  const [blendStrength, setBlendStrength] = useState<number>(0.8);
  const [preserveForeground, setPreserveForeground] = useState<boolean>(true);
  const [hasSky, setHasSky] = useState<boolean>(false);

  const skyTypes = [
    { value: 'sunset', label: 'Sunset', icon: Sun },
    { value: 'sunrise', label: 'Sunrise', icon: Sun },
    { value: 'cloudy', label: 'Cloudy', icon: Cloud },
    { value: 'dramatic', label: 'Dramatic', icon: CloudRain },
    { value: 'clear_blue', label: 'Clear Blue', icon: Cloud },
    { value: 'night', label: 'Night', icon: Moon }
  ];

  const handleDetectSky = async () => {
    // API call placeholder
    setHasSky(true);
  };

  const handleReplaceSky = async () => {
    // API call placeholder
  };

  return (
    <div className="p-4 space-y-4 bg-gray-900 text-white">
      <h3 className="text-lg font-semibold">AI Sky Replacement</h3>

      <button
        onClick={handleDetectSky}
        className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
      >
        Detect Sky
      </button>

      {hasSky && (
        <div className="p-2 bg-green-900/30 border border-green-700 rounded text-sm">
          Sky detected (35% of image)
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Sky Type</label>
        <select
          value={skyType}
          onChange={(e) => setSkyType(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
        >
          {skyTypes.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Blend Strength: {(blendStrength * 100).toFixed(0)}%</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={blendStrength}
          onChange={(e) => setBlendStrength(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={preserveForeground}
          onChange={(e) => setPreserveForeground(e.target.checked)}
          className="w-4 h-4"
        />
        <label className="text-sm">Preserve Foreground</label>
      </div>

      <button
        onClick={handleReplaceSky}
        disabled={!hasSky}
        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded"
      >
        Replace Sky
      </button>
    </div>
  );
};

export default AISkyPanel;