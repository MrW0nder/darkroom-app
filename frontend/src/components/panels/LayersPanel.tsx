/**
 * LayersPanel - Layer management UI with full API integration
 * Supports creating, editing, reordering, and managing layers
 */
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Trash2, Copy, Lock, Unlock, Plus, ChevronDown, ChevronUp, Upload, Type, Square } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import axios from 'axios';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:8000';

interface LayerData {
  id: number;
  project_id: number;
  type: string;
  name: string;
  content: string | null;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  opacity: number;
  blend_mode: string;
  visible: boolean;
  locked: boolean;
  z_index: number;
  created_at: string;
  updated_at: string;
}

interface LayersPanelProps {
  projectId?: number;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({ projectId }) => {
  const { state, setLayers, setSelectedLayerId, addToHistory } = useEditor();
  const [expandedLayerId, setExpandedLayerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  const blendModes = [
    'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
    'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'
  ];

  // Load layers when project changes
  useEffect(() => {
    if (projectId) {
      loadLayers();
    }
  }, [projectId]);

  const loadLayers = async () => {
    if (!projectId) return;
    
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/layers/project/${projectId}`);
      setLayers(response.data);
    } catch (error) {
      console.error('Failed to load layers:', error);
    } finally {
      setLoading(false);
    }
  };

  const createLayer = async (type: 'image' | 'text' | 'shape', file?: File) => {
    if (!projectId) return;

    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('layer_data', JSON.stringify({
        project_id: projectId,
        type: type,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Layer`
      }));
      
      if (file) {
        formData.append('file', file);
      }

