import React, { useState } from 'react';
import { Scan, Layers, Trash2, Loader2 } from 'lucide-react';

interface DetectedObject {
  id: number;
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
  selected: boolean;
}

interface AIDetectionPanelProps {
  imageUrl?: string;
  onComplete?: (result: any) => void;
}

const AIDetectionPanel: React.FC<AIDetectionPanelProps> = ({ imageUrl, onComplete }) => {
  const [detecting, setDetecting] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);
  const [removing, setRemoving] = useState(false);

  const handleDetect = async () => {
    if (!imageUrl) return;
    
    setDetecting(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/ai/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_path: imageUrl,
          confidence_threshold: confidenceThreshold
        })
      });
      
      const result = await response.json();
      if (result.objects) {
        setDetectedObjects(result.objects.map((obj: any, idx: number) => ({
          id: idx,
          ...obj,
          selected: false
        })));
      }
    } catch (error) {
      console.error('Detection failed:', error);
    } finally {
      setDetecting(false);
    }
  };

  const toggleSelection = (id: number) => {
    setDetectedObjects(objects =>
      objects.map(obj =>
        obj.id === id ? { ...obj, selected: !obj.selected } : obj
      )
    );
  };

  const handleRemoveBackground = async () => {
    if (!imageUrl) return;
    
    setRemoving(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/ai/remove-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_path: imageUrl })
      });
      
      const result = await response.json();
      if (onComplete) onComplete(result);
    } catch (error) {
      console.error('Background removal failed:', error);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Scan className="w-5 h-5" />
          AI Object Detection
        </h3>
      </div>

      {/* Confidence Threshold */}
      <div className="space-y-2">
        <label className="text-sm text-gray-300 flex justify-between">
          <span>Confidence Threshold</span>
          <span className="text-blue-400">{(confidenceThreshold * 100).toFixed(0)}%</span>
        </label>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={confidenceThreshold}
          onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Detect Button */}
      <button
        onClick={handleDetect}
        disabled={!imageUrl || detecting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
      >
        {detecting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Detecting...
          </>
        ) : (
          <>
            <Scan className="w-4 h-4" />
            Detect Objects
          </>
        )}
      </button>

      {/* Detected Objects List */}
      {detectedObjects.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-gray-300">
            <span>Detected: {detectedObjects.length} objects</span>
            <span>Selected: {detectedObjects.filter(o => o.selected).length}</span>
          </div>
          
          <div className="max-h-60 overflow-y-auto space-y-1">
            {detectedObjects.map((obj) => (
              <div
                key={obj.id}
                onClick={() => toggleSelection(obj.id)}
                className={`p-2 rounded cursor-pointer flex items-center justify-between ${
                  obj.selected ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  <span className="text-sm text-white capitalize">{obj.class}</span>
                </div>
                <span className="text-xs text-gray-300">
                  {(obj.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {detectedObjects.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={handleRemoveBackground}
            disabled={removing}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2"
          >
            {removing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Remove Background
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default AIDetectionPanel;
