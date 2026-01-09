import React, { useState } from 'react';
import { Maximize2, Sparkles, Loader2 } from 'lucide-react';

interface AIUpscalePanelProps {
  imageUrl?: string;
  originalWidth?: number;
  originalHeight?: number;
  onComplete?: (result: any) => void;
}

const AIUpscalePanel: React.FC<AIUpscalePanelProps> = ({ 
  imageUrl, 
  originalWidth = 1920, 
  originalHeight = 1080,
  onComplete 
}) => {
  const [scaleFactor, setScaleFactor] = useState(2);
  const [model, setModel] = useState('esrgan');
  const [enhanceFace, setEnhanceFace] = useState(false);
  const [denoise, setDenoise] = useState(true);
  const [processing, setProcessing] = useState(false);

  const newWidth = originalWidth * scaleFactor;
  const newHeight = originalHeight * scaleFactor;

  const estimatedTime = () => {
    const baseTime = scaleFactor === 2 ? 5 : scaleFactor === 4 ? 12 : 30;
    return model === 'gfpgan' ? baseTime * 1.5 : baseTime;
  };

  const handleUpscale = async () => {
    if (!imageUrl) return;
    
    setProcessing(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/ai/upscale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_path: imageUrl,
          scale_factor: scaleFactor,
          model,
          enhance_face: enhanceFace,
          denoise
        })
      });
      
      const result = await response.json();
      if (onComplete) onComplete(result);
    } catch (error) {
      console.error('Upscaling failed:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Maximize2 className="w-5 h-5" />
          AI Upscaling
        </h3>
      </div>

      {/* Scale Factor */}
      <div className="space-y-2">
        <label className="text-sm text-gray-300">Scale Factor</label>
        <div className="grid grid-cols-3 gap-2">
          {[2, 4, 8].map((factor) => (
            <button
              key={factor}
              onClick={() => setScaleFactor(factor)}
              className={`py-2 px-3 rounded text-sm ${
                scaleFactor === factor
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {factor}x
            </button>
          ))}
        </div>
      </div>

      {/* Model Selection */}
      <div className="space-y-2">
        <label className="text-sm text-gray-300">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full bg-gray-700 text-white rounded px-3 py-2"
        >
          <option value="esrgan">ESRGAN (Best Quality)</option>
          <option value="real-esrgan">Real-ESRGAN (Photos)</option>
          <option value="gfpgan">GFPGAN (Faces)</option>
        </select>
      </div>

      {/* Options */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={enhanceFace}
            onChange={(e) => setEnhanceFace(e.target.checked)}
            className="rounded"
          />
          Enhance Faces
        </label>
        
        <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input
            type="checkbox"
            checked={denoise}
            onChange={(e) => setDenoise(e.target.checked)}
            className="rounded"
          />
          Reduce Noise
        </label>
      </div>

      {/* Dimensions Preview */}
      <div className="bg-gray-700 rounded p-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Current:</span>
          <span className="text-white">{originalWidth} × {originalHeight}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Result:</span>
          <span className="text-blue-400 font-semibold">{newWidth} × {newHeight}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400 pt-2 border-t border-gray-600">
          <span>Est. Time:</span>
          <span>~{estimatedTime()}s (GPU)</span>
        </div>
      </div>

      {/* Upscale Button */}
      <button
        onClick={handleUpscale}
        disabled={processing || !imageUrl}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Upscaling {scaleFactor}x...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Upscale Image {scaleFactor}x
          </>
        )}
      </button>
    </div>
  );
};

export default AIUpscalePanel;
