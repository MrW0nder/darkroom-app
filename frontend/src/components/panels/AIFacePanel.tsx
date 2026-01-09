import React, { useState } from 'react';
import { Sparkles, User, Smile, Eye } from 'lucide-react';

interface AIFacePanelProps {
  layerId: number | null;
  onApply: () => void;
}

const AIFacePanel: React.FC<AIFacePanelProps> = ({ layerId, onApply }) => {
  const [detecting, setDetecting] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [faces, setFaces] = useState<any[]>([]);
  const [selectedFace, setSelectedFace] = useState(0);
  const [enhancementLevel, setEnhancementLevel] = useState(0.5);
  const [smoothing, setSmoothing] = useState(true);
  const [brighten, setBrighten] = useState(true);

  const detectFaces = async () => {
    if (!layerId) return;
    
    setDetecting(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/ai/detect-faces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layer_id: layerId, min_confidence: 0.5 })
      });
      
      const data = await response.json();
      if (data.success) {
        setFaces(data.faces);
      }
    } catch (error) {
      console.error('Face detection failed:', error);
    } finally {
      setDetecting(false);
    }
  };

  const enhanceFace = async () => {
    if (!layerId) return;
    
    setEnhancing(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/ai/enhance-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layer_id: layerId,
          face_index: selectedFace,
          enhancement_level: enhancementLevel,
          smoothing,
          brighten
        })
      });
      
      const data = await response.json();
      if (data.success) {
        onApply();
      }
    } catch (error) {
      console.error('Face enhancement failed:', error);
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <User className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold">AI Face Enhancement</h3>
      </div>

      {/* Detect Faces Button */}
      <button
        onClick={detectFaces}
        disabled={!layerId || detecting}
        className="w-full mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg flex items-center justify-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        {detecting ? 'Detecting...' : 'Detect Faces'}
      </button>

      {/* Detected Faces */}
      {faces.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm mb-2">Detected Faces ({faces.length})</label>
          <div className="space-y-2">
            {faces.map((face, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedFace(idx)}
                className={`p-2 rounded cursor-pointer ${
                  selectedFace === idx ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                Face {idx + 1} - Confidence: {(face.confidence * 100).toFixed(0)}%
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enhancement Level */}
      <div className="mb-4">
        <label className="block text-sm mb-2">Enhancement Level</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={enhancementLevel}
          onChange={(e) => setEnhancementLevel(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="text-xs text-gray-400 mt-1">
          {(enhancementLevel * 100).toFixed(0)}%
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={smoothing}
            onChange={(e) => setSmoothing(e.target.checked)}
            className="w-4 h-4"
          />
          <Smile className="w-4 h-4" />
          <span className="text-sm">Skin Smoothing</span>
        </label>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={brighten}
            onChange={(e) => setBrighten(e.target.checked)}
            className="w-4 h-4"
          />
          <Eye className="w-4 h-4" />
          <span className="text-sm">Brighten Eyes</span>
        </label>
      </div>

      {/* Enhance Button */}
      <button
        onClick={enhanceFace}
        disabled={!layerId || faces.length === 0 || enhancing}
        className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded-lg"
      >
        {enhancing ? 'Enhancing...' : 'Enhance Face'}
      </button>
    </div>
  );
};

export default AIFacePanel;
