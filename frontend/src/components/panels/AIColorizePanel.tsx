import React, { useState } from 'react';
import { Palette, Sparkles, Image as ImageIcon } from 'lucide-react';

interface AIColorizePanelProps {
  layerId: number | null;
  onApply: () => void;
}

const AIColorizePanel: React.FC<AIColorizePanelProps> = ({ layerId, onApply }) => {
  const [colorizing, setColorizing] = useState(false);
  const [method, setMethod] = useState('auto');
  const [intensity, setIntensity] = useState(1.0);

  const methods = [
    { value: 'auto', label: 'Auto', description: 'AI automatic colorization' },
    { value: 'vintage', label: 'Vintage', description: 'Warm vintage tones' },
    { value: 'vivid', label: 'Vivid', description: 'Vibrant saturated colors' },
    { value: 'natural', label: 'Natural', description: 'Realistic natural colors' }
  ];

  const colorizeImage = async () => {
    if (!layerId) return;
    
    setColorizing(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/ai/colorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layer_id: layerId,
          method,
          intensity
        })
      });
      
      const data = await response.json();
      if (data.success) {
        onApply();
      }
    } catch (error) {
      console.error('Colorization failed:', error);
    } finally {
      setColorizing(false);
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold">AI Colorization</h3>
      </div>

      <p className="text-sm text-gray-400 mb-4">
        Transform black & white images into color using AI
      </p>

      {/* Method Selection */}
      <div className="mb-4">
        <label className="block text-sm mb-2">Colorization Method</label>
        <div className="grid grid-cols-2 gap-2">
          {methods.map((m) => (
            <button
              key={m.value}
              onClick={() => setMethod(m.value)}
              className={`p-2 rounded text-sm ${
                method === m.value
                  ? 'bg-purple-600'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {methods.find(m => m.value === method)?.description}
        </p>
      </div>

      {/* Intensity Slider */}
      <div className="mb-4">
        <label className="block text-sm mb-2">Color Intensity</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={intensity}
          onChange={(e) => setIntensity(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="text-xs text-gray-400 mt-1">
          {(intensity * 100).toFixed(0)}%
        </div>
      </div>

      {/* Preview Info */}
      <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-start gap-2">
          <ImageIcon className="w-4 h-4 text-blue-400 mt-0.5" />
          <div className="text-xs text-gray-400">
            <p className="font-medium text-white mb-1">Before Colorizing:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Works best with high-quality B&W images</li>
              <li>Processing may take 15-30 seconds</li>
              <li>Results may vary by image content</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Colorize Button */}
      <button
        onClick={colorizeImage}
        disabled={!layerId || colorizing}
        className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 rounded-lg flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        {colorizing ? 'Colorizing...' : 'Colorize Image'}
      </button>
    </div>
  );
};

export default AIColorizePanel;
