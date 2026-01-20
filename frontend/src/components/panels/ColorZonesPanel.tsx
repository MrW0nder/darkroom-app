import React, { useState } from 'react';
import { Palette, RefreshCw } from 'lucide-react';

const ColorZonesPanel: React.FC = () => {
  const [selectedZone, setSelectedZone] = useState('red');
  const [globalSaturation, setGlobalSaturation] = useState(0);
  
  const [zoneAdjustments, setZoneAdjustments] = useState({
    red: { hue: 0, saturation: 0, luminance: 0 },
    orange: { hue: 0, saturation: 0, luminance: 0 },
    yellow: { hue: 0, saturation: 0, luminance: 0 },
    green: { hue: 0, saturation: 0, luminance: 0 },
    cyan: { hue: 0, saturation: 0, luminance: 0 },
    blue: { hue: 0, saturation: 0, luminance: 0 },
    purple: { hue: 0, saturation: 0, luminance: 0 },
    magenta: { hue: 0, saturation: 0, luminance: 0 },
  });

  const colorZones = [
    { id: 'red', name: 'Red', color: '#ef4444', range: '345°-15°' },
    { id: 'orange', name: 'Orange', color: '#f97316', range: '15°-45°' },
    { id: 'yellow', name: 'Yellow', color: '#eab308', range: '45°-75°' },
    { id: 'green', name: 'Green', color: '#22c55e', range: '75°-165°' },
    { id: 'cyan', name: 'Cyan', color: '#06b6d4', range: '165°-195°' },
    { id: 'blue', name: 'Blue', color: '#3b82f6', range: '195°-255°' },
    { id: 'purple', name: 'Purple', color: '#a855f7', range: '255°-315°' },
    { id: 'magenta', name: 'Magenta', color: '#ec4899', range: '315°-345°' },
  ];

  const updateZone = (property: 'hue' | 'saturation' | 'luminance', value: number) => {
    setZoneAdjustments(prev => ({
      ...prev,
      [selectedZone]: {
        ...prev[selectedZone as keyof typeof prev],
        [property]: value
      }
    }));
  };

  const resetZone = () => {
    setZoneAdjustments(prev => ({
      ...prev,
      [selectedZone]: { hue: 0, saturation: 0, luminance: 0 }
    }));
  };

  const resetAll = () => {
    const reset = Object.keys(zoneAdjustments).reduce((acc, zone) => ({
      ...acc,
      [zone]: { hue: 0, saturation: 0, luminance: 0 }
    }), {});
    setZoneAdjustments(reset as any);
    setGlobalSaturation(0);
  };

  const currentAdjustment = zoneAdjustments[selectedZone as keyof typeof zoneAdjustments];

  return (
    <div className="bg-gray-900 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Palette className="w-5 h-5 text-pink-400" />
          <h3 className="text-lg font-semibold text-white">Color Zones</h3>
        </div>
        <button
          onClick={resetAll}
          className="p-2 bg-gray-700 hover:bg-gray-600 rounded"
          title="Reset All"
        >
          <RefreshCw className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Color Wheel */}
      <div className="relative">
        <div className="w-48 h-48 mx-auto rounded-full overflow-hidden grid grid-cols-4 grid-rows-2">
          {colorZones.map((zone) => (
            <button
              key={zone.id}
              onClick={() => setSelectedZone(zone.id)}
              className={`transition ${
                selectedZone === zone.id ? 'ring-4 ring-white ring-inset z-10' : ''
              }`}
              style={{ backgroundColor: zone.color }}
              title={`${zone.name} (${zone.range})`}
            />
          ))}
        </div>
        <div className="text-center mt-2">
          <span className="text-sm text-gray-300 capitalize">{selectedZone}</span>
          <span className="text-xs text-gray-500 ml-2">
            {colorZones.find(z => z.id === selectedZone)?.range}
          </span>
        </div>
      </div>

      {/* Zone Adjustments */}
      <div className="space-y-3 border-t border-gray-700 pt-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-300">Zone Adjustments</h4>
          <button
            onClick={resetZone}
            className="text-xs text-gray-400 hover:text-white"
          >
            Reset Zone
          </button>
        </div>

        {/* Hue Shift */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Hue: {currentAdjustment.hue > 0 ? '+' : ''}{currentAdjustment.hue}°
          </label>
          <input
            type="range"
            min="-180"
            max="180"
            value={currentAdjustment.hue}
            onChange={(e) => updateZone('hue', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>-180°</span>
            <span>0°</span>
            <span>+180°</span>
          </div>
        </div>

        {/* Saturation */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Saturation: {currentAdjustment.saturation > 0 ? '+' : ''}{currentAdjustment.saturation}
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={currentAdjustment.saturation}
            onChange={(e) => updateZone('saturation', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>-100</span>
            <span>0</span>
            <span>+100</span>
          </div>
        </div>

        {/* Luminance */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Luminance: {currentAdjustment.luminance > 0 ? '+' : ''}{currentAdjustment.luminance}
          </label>
          <input
            type="range"
            min="-100"
            max="100"
            value={currentAdjustment.luminance}
            onChange={(e) => updateZone('luminance', parseInt(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-600 mt-1">
            <span>-100</span>
            <span>0</span>
            <span>+100</span>
          </div>
        </div>
      </div>

      {/* Global Saturation */}
      <div className="border-t border-gray-700 pt-3">
        <label className="block text-sm text-gray-400 mb-1">
          Global Saturation: {globalSaturation > 0 ? '+' : ''}{globalSaturation}
        </label>
        <input
          type="range"
          min="-100"
          max="100"
          value={globalSaturation}
          onChange={(e) => setGlobalSaturation(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Apply Button */}
      <button className="w-full px-4 py-2 bg-pink-600 hover:bg-pink-700 rounded text-white font-medium">
        Apply Color Zones
      </button>

      {/* Zone Coverage Info */}
      <div className="text-xs text-gray-500 text-center">
        Targeted color adjustments preserve natural look
      </div>
    </div>
  );
};

export default ColorZonesPanel;