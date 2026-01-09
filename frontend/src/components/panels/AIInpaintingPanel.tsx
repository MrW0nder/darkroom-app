import React, { useState } from 'react';
import { Eraser, Wand2, Loader2, RotateCcw } from 'lucide-react';

interface AIInpaintingPanelProps {
  imageUrl?: string;
  onComplete?: (result: any) => void;
}

const AIInpaintingPanel: React.FC<AIInpaintingPanelProps> = ({ imageUrl, onComplete }) => {
  const [qualityMode, setQualityMode] = useState<'fast' | 'balanced' | 'quality'>('balanced');
  const [brushSize, setBrushSize] = useState(20);
  const [processing, setProcessing] = useState(false);
  const [maskPoints, setMaskPoints] = useState<[number, number][]>([]);

  const handleRemoveObject = async () => {
    if (!imageUrl || maskPoints.length === 0) return;
    
    setProcessing(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/ai/inpaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_path: imageUrl,
          mask_coordinates: maskPoints,
          quality_mode: qualityMode
        })
      });
      
      const result = await response.json();
      if (onComplete) onComplete(result);
    } catch (error) {
      console.error('Inpainting failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  const clearMask = () => {
    setMaskPoints([]);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Wand2 className="w-5 h-5" />
          AI Inpainting
        </h3>
      </div>

      {/* Quality Mode */}
      <div className="space-y-2">
        <label className="text-sm text-gray-300">Quality Mode</label>
        <div className="grid grid-cols-3 gap-2">
          {(['fast', 'balanced', 'quality'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setQualityMode(mode)}
              className={`py-2 px-3 rounded text-sm capitalize ${
                qualityMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Brush Size */}
      <div className="space-y-2">
        <label className="text-sm text-gray-300 flex justify-between">
          <span>Brush Size</span>
          <span className="text-blue-400">{brushSize}px</span>
        </label>
        <input
          type="range"
          min="5"
          max="100"
          value={brushSize}
          onChange={(e) => setBrushSize(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Instructions */}
      <div className="bg-gray-700 rounded p-3 text-sm text-gray-300">
        <p>Draw on the canvas to mark areas to remove. The AI will fill them intelligently.</p>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={handleRemoveObject}
          disabled={processing || !imageUrl || maskPoints.length === 0}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Eraser className="w-4 h-4" />
              Remove Marked Area
            </>
          )}
        </button>

        <button
          onClick={clearMask}
          disabled={maskPoints.length === 0}
          className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Clear Mask
        </button>
      </div>

      {/* Timing Info */}
      <div className="text-xs text-gray-400 space-y-1">
        <p>• Fast: ~2-5 seconds</p>
        <p>• Balanced: ~5-15 seconds</p>
        <p>• Quality: ~15-45 seconds</p>
      </div>
    </div>
  );
};

export default AIInpaintingPanel;