      const response = await axios.post(`${API_URL}/api/layers/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await loadLayers();
      setSelectedLayerId(response.data.id);
      addToHistory({
        type: 'layer_create',
        description: `Created ${type} layer`,
        layerId: response.data.id
      });
      
      setShowCreateMenu(false);
    } catch (error) {
      console.error('Failed to create layer:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLayer = async (layerId: number, updates: Partial<LayerData>) => {
    try {
      await axios.put(`${API_URL}/api/layers/${layerId}`, updates);
      await loadLayers();
      addToHistory({
        type: 'layer_update',
        description: 'Updated layer properties',
        layerId
      });
    } catch (error) {
      console.error('Failed to update layer:', error);
    }
  };

  const deleteLayer = async (layerId: number) => {
    if (!confirm('Are you sure you want to delete this layer?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/layers/${layerId}`);
      await loadLayers();
      if (state.selectedLayerId === layerId) {
        setSelectedLayerId(null);
      }
      addToHistory({
        type: 'layer_delete',
        description: 'Deleted layer',
        layerId
      });
    } catch (error) {
      console.error('Failed to delete layer:', error);
    }
  };

  const duplicateLayer = async (layerId: number) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/api/layers/${layerId}/duplicate`);
      await loadLayers();
      setSelectedLayerId(response.data.id);
      addToHistory({
        type: 'layer_duplicate',
        description: 'Duplicated layer',
        layerId: response.data.id
      });
    } catch (error) {
      console.error('Failed to duplicate layer:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLayerVisibility = async (layerId: number) => {
    try {
      await axios.post(`${API_URL}/api/layers/${layerId}/toggle-visibility`);
      await loadLayers();
    } catch (error) {
      console.error('Failed to toggle layer visibility:', error);
    }
  };

  const toggleLayerLock = async (layerId: number) => {
    try {
      await axios.post(`${API_URL}/api/layers/${layerId}/toggle-lock`);
      await loadLayers();
    } catch (error) {
      console.error('Failed to toggle layer lock:', error);
    }
  };

  const reorderLayers = async (layerId: number, direction: 'up' | 'down') => {
    const layers = [...state.layers];
    const currentIndex = layers.findIndex(l => l.id === layerId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= layers.length) return;

    // Swap layers
    [layers[currentIndex], layers[newIndex]] = [layers[newIndex], layers[currentIndex]];
    
    // Update z_index values
    const reorderedIds = layers.map(l => l.id);
    
    try {
      await axios.post(`${API_URL}/api/layers/reorder`, {
        layer_ids: reorderedIds
      });
      await loadLayers();
      addToHistory({
        type: 'layer_reorder',
        description: `Moved layer ${direction}`,
        layerId
      });
    } catch (error) {
      console.error('Failed to reorder layers:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      createLayer('image', file);
    }
    event.target.value = ''; // Reset input
  };

  const getLayerThumbnail = (layer: { type: string; content: string | null }) => {
    if (layer.type === 'image' && layer.content) {
      const contentPath = layer.content.replace(/\\/g, '/');
      if (contentPath.startsWith('/storage/')) {
        return `${API_URL}${contentPath}`;
      }
      return `${API_URL}/storage/${contentPath}`;
    }
    return null;
  };

  return (
    <div className="flex flex-col h-full bg-gray-800 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold">Layers</h3>
        <div className="relative">
          <button
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="p-2 hover:bg-gray-700 rounded text-white"
            title="New Layer"
          >
            <Plus size={18} />
          </button>
          
          {showCreateMenu && (
            <div className="absolute right-0 top-full mt-1 bg-gray-700 rounded-lg shadow-lg py-2 z-10 min-w-[160px]">
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => handleFileUpload(e as unknown as React.ChangeEvent<HTMLInputElement>);
                  input.click();
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-600 flex items-center gap-2"
              >
                <Upload size={16} />
                Image Layer
              </button>
              <button
                onClick={() => createLayer('text')}
                className="w-full px-4 py-2 text-left hover:bg-gray-600 flex items-center gap-2"
              >
                <Type size={16} />
                Text Layer
              </button>
              <button
                onClick={() => createLayer('shape')}
                className="w-full px-4 py-2 text-left hover:bg-gray-600 flex items-center gap-2"
              >
                <Square size={16} />
                Shape Layer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Layers List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading layers...</p>
          </div>
        ) : state.layers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No layers yet</p>
            <p className="text-sm mt-2">Click + to create a new layer</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {/* Render layers in reverse order (top layer first) */}
            {[...state.layers].reverse().map((layer, index) => {
              const actualIndex = state.layers.length - 1 - index;
              const thumbnail = getLayerThumbnail(layer);
              
              return (
                <div key={layer.id} className="bg-gray-700 rounded overflow-hidden">
                  {/* Layer Row */}
                  <div
                    className={`p-3 flex items-center gap-1 cursor-pointer hover:bg-gray-600 ${
                      state.selectedLayerId === layer.id ? 'bg-blue-900/30 border-l-2 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedLayerId(layer.id)}
                  >
                    {/* Thumbnail */}
                    <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center text-gray-500 text-xs flex-shrink-0 overflow-hidden">
                      {thumbnail ? (
                        <img src={thumbnail} alt={layer.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          {layer.type === 'text' ? 'T' : layer.type === 'shape' ? '□' : 'IMG'}
                        </div>
                      )}
                    </div>

                    {/* Layer Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-sm font-medium truncate">{layer.name}</div>
                      <div className="text-gray-400 text-xs">
                        {layer.blend_mode} • {Math.round(layer.opacity * 100)}%
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLayerVisibility(layer.id);
                        }}
                        className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white"
                        title={layer.visible ? 'Hide Layer' : 'Show Layer'}
                      >
                        {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLayerLock(layer.id);
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
                        <label className="text-xs text-gray-400 block mb-1">
                          Opacity ({Math.round(layer.opacity * 100)}%)
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={Math.round(layer.opacity * 100)}
                          onChange={(e) => updateLayer(layer.id, { 
                            opacity: parseInt(e.target.value) / 100 
                          })}
                          className="w-full"
                        />
                      </div>

                      {/* Blend Mode */}
                      <div>
                        <label className="text-xs text-gray-400 block mb-1">Blend Mode</label>
                        <select
                          value={layer.blend_mode}
                          onChange={(e) => updateLayer(layer.id, { blend_mode: e.target.value })}
                          className="w-full bg-gray-700 text-white text-sm px-2 py-1 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                        >
                          {blendModes.map(mode => (
                            <option key={mode} value={mode}>
                              {mode.charAt(0).toUpperCase() + mode.slice(1).replace('-', ' ')}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => duplicateLayer(layer.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded"
                          title="Duplicate Layer"
                        >
                          <Copy size={14} />
                          Duplicate
                        </button>
                        <button
                          onClick={() => deleteLayer(layer.id)}
                          disabled={layer.locked}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-red-900/50 hover:bg-red-900 text-white text-sm rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Delete Layer"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>

                      {/* Reorder Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => reorderLayers(layer.id, 'up')}
                          disabled={actualIndex === state.layers.length - 1}
                          className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Move Up
                        </button>
                        <button
                          onClick={() => reorderLayers(layer.id, 'down')}
                          disabled={actualIndex === 0}
                          className="flex-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Move Down
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      
                      {/* Click outside to close create menu */}
      {showCreateMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowCreateMenu(false)}
        />
      )}
    </div>
  );
};

export default LayersPanel; // Updated with full API integration