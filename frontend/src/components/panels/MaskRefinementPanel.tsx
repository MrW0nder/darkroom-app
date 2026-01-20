import React, { useState } from 'react';
import { Layers, Circle, Square, Sliders, Eye } from 'lucide-react';

const MaskRefinementPanel: React.FC = () => {
  const [maskType, setMaskType] = useState<'parametric' | 'drawn' | 'raster'>('parametric');
  const [feather, setFeather] = useState(0);
  const [blur, setBlur] = useState(0);
  const [density, setDensity] = useState(100);
  const [invert, setInvert] = useState(false);
  const [showMask, setShowMask] = useState(true);

  const maskTypes = [
    { id: 'parametric', name: 'Parametric', icon: Sliders, desc: 'Based on image properties' },
    { id: 'drawn', name: 'Drawn', icon: Circle, desc: 'Manual brush/gradient' },
    { id: 'raster', name: 'Raster', icon: Square, desc: 'Bitmap mask' },
  ];

  return (
    <div className="bg-gray-900 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Layers className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Mask Refinement</h3>
        </div>
        <button
          onClick={() => setShowMask(!showMask)}
          className={`p-2 rounded ${showMask ? 'bg-purple-600' : 'bg-gray-700'}`}
        >
          <Eye className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Mask Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Mask Type</label>
        <div className="grid grid-cols-3 gap-2">
          {maskTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setMaskType(type.id as any)}
              className={`p-3 rounded-lg border-2 flex flex-col items-center space-y-1 transition ${
                maskType === type.id
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <type.icon className="w-5 h-5 text-gray-300" />
              <span className="text-xs text-gray-300">{type.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Parametric Controls */}
      {maskType === 'parametric' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Luminance Range</label>
            <input type="range" className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Saturation Range</label>
            <input type="range" className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Color Range</label>
            <div className="grid grid-cols-3 gap-2">
              <input type="range" className="w-full" title="Red" />
              <input type="range" className="w-full" title="Green" />
              <input type="range" className="w-full" title="Blue" />
            </div>
          </div>
        </div>
      )}

      {/* Drawn Controls */}
      {maskType === 'drawn' && (
        <div className="space-y-3">
          <div className="flex space-x-2">
            <button className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white">
              Brush
            </button>
            <button className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white">
              Gradient
            </button>
            <button className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white">
              Radial
            </button>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Brush Size</label>
            <input type="range" className="w-full" min="1" max="200" />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Opacity</label>
            <input type="range" className="w-full" min="0" max="100" />
          </div>
        </div>
      )}

      {/* Mask Refinement */}
      <div className="border-t border-gray-700 pt-3 space-y-3">
        <h4 className="text-sm font-medium text-gray-300">Refinement</h4>
        
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Feather: {feather}px
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={feather}
            onChange={(e) => setFeather(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Blur: {blur}px
          </label>
          <input
            type="range"
            min="0"
            max="50"
            value={blur}
            onChange={(e) => setBlur(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Density: {density}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={density}
            onChange={(e) => setDensity(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="invert-mask"
            checked={invert}
            onChange={(e) => setInvert(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="invert-mask" className="text-sm text-gray-300">
            Invert Mask
          </label>
        </div>
      </div>

      {/* Mask Operations */}
      <div className="flex space-x-2">
        <button className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white">
          Combine
        </button>
        <button className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white">
          Subtract
        </button>
        <button className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white">
          Intersect
        </button>
      </div>

      {/* Apply Button */}
      <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white font-medium">
        Apply Mask
      </button>
    </div>
  );
};

export default MaskRefinementPanel;
