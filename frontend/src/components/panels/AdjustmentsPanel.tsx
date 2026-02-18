/**
 * AdjustmentsPanel - Lightroom-style adjustment controls
 * Real-time sliders for image adjustments
 */
import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Save, X, ChevronDown } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext.js'; // Added .js extension

interface Preset {
  name: string;
  values: {
    exposure: number;
    brightness: number;
    contrast: number;
    highlights: number;
    shadows: number;
    saturation: number;
    sharpness: number;
  };
}

interface AdjustmentsPanelProps {
  onEditApplied?: () => void;
  isLocked?: boolean;
}

const AdjustmentsPanel: React.FC<AdjustmentsPanelProps> = ({ onEditApplied, isLocked = false }) => {
  const { state, updateAdjustments, resetAdjustments } = useEditor();
  const { adjustments } = state;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const adjustmentsRef = useRef(adjustments);
  
  const [presets, setPresets] = useState<Preset[]>([]);
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [showPresetsDropdown, setShowPresetsDropdown] = useState(false);
  const [pendingPresetDelete, setPendingPresetDelete] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [interactionStartValues, setInteractionStartValues] = useState<Record<string, number>>({});
  const wheelStartValuesRef = useRef<Record<string, number>>({});

  const handleAdjustmentChange = (key: string, value: number) => {
    if (isLocked) return;
    updateAdjustments({ [key]: value }, { recordHistory: false });
  };

  const handleAdjustmentStart = (key: string, value: number) => {
    if (isLocked) return;
    setInteractionStartValues(prev => ({ ...prev, [key]: value }));
  };

  const handleAdjustmentCommit = (key: string, value: number) => {
    if (isLocked) return;
    const startValue = interactionStartValues[key];
    // Only record history if the value actually changed
    if (startValue !== undefined && startValue !== value) {
      updateAdjustments({ [key]: value }, { recordHistory: true });
      onEditApplied?.();
    }
    // Clear the start value for this key
    setInteractionStartValues(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSliderMouseLeave = (key: string) => {
    if (isLocked) return;
    // Check if there was a wheel-based change for this slider
    const wheelStartValue = wheelStartValuesRef.current[key];
    const currentValue = adjustmentsRef.current[key as keyof typeof adjustments];
    
    if (wheelStartValue !== undefined && wheelStartValue !== currentValue) {
      // Record the change to history
      updateAdjustments({ [key]: currentValue }, { recordHistory: true });
      onEditApplied?.();
    }
    
    // Clear the wheel start value for this key
    delete wheelStartValuesRef.current[key];
  };

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  useEffect(() => {
    adjustmentsRef.current = adjustments;
  }, [adjustments]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const onWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      const row = target?.closest('[data-adjustment-key]') as HTMLElement | null;
      
      if (row) {
        // We're over a dial - adjust it
        event.preventDefault();
        event.stopPropagation();

        if (isLocked) {
          return;
        }

        const key = row.dataset.adjustmentKey as keyof typeof adjustments;
        const step = Number(row.dataset.step || 1);
        const min = Number(row.dataset.min || 0);
        const max = Number(row.dataset.max || 100);
        const current = Number(adjustmentsRef.current[key]);

        // Track the initial value if this is the first wheel event for this key
        if (wheelStartValuesRef.current[key] === undefined) {
          wheelStartValuesRef.current[key] = current;
        }

        const delta = event.deltaY < 0 ? step : -step;
        const nextValue = clamp(current + delta, min, max);
        updateAdjustments({ [key]: nextValue }, { recordHistory: false });
      } else if (panel.contains(target as Node)) {
        // We're in the panel but not over a dial - prevent scrolling
        event.preventDefault();
      }
    };

    panel.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      panel.removeEventListener('wheel', onWheel);
    };
  }, [isLocked, updateAdjustments]);

  const adjustmentControls = [
    { key: 'exposure', label: 'Exposure', min: -3, max: 3, step: 0.1, value: adjustments.exposure, default: 0 },
    { key: 'brightness', label: 'Brightness', min: -100, max: 100, step: 1, value: adjustments.brightness, default: 0 },
    { key: 'contrast', label: 'Contrast', min: -100, max: 100, step: 1, value: adjustments.contrast, default: 0 },
    { key: 'highlights', label: 'Highlights', min: -100, max: 100, step: 1, value: adjustments.highlights, default: 0 },
    { key: 'shadows', label: 'Shadows', min: -100, max: 100, step: 1, value: adjustments.shadows, default: 0 },
    { key: 'saturation', label: 'Saturation', min: -100, max: 100, step: 1, value: adjustments.saturation, default: 0 },
    { key: 'sharpness', label: 'Sharpness', min: 0, max: 2, step: 0.1, value: adjustments.sharpness, default: 1 },
  ];

  const resetIndividualAdjustment = (key: string, defaultValue: number) => {
    if (isLocked) return;
    updateAdjustments({ [key]: defaultValue }, { recordHistory: true });
    onEditApplied?.();
  };

  // Load presets from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('darkroom-presets');
    if (saved) {
      try {
        setPresets(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load presets:', e);
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPresetsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const savePreset = () => {
    if (!presetName.trim()) return;
    
    const newPreset: Preset = {
      name: presetName.trim(),
      values: {
        exposure: adjustments.exposure,
        brightness: adjustments.brightness,
        contrast: adjustments.contrast,
        highlights: adjustments.highlights,
        shadows: adjustments.shadows,
        saturation: adjustments.saturation,
        sharpness: adjustments.sharpness,
      },
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('darkroom-presets', JSON.stringify(updated));
    setPresetName('');
    setShowPresetInput(false);
    setShowPresetsDropdown(false);
  };

  const loadPreset = (preset: Preset) => {
    if (isLocked) return;
    updateAdjustments(preset.values, { recordHistory: true });    onEditApplied?.();    setShowPresetsDropdown(false);
  };

  const deletePreset = (presetName: string) => {
    const updated = presets.filter(p => p.name !== presetName);
    setPresets(updated);
    localStorage.setItem('darkroom-presets', JSON.stringify(updated));
    setShowPresetsDropdown(false);
    setPendingPresetDelete(null);
  };

  return (
    <div
      ref={panelRef}
      className="bg-gray-800 rounded-lg p-4 space-y-4"
      style={{ overscrollBehavior: 'contain' }}
    >
      {/* Header with Reset All Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Adjustments</h3>
        <button
          onClick={() => resetAdjustments()}
          disabled={isLocked}
          className={`p-1.5 rounded transition-colors ${
            isLocked ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-700'
          }`}
          title="Reset All Adjustments"
        >
          <RotateCcw className="w-4 h-4 text-gray-400 hover:text-white" />
        </button>
      </div>

      {/* Presets Section */}
      <div className="relative" ref={dropdownRef}>
        {/* Presets Dropdown Button */}
        <button
          onClick={() => setShowPresetsDropdown(!showPresetsDropdown)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          <span>Presets</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showPresetsDropdown ? 'rotate-180' : ''}`} />
        </button>

        {/* Presets Dropdown Menu */}
        {showPresetsDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-gray-700 rounded shadow-lg z-10 max-h-64 overflow-y-auto">
            {presets.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400">No presets saved</div>
            ) : (
              <div className="py-1">
                {presets.map((preset) => (
                  <div
                    key={preset.name}
                    className="flex items-center justify-between px-3 py-2 hover:bg-gray-600 group"
                  >
                    <button
                      onClick={() => loadPreset(preset)}
                      className="flex-1 text-left text-sm text-gray-300 hover:text-white transition-colors"
                    >
                      {preset.name}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingPresetDelete(preset.name);
                      }}
                      className="ml-2 p-1 hover:bg-gray-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Preset"
                    >
                      <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
                    </button>
                  </div>
                ))}
                {pendingPresetDelete && (
                  <div className="px-3 py-2 text-sm text-gray-200 border-t border-gray-600">
                    <div className="mb-2">
                      Delete preset "{pendingPresetDelete}"?
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => deletePreset(pendingPresetDelete)}
                        className="flex-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setPendingPresetDelete(null)}
                        className="flex-1 px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Save Current as New Preset Option */}
            <div className="border-t border-gray-600">
              {!showPresetInput ? (
                <button
                  onClick={() => setShowPresetInput(true)}
                  className="w-full px-3 py-2 text-sm text-left text-blue-400 hover:bg-gray-600 transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Current as New Preset
                </button>
              ) : (
                <div className="p-3 space-y-2">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') savePreset();
                      if (e.key === 'Escape') setShowPresetInput(false);
                    }}
                    placeholder="Preset name..."
                    className="w-full px-2 py-1.5 text-sm bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={savePreset}
                      className="flex-1 px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowPresetInput(false)}
                      className="flex-1 px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-white rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Adjustment Controls */}
      <div className="space-y-2">
        {adjustmentControls.map(({ key, label, min, max, step, value, default: defaultValue }) => (
          <div
            key={key}
            className="space-y-1"
            data-adjustment-key={key}
            data-step={step}
            data-min={min}
            data-max={max}
            onMouseLeave={() => handleSliderMouseLeave(key)}
          >
            <div className="flex justify-between items-center gap-2">
              <label className="text-xs text-gray-300">{label}</label>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 font-mono">
                  {value.toFixed(step < 1 ? 1 : 0)}
                </span>
                <button
                  onClick={() => resetIndividualAdjustment(key, defaultValue)}
                  disabled={isLocked}
                  className={`p-0.5 rounded transition-colors ${
                    isLocked ? 'cursor-not-allowed opacity-50' : 'hover:bg-gray-700'
                  }`}
                  title={`Reset ${label}`}
                >
                  <RotateCcw className="w-3 h-3 text-gray-400 hover:text-white" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              disabled={isLocked}
              onMouseDown={(e) => handleAdjustmentStart(key, parseFloat((e.target as HTMLInputElement).value))}
              onTouchStart={(e) => handleAdjustmentStart(key, parseFloat((e.target as HTMLInputElement).value))}
              onChange={(e) => handleAdjustmentChange(key, parseFloat(e.target.value))}
              onMouseUp={(e) => handleAdjustmentCommit(key, parseFloat((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => handleAdjustmentCommit(key, parseFloat((e.target as HTMLInputElement).value))}
              className={`w-full h-1 bg-gray-700 rounded-lg appearance-none ${
                isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              }
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                         [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                         hover:[&::-webkit-slider-thumb]:bg-blue-400`}
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
