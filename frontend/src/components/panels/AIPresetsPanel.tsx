import React, { useState, useEffect } from 'react';
import { Wand2, Sparkles, Target, Zap } from 'lucide-react';

interface AIPresetsPanelProps {
  layerId: number | null;
  onApply: () => void;
}

interface PresetSuggestion {
  preset_name: string;
  confidence: number;
  reason: string;
  adjustments: Record<string, number>;
}

const AIPresetsPanel: React.FC<AIPresetsPanelProps> = ({ layerId, onApply }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [sceneType, setSceneType] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<PresetSuggestion[]>([]);
  const [autoEnhanceStrength, setAutoEnhanceStrength] = useState(0.5);

  const analyzeScene = async () => {
    if (!layerId) return;
    
    setAnalyzing(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/ai/analyze-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layer_id: layerId })
      });
      
      const data = await response.json();
      if (data.success) {
        setSceneType(data.scene_type);
        
        // Get detailed suggestions
        const suggestionsResponse = await fetch(
          `http://127.0.0.1:8000/api/ai/suggest-preset?layer_id=${layerId}`,
          { method: 'POST' }
        );
        const suggestionsData = await suggestionsResponse.json();
        setSuggestions(suggestionsData);
      }
    } catch (error) {
      console.error('Scene analysis failed:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const applyPreset = async (presetName: string) => {
    if (!layerId) return;
    
    setApplying(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/ai/apply-smart-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layer_id: layerId,
          preset_name: presetName
        })
      });
      
      const data = await response.json();
      if (data.success) {
        onApply();
      }
    } catch (error) {
      console.error('Apply preset failed:', error);
    } finally {
      setApplying(false);
    }
  };

  const autoEnhance = async () => {
    if (!layerId) return;
    
    setApplying(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/ai/auto-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          layer_id: layerId,
          strength: autoEnhanceStrength
        })
      });
      
      const data = await response.json();
      if (data.success) {
        onApply();
      }
    } catch (error) {
      console.error('Auto enhance failed:', error);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Wand2 className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-semibold">AI Smart Presets</h3>
      </div>

      {/* Analyze Scene Button */}
      <button
        onClick={analyzeScene}
        disabled={!layerId || analyzing}
        className="w-full mb-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 rounded-lg flex items-center justify-center gap-2"
      >
        <Target className="w-4 h-4" />
        {analyzing ? 'Analyzing...' : 'Analyze Scene'}
      </button>

      {/* Scene Detection Result */}
      {sceneType && (
        <div className="mb-4 p-3 bg-indigo-900/30 rounded-lg border border-indigo-700">
          <p className="text-sm font-medium mb-1">Detected Scene:</p>
          <p className="text-lg font-bold capitalize">{sceneType}</p>
        </div>
      )}

      {/* Preset Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm mb-2">AI Suggestions</label>
          <div className="space-y-2">
            {suggestions.map((suggestion, idx) => (
              <div
                key={idx}
                className="p-3 bg-gray-800 rounded-lg border border-gray-700 hover:border-indigo-500 cursor-pointer"
                onClick={() => applyPreset(suggestion.preset_name)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{suggestion.preset_name}</span>
                  <span className="text-xs bg-indigo-600 px-2 py-0.5 rounded">
                    {(suggestion.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-gray-400">{suggestion.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="my-4 border-t border-gray-700"></div>

      {/* Auto Enhance */}
      <div className="mb-4">
        <label className="block text-sm mb-2">Auto Enhance Strength</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={autoEnhanceStrength}
          onChange={(e) => setAutoEnhanceStrength(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="text-xs text-gray-400 mt-1">
          {(autoEnhanceStrength * 100).toFixed(0)}%
        </div>
      </div>

      <button
        onClick={autoEnhance}
        disabled={!layerId || applying}
        className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded-lg flex items-center justify-center gap-2"
      >
        <Zap className="w-4 h-4" />
        {applying ? 'Applying...' : 'Auto Enhance'}
      </button>
    </div>
  );
};

export default AIPresetsPanel;
