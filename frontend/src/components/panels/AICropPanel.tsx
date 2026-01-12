import React, { useState } from 'react';
import { Camera, Grid3x3, Crop, Maximize2 } from 'lucide-react';

const AICropPanel: React.FC = () => {
  const [mode, setMode] = useState<string>('smart');
  const [aspectRatio, setAspectRatio] = useState<string>('original');
  const [facePriority, setFacePriority] = useState<boolean>(true);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const cropModes = [
    { value: 'smart', label: 'Smart Crop', icon: Camera },
    { value: 'rule_of_thirds', label: 'Rule of Thirds', icon: Grid3x3 },
    { value: 'golden_ratio', label: 'Golden Ratio', icon: Crop },
    { value: 'centered', label: 'Centered', icon: Maximize2 }
  ];

  const handleAutoCrop = async () => {
    // API call placeholder
    console.log('Auto crop with mode:', mode);
  };

  const handleGetSuggestions = async () => {
    // API call placeholder
    setSuggestions([
      { type: 'rule_of_thirds', score: 0.92 },
      { type: 'golden_ratio', score: 0.88 },
      { type: 'centered', score: 0.85 }
    ]);
  };

  return (
    <div className="p-4 space-y-4 bg-gray-900 text-white">
      <h3 className="text-lg font-semibold">AI Auto-Crop</h3>

      <div className="space-y-2">
        <label className="text-sm font-medium">Crop Mode</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
        >
          {cropModes.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Aspect Ratio</label>
        <select
          value={aspectRatio}
          onChange={(e) => setAspectRatio(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
        >
          <option value="original">Original</option>
          <option value="16:9">16:9</option>
          <option value="4:3">4:3</option>
          <option value="1:1">1:1 (Square)</option>
          <option value="3:2">3:2</option>
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={facePriority}
          onChange={(e) => setFacePriority(e.target.checked)}
          className="w-4 h-4"
        />
        <label className="text-sm">Prioritize Faces</label>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleAutoCrop}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          Auto Crop
        </button>
        <button
          onClick={handleGetSuggestions}
          className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
        >
          Get Suggestions
        </button>
      </div>

      {suggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Suggestions</h4>
          {suggestions.map((s, i) => (
            <div key={i} className="p-2 bg-gray-800 rounded flex justify-between items-center">
              <span className="text-sm">{s.type}</span>
              <span className="text-xs text-gray-400">Score: {(s.score * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AICropPanel;