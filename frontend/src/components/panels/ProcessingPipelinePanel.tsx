import React, { useState } from 'react';
import { GitBranch, Plus, Eye, EyeOff, GripVertical, Settings } from 'lucide-react';

interface Module {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  order: number;
  parameters: any;
}

const ProcessingPipelinePanel: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([
    { id: '1', type: 'exposure', name: 'Exposure', enabled: true, order: 0, parameters: {} },
    { id: '2', type: 'color_balance', name: 'Color Balance', enabled: true, order: 1, parameters: {} },
    { id: '3', type: 'tone_curve', name: 'Tone Curve', enabled: false, order: 2, parameters: {} },
  ]);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  const availableModules = [
    { type: 'exposure', name: 'Exposure', category: 'tone' },
    { type: 'color_balance', name: 'Color Balance', category: 'color' },
    { type: 'tone_curve', name: 'Tone Curve', category: 'tone' },
    { type: 'sharpen', name: 'Sharpen', category: 'detail' },
    { type: 'denoise', name: 'Denoise', category: 'detail' },
    { type: 'lens_correction', name: 'Lens Correction', category: 'correction' },
    { type: 'local_contrast', name: 'Local Contrast', category: 'tone' },
    { type: 'color_zones', name: 'Color Zones', category: 'color' },
    { type: 'vignette', name: 'Vignette', category: 'effect' },
    { type: 'grain', name: 'Film Grain', category: 'effect' },
  ];

  const toggleModule = (id: string) => {
    setModules(prev => prev.map(m => 
      m.id === id ? { ...m, enabled: !m.enabled } : m
    ));
  };

  const removeModule = (id: string) => {
    setModules(prev => prev.filter(m => m.id !== id));
    if (selectedModule === id) setSelectedModule(null);
  };

  const addModule = (type: string, name: string) => {
    const newModule: Module = {
      id: Date.now().toString(),
      type,
      name,
      enabled: true,
      order: modules.length,
      parameters: {},
    };
    setModules(prev => [...prev, newModule]);
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GitBranch className="w-5 h-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Processing Pipeline</h3>
        </div>
        <div className="flex space-x-2">
          <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white">
            Presets
          </button>
          <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white">
            Save
          </button>
        </div>
      </div>

      {/* Module Stack */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-300">Module Stack</h4>
          <span className="text-xs text-gray-500">{modules.length} modules</span>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {modules.map((module, index) => (
            <div
              key={module.id}
              className={`p-3 rounded-lg border ${
                selectedModule === module.id
                  ? 'border-green-500 bg-green-500/10'
                  : 'border-gray-700 bg-gray-800'
              } ${!module.enabled ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center space-x-2">
                <button className="cursor-grab text-gray-500 hover:text-gray-300">
                  <GripVertical className="w-4 h-4" />
                </button>

                <button
                  onClick={() => toggleModule(module.id)}
                  className="p-1"
                >
                  {module.enabled ? (
                    <Eye className="w-4 h-4 text-green-400" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium">{module.name}</span>
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                  </div>
                  <span className="text-xs text-gray-500 capitalize">{module.type.replace('_', ' ')}</span>
                </div>

                <button
                  onClick={() => setSelectedModule(module.id === selectedModule ? null : module.id)}
                  className="p-1 text-gray-500 hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                </button>

                <button
                  onClick={() => removeModule(module.id)}
                  className="px-2 py-1 text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>

              {/* Module Parameters (if selected) */}
              {selectedModule === module.id && (
                <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                  <div className="text-xs text-gray-400">Module Parameters</div>
                  <div className="space-y-2">
                    <input
                      type="range"
                      className="w-full"
                      placeholder="Adjust parameters..."
                    />
                    <input
                      type="range"
                      className="w-full"
                      placeholder="Adjust parameters..."
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Module */}
      <div className="border-t border-gray-700 pt-3">
        <div className="flex items-center space-x-2 mb-2">
          <Plus className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-300">Add Module</span>
        </div>
        <select
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
          onChange={(e) => {
            if (e.target.value) {
              const module = availableModules.find(m => m.type === e.target.value);
              if (module) {
                addModule(module.type, module.name);
                e.target.value = '';
              }
            }
          }}
        >
          <option value="">Select a module...</option>
          {['tone', 'color', 'detail', 'correction', 'effect'].map(category => (
            <optgroup key={category} label={category.toUpperCase()}>
              {availableModules
                .filter(m => m.category === category)
                .map(module => (
                  <option key={module.type} value={module.type}>
                    {module.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 text-center bg-gray-800 rounded p-2">
        Non-destructive processing • Drag to reorder
      </div>
    </div>
  );
};

export default ProcessingPipelinePanel;
