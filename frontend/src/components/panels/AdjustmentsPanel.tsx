/**
 * AdjustmentsPanel - Lightroom-style adjustment controls
 * Real-time sliders for image adjustments
 */
import React from 'react';
import { useEditor } from '../../contexts/EditorContext';

const AdjustmentsPanel: React.FC = () => {
  const { state, updateAdjustments, resetAdjustments } = useEditor();
  const { adjustments } = state;

  const handleAdjustmentChange = (key: string, value: number) => {
    updateAdjustments({ [key]: value });
  };

  const adjustmentControls = [
    { key: 'exposure', label: 'Exposure', min: -3, max: 3, step: 0.1, value: adjustments.exposure },
    { key: 'brightness', label: 'Brightness', min: -100, max: 100, step: 1, value: adjustments.brightness },
    { key: 'contrast', label: 'Contrast', min: -100, max: 100, step: 1, value: adjustments.contrast },
    { key: 'highlights', label: 'Highlights', min: -100, max: 100, step: 1, value: adjustments.highlights },
    { key: 'shadows', label: 'Shadows', min: -100, max: 100, step: 1, value: adjustments.shadows },
    { key: 'saturation', label: 'Saturation', min: -100, max: 100, step: 1, value: adjustments.saturation },
    { key: 'sharpness', label: 'Sharpness', min: 0, max: 2, step: 0.1, value: adjustments.sharpness },
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Adjustments</h3>
        <button
          onClick={resetAdjustments}
          className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="space-y-4">
        {adjustmentControls.map(({ key, label, min, max, step, value }) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm text-gray-300">{label}</label>
              <span className="text-sm text-gray-400 font-mono">
                {value.toFixed(step < 1 ? 1 : 0)}
              </span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => handleAdjustmentChange(key, parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                         [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-blue-500 
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                         hover:[&::-webkit-slider-thumb]:bg-blue-400"
            />
          </div>
        ))}
      </div>

      {state.isProcessing && (
        <div className="mt-4 p-3 bg-blue-900 bg-opacity-50 rounded text-sm text-blue-200">
          Processing adjustments...
        </div>
      )}
    </div>
  );
};

export default AdjustmentsPanel;
