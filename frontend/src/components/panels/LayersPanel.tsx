import React, { useState } from 'react';
import { Eye, EyeOff, Trash2, Copy, Lock, Unlock, Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface Layer {
  id: number;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: string;
  thumbnail?: string;
}

interface LayersPanelProps {
  layers?: Layer[];
  selectedLayerId?: number;
  onLayerSelect?: (layerId: number) => void;
  onLayerVisibilityToggle?: (layerId: number) => void;
  onLayerDelete?: (layerId: number) => void;
  onLayerDuplicate?: (layerId: number) => void;
  onLayerLockToggle?: (layerId: number) => void;
  onLayerOpacityChange?: (layerId: number, opacity: number) => void;
  onLayerBlendModeChange?: (layerId: number, mode: string) => void;
  onLayerReorder?: (layerId: number, direction: 'up' | 'down') => void;
  onLayerMergeDown?: (layerId: number) => void;
  onNewLayer?: () => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  layers = [],
  selectedLayerId,
  onLayerSelect,
  onLayerVisibilityToggle,
  onLayerDelete,
  onLayerDuplicate,
  onLayerLockToggle,
  onLayerOpacityChange,
  onLayerBlendModeChange,
  onLayerReorder,
  onLayerMergeDown,
  onNewLayer
}) => {
  const [expandedLayerId, setExpandedLayerId] = useState<number | null>(null);

  const blendModes = [
    'Normal', 'Multiply', 'Screen', 'Overlay', 'Darken', 'Lighten',
    'Color Dodge', 'Color Burn', 'Hard Light', 'Soft Light', 'Difference', 'Exclusion'
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-white font-semibold">Layers</h3>
        <button
          onClick={onNewLayer}
          className="p-2 hover:bg-gray-700 rounded text-white"
          title="New Layer"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto">
        {layers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No layers yet</p>
            <p className="text-sm mt-2">Click + to create a new layer</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {layers.map((layer, index) => (
              <div key={layer.id} className="bg-gray-700 rounded overflow-hidden">
                {/* Layer Row */}
                <div
                  className={`p-3 flex items-center gap-1 cursor-pointer hover:bg-gray-600 ${
                    selectedLayerId === layer.id ? 'bg-blue-900/30 border-l-2 border-blue-500' : ''
                  }`}
                  onClick={() => onLayerSelect?.(layer.id)}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center text-gray-500 text-xs flex-shrink-0">
                    {layer.thumbnail ? (
                      <img src={layer.thumbnail} alt={layer.name} className="w-full h-full object-cover rounded" />
                    ) : (
                      'IMG'
                    )}
                  </div>

                  {/* Layer Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{layer.name}</div>
                    <div className="text-gray-400 text-xs">{layer.blendMode} • {layer.opacity}%</div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerVisibilityToggle?.(layer.id);
                      }}
                      className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white"
                      title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                    >
                      {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLayerLockToggle?.(layer.id);
                      }}
                      className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white"
                      title={layer.locked ? 'Unlock Layer' : 'Lock Layer'}
                    >
                      {layer.locked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedLayerId(expandedLayerId === layer.id ? null : layer.id);
                      }}
                      className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white"
                      title="Layer Options"
                    >
                      {expandedLayerId === layer.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Options */}
                {expandedLayerId === layer.id && (
                  <div className="p-3 border-t border-gray-700 space-y-3">
                    {/* Opacity Slider */}
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Opacity</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={layer.opacity}
                        onChange={(e) => onLayerOpacityChange?.(layer.id, parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    {/* Blend Mode */}
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Blend Mode</label>
                      <select
                        value={layer.blendMode}
                        onChange={(e) => onLayerBlendModeChange?.(layer.id, e.target.value)}
                        className="w-full bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                      >
                        {blendModes.map(mode => (
                          <option key={mode} value={mode}>{mode}</option>
                        ))}
                      </select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onLayerDuplicate?.(layer.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                        title="Duplicate Layer"
                      >
                        <Copy size={14} />
                        Duplicate
                      </button>
                      <button
                        onClick={() => onLayerDelete?.(layer.id)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-900/50 hover:bg-red-900 text-white text-sm rounded"
                        title="Delete Layer"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>

                    {/* Reorder Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onLayerReorder?.(layer.id, 'up')}
                        disabled={index === 0}
                        className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Move Up
                      </button>
                      <button
                        onClick={() => onLayerReorder?.(layer.id, 'down')}
                        disabled={index === layers.length - 1}
                        className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Move Down
                      </button>
                    </div>

                    {/* Merge Down */}
                    <button
                      onClick={() => onLayerMergeDown?.(layer.id)}
                      disabled={index === layers.length - 1}
                      className="w-full px-3 py-1.5 bg-purple-700 hover:bg-purple-600 text-white text-sm rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Merge Down
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-700 text-xs text-gray-400">
        {layers.length} {layers.length === 1 ? 'layer' : 'layers'}
      </div>
    </div>
  );
};

export default LayersPanel;