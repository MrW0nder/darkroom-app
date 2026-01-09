import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Trash2, Plus } from 'lucide-react';

interface Preset {
  id: number;
  name: string;
  category: string;
  description?: string;
  exposure: number;
  brightness: number;
  contrast: number;
  highlights: number;
  shadows: number;
  saturation: number;
  sharpness: number;
  created_at: string;
}

interface PresetsPanel

Props {
  currentAdjustments: {
    exposure: number;
    brightness: number;
    contrast: number;
    highlights: number;
    shadows: number;
    saturation: number;
    sharpness: number;
  };
  onApplyPreset: (preset: Preset) => void;
  onSaveCurrentAsPreset: () => void;
}

export const PresetsPanel: React.FC<PresetsPanelProps> = ({
  currentAdjustments,
  onApplyPreset,
  onSaveCurrentAsPreset,
}) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [filteredPresets, setFilteredPresets] = useState<Preset[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetCategory, setNewPresetCategory] = useState('Custom');
  const [newPresetDescription, setNewPresetDescription] = useState('');

  // Fetch presets on mount
  useEffect(() => {
    fetchPresets();
  }, []);

  // Filter presets when category changes
  useEffect(() => {
    if (selectedCategory === 'All') {
      setFilteredPresets(presets);
    } else {
      setFilteredPresets(presets.filter(p => p.category === selectedCategory));
    }
  }, [selectedCategory, presets]);

  const fetchPresets = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/presets/');
      if (response.ok) {
        const data = await response.json();
        setPresets(data);
        
        // Extract unique categories
        const uniqueCategories = ['All', ...new Set(data.map((p: Preset) => p.category))];
        setCategories(uniqueCategories);
      }
    } catch (error) {
      console.error('Failed to fetch presets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/presets/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPresetName,
          category: newPresetCategory,
          description: newPresetDescription,
          ...currentAdjustments,
        }),
      });

      if (response.ok) {
        const newPreset = await response.json();
        setPresets([...presets, newPreset]);
        setShowSaveDialog(false);
        setNewPresetName('');
        setNewPresetDescription('');
        alert(`Preset "${newPreset.name}" saved successfully!`);
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to save preset');
      }
    } catch (error) {
      console.error('Failed to save preset:', error);
      alert('Failed to save preset');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePreset = async (presetId: number, presetName: string) => {
    if (!confirm(`Delete preset "${presetName}"?`)) return;

    setIsLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/presets/${presetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPresets(presets.filter(p => p.id !== presetId));
        alert(`Preset "${presetName}" deleted successfully`);
      }
    } catch (error) {
      console.error('Failed to delete preset:', error);
      alert('Failed to delete preset');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <FolderOpen className="w-5 h-5" />
          Presets
        </h3>
        <button
          onClick={() => setShowSaveDialog(true)}
          className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          title="Save Current Settings as Preset"
        >
          <Save className="w-4 h-4" />
        </button>
      </div>

      {/* Category Filter */}
      <div>
        <label className="block text-gray-300 text-sm mb-2">Category</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Presets List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-gray-400 text-center py-4">Loading presets...</div>
        ) : filteredPresets.length === 0 ? (
          <div className="text-gray-400 text-center py-4">
            No presets found. Create your first preset!
          </div>
        ) : (
          filteredPresets.map(preset => (
            <div
              key={preset.id}
              className="bg-gray-700 p-3 rounded hover:bg-gray-600 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <button
                  onClick={() => onApplyPreset(preset)}
                  className="flex-1 text-left"
                >
                  <div className="text-white font-medium">{preset.name}</div>
                  {preset.description && (
                    <div className="text-gray-400 text-sm mt-1">{preset.description}</div>
                  )}
                  <div className="text-gray-500 text-xs mt-1">{preset.category}</div>
                </button>
                <button
                  onClick={() => handleDeletePreset(preset.id, preset.name)}
                  className="p-1 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Preset"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 space-y-4">
            <h3 className="text-white text-lg font-semibold">Save Preset</h3>
            
            <div>
              <label className="block text-gray-300 text-sm mb-2">Preset Name *</label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                placeholder="My Preset"
              />
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">Category</label>
              <select
                value={newPresetCategory}
                onChange={(e) => setNewPresetCategory(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
              >
                <option value="Custom">Custom</option>
                <option value="Portrait">Portrait</option>
                <option value="Landscape">Landscape</option>
                <option value="Black & White">Black & White</option>
                <option value="Vintage">Vintage</option>
                <option value="Cinematic">Cinematic</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 text-sm mb-2">Description (Optional)</label>
              <textarea
                value={newPresetDescription}
                onChange={(e) => setNewPresetDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                placeholder="Describe your preset..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresetsPanel;