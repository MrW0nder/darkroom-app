import React, { useState } from 'react';
import { Palette, Sun, Droplet } from 'lucide-react';

interface ColorWheel {
  hue: number;
  saturation: number;
  luminance: number;
}

interface ColorGradingPanelProps {
  onApply: (settings: ColorGradingSettings) => void;
}

interface ColorGradingSettings {
  colorWheels: {
    shadows: ColorWheel;
    midtones: ColorWheel;
    highlights: ColorWheel;
  };
  temperature: number;
  tint: number;
  vibrance: number;
  saturation: number;
}

export const ColorGradingPanel: React.FC<ColorGradingPanelProps> = ({ onApply }) => {
  const [settings, setSettings] = useState<ColorGradingSettings>({
    colorWheels: {
      shadows: { hue: 0, saturation: 0, luminance: 0 },
      midtones: { hue: 0, saturation: 0, luminance: 0 },
      highlights: { hue: 0, saturation: 0, luminance: 0 }
    },
    temperature: 0,
    tint: 0,
    vibrance: 0,
    saturation: 0
  });

  const handleApply = () => {
    onApply(settings);
  };

  const ColorWheelControl = ({ 
    label, 
    wheel, 
    onChange 
  }: { 
    label: string; 
    wheel: ColorWheel; 
    onChange: (wheel: ColorWheel) => void 
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="flex items-center gap-4">
        <div 
          className="w-24 h-24 rounded-full border-2 border-gray-600 cursor-pointer"
          style={{
            background: `hsl(${wheel.hue}, ${wheel.saturation}%, ${50 + wheel.luminance}%)`
          }}
          onClick={() => {
            // TODO: Implement color wheel picker interaction
          }}
        />
        <div className="flex-1 space-y-2">
          <div>
            <label className="text-xs text-gray-400">Hue</label>
            <input
              type="range"
              min="0"
              max="360"
              value={wheel.hue}
              onChange={(e) => onChange({ ...wheel, hue: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Saturation</label>
            <input
              type="range"
              min="0"
              max="100"
              value={wheel.saturation}
              onChange={(e) => onChange({ ...wheel, saturation: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Luminance</label>
            <input
              type="range"
              min="-50"
              max="50"
              value={wheel.luminance}
              onChange={(e) => onChange({ ...wheel, luminance: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 bg-gray-900 text-white h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-6">
        <Palette className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Color Grading</h2>
      </div>

      {/* Color Wheels */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Color Wheels</h3>
        
        <ColorWheelControl 
          label="Shadows" 
          wheel={settings.colorWheels.shadows}
          onChange={(wheel) => setSettings({
            ...settings,
            colorWheels: { ...settings.colorWheels, shadows: wheel }
          })}
        />

        <ColorWheelControl 
          label="Midtones" 
          wheel={settings.colorWheels.midtones}
          onChange={(wheel) => setSettings({
            ...settings,
            colorWheels: { ...settings.colorWheels, midtones: wheel }
          })}
        />

        <ColorWheelControl 
          label="Highlights" 
          wheel={settings.colorWheels.highlights}
          onChange={(wheel) => setSettings({
            ...settings,
            colorWheels: { ...settings.colorWheels, highlights: wheel }
          })}
        />
      </div>

      {/* Temperature & Tint */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Temperature & Tint</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sun className="w-4 h-4 text-orange-400" />
              <label className="text-sm text-gray-300">Temperature</label>
              <span className="ml-auto text-xs text-gray-400">{settings.temperature}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={settings.temperature}
              onChange={(e) => setSettings({ ...settings, temperature: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Droplet className="w-4 h-4 text-green-400" />
              <label className="text-sm text-gray-300">Tint</label>
              <span className="ml-auto text-xs text-gray-400">{settings.tint}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={settings.tint}
              onChange={(e) => setSettings({ ...settings, tint: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Vibrance & Saturation */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Vibrance & Saturation</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-300">Vibrance</label>
              <span className="text-xs text-gray-400">{settings.vibrance}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={settings.vibrance}
              onChange={(e) => setSettings({ ...settings, vibrance: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-300">Saturation</label>
              <span className="text-xs text-gray-400">{settings.saturation}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={settings.saturation}
              onChange={(e) => setSettings({ ...settings, saturation: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={handleApply}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
      >
        Apply Color Grading
      </button>

      {/* Reset Button */}
      <button
        onClick={() => setSettings({
          colorWheels: {
            shadows: { hue: 0, saturation: 0, luminance: 0 },
            midtones: { hue: 0, saturation: 0, luminance: 0 },
            highlights: { hue: 0, saturation: 0, luminance: 0 }
          },
          temperature: 0,
          tint: 0,
          vibrance: 0,
          saturation: 0
        })}
        className="w-full mt-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
      >
        Reset All
      </button>
    </div>
  );
};
