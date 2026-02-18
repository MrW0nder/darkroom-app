/**
 * Editor - Main editing interface
 * Hybrid Lightroom + Photoshop layout with full tool integration
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { EditorProvider } from '../contexts/EditorContext.js'; // Added .js extension
import { useEditor } from '../contexts/EditorContext.js';
import MainCanvas from '../components/editor/MainCanvas.js'; // Added .js extension
import AdjustmentsPanel from '../components/panels/AdjustmentsPanel.js'; // Added .js extension
import CropTool from '../components/tools/CropTool.js'; // Added .js extension
import BrushTool from '../components/tools/BrushTool.js'; // Added .js extension
import TextShapesTool from '../components/tools/TextShapesTool.js'; // Added .js extension
import PresetsPanel from '../components/panels/PresetsPanel.js'; // Added .js extension
import HistoryPanel from '../components/panels/HistoryPanel.js'; // Added .js extension
import ShortcutsPanel from '../components/panels/ShortcutsPanel.js'; // Added .js extension
import LayersPanel from '../components/panels/LayersPanel.js';
import PhotoGallery from '../components/PhotoGallery.js';
import useKeyboard from '../hooks/useKeyboard.js'; // Added .js extension
import type { Tool } from '../hooks/useKeyboard.js'; // Added type-only import
import { Move, Crop, Paintbrush, Type, Square, HelpCircle, ChevronLeft, ChevronRight, Target } from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:8000';

interface EditorPageProps {
  projectId: number;
  onClose: () => void;  currentView?: 'library' | 'editor';
  onViewChange?: (view: 'library' | 'editor') => void;}

class EditorErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Editor crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-red-900/30 border border-red-800 rounded-lg p-4 text-red-200">
            <h2 className="text-lg font-semibold mb-2">Editor error</h2>
            <p className="text-sm break-words">{this.state.error?.message || 'Unknown error'}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const resolveImageUrl = (content: string | null) => {
  if (!content) return '';
  if (content.startsWith('data:')) return content;
  if (content.startsWith('http://') || content.startsWith('https://')) return content;
  if (content.startsWith('/storage/')) return `${API_URL}${content}`;
  const filename = content.split(/[/\\]/).pop();
  return filename ? `${API_URL}/storage/originals/${filename}` : '';
};

const adjustmentKeys = [
  'brightness',
  'contrast',
  'saturation',
  'exposure',
  'highlights',
  'shadows',
  'sharpness',
] as const;

const EditorInner: React.FC<EditorPageProps> = ({ projectId, onClose, currentView = 'editor', onViewChange }) => {
  console.log('EditorInner rendering with projectId:', projectId);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'preview' | 'edit' | 'layers'>('preview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [showZoomMenu, setShowZoomMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recenterNonce, setRecenterNonce] = useState(0);
  const [isFullscreenView, setIsFullscreenView] = useState(false);
  const [showPhotoFilter, setShowPhotoFilter] = useState(false);
  const [photoFilter, setPhotoFilter] = useState<'all' | 'liked' | 'locked' | 'edited' | 'not-edited'>('all');
  const [editedLayers, setEditedLayers] = useState<Set<number>>(new Set());
  const [lockedLayers, setLockedLayers] = useState<Set<number>>(new Set());
  const [originalAdjustments, setOriginalAdjustments] = useState<Record<number, any>>({});
  // Initialize layerAdjustments from localStorage immediately (synchronously)
  const [layerAdjustments, setLayerAdjustments] = useState<Record<number, any>>(() => {
    const savedLayerAdjustments = localStorage.getItem(`darkroom-layer-adjustments-${projectId}`);
    if (savedLayerAdjustments) {
      try {
        return JSON.parse(savedLayerAdjustments);
      } catch (e) {
        console.error('Failed to parse layer adjustments from localStorage', e);
      }
    }
    return {};
  });
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  const { state, setCurrentProject, setLayers, setSelectedLayerId, updateAdjustments } = useEditor();

  // Load edited layers from localStorage on mount
  useEffect(() => {
    const savedEditedLayers = localStorage.getItem(`darkroom-edited-layers-${projectId}`);
    if (savedEditedLayers) {
      try {
        const parsed = JSON.parse(savedEditedLayers);
        setEditedLayers(new Set(parsed));
      } catch (e) {
        console.error('Failed to parse edited layers from localStorage', e);
      }
    }
  }, [projectId]);

  // Save edited layers to localStorage whenever it changes
  useEffect(() => {
    if (editedLayers.size > 0) {
      localStorage.setItem(`darkroom-edited-layers-${projectId}`, JSON.stringify(Array.from(editedLayers)));
    } else {
      // Remove from localStorage if no layers are edited
      localStorage.removeItem(`darkroom-edited-layers-${projectId}`);
    }
  }, [editedLayers, projectId]);

  // Save layer adjustments to localStorage whenever they change
  useEffect(() => {
    if (Object.keys(layerAdjustments).length > 0) {
      localStorage.setItem(`darkroom-layer-adjustments-${projectId}`, JSON.stringify(layerAdjustments));
    } else {
      localStorage.removeItem(`darkroom-layer-adjustments-${projectId}`);
    }
  }, [layerAdjustments, projectId]);

  // Check if current adjustments mean the selected layer should be marked as edited
  useEffect(() => {
    if (state.selectedLayerId) {
      const current = state.adjustments;
      const isAtDefaults = 
        current.brightness === 0 &&
        current.contrast === 0 &&
        current.saturation === 0 &&
        current.exposure === 0 &&
        current.highlights === 0 &&
        current.shadows === 0 &&
        current.sharpness === 1.0;
      
      setEditedLayers(prev => {
        const newSet = new Set(prev);
        const wasEdited = prev.has(state.selectedLayerId!);
        
        if (isAtDefaults && wasEdited) {
          newSet.delete(state.selectedLayerId!);
          return newSet;
        } else if (!isAtDefaults && !wasEdited) {
          newSet.add(state.selectedLayerId!);
          return newSet;
        }
        return prev; // No change needed
      });
    }
  }, [state.adjustments, state.selectedLayerId]);

  // Keep per-layer adjustments in sync with slider changes
  useEffect(() => {
    if (!state.selectedLayerId) return;

    setLayerAdjustments(prev => {
      const current = prev[state.selectedLayerId!];
      const next = { ...state.adjustments };

      if (current && adjustmentKeys.every((key) => current[key] === next[key])) {
        return prev;
      }

      return {
        ...prev,
        [state.selectedLayerId!]: next,
      };
    });
  }, [state.adjustments, state.selectedLayerId]);

  useEffect(() => {
    const loadProject = async () => {
      try {
        console.log('Loading project:', projectId);
        setLoading(true);
        const [projectResponse, layersResponse] = await Promise.all([
          axios.get(`${API_URL}/api/projects/${projectId}`),
          axios.get(`${API_URL}/api/layers`, { params: { project_id: projectId } })
        ]);
        console.log('Project loaded:', projectResponse.data);
        console.log('Layers loaded:', layersResponse.data);
        setCurrentProject(projectResponse.data);
        const layers = layersResponse.data || [];
        
        if (layers.length > 0) {
          const firstLayerId = layers[0].id;
          setLayers(layers);
          setSelectedLayerId(firstLayerId);
          
          // Load saved adjustments for the first layer if they exist
          const savedAdjustments = layerAdjustments[firstLayerId];
          const adjustmentsToApply = savedAdjustments || {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            exposure: 0,
            highlights: 0,
            shadows: 0,
            sharpness: 1.0,
          };
          updateAdjustments(adjustmentsToApply, { recordHistory: false });
        } else {
          setLayers(layers);
        }
        // Store original adjustments for each layer (default state)
        const originals: Record<number, any> = {};
        layers.forEach((layer: any) => {
          originals[layer.id] = {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            exposure: 0,
            highlights: 0,
            shadows: 0,
            sharpness: 1.0,
          };
        });
        setOriginalAdjustments(originals);
        setError(null);
        console.log('Project initialization complete');
      } catch (err: any) {
        console.error('Error loading project:', err);
        setError(err.response?.data?.detail || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const element = canvasContainerRef.current;

    const updateSize = () => {
      const styles = getComputedStyle(element);
      const paddingX = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const paddingY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
      const rect = element.getBoundingClientRect();
      const width = Math.max(200, rect.width - paddingX);
      const height = Math.max(150, rect.height - paddingY);
      setCanvasSize({ width, height });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const selectedLayer = useMemo(
    () => state.layers.find((layer) => layer.id === state.selectedLayerId) || null,
    [state.layers, state.selectedLayerId]
  );

  const sortedLayers = useMemo(
    () => {
      const layersArray = Array.isArray(state.layers) ? state.layers : [];
      return [...layersArray].sort((a, b) => (a.z_index ?? 0) - (b.z_index ?? 0));
    },
    [state.layers]
  );

  const layersForPanel = useMemo(
    () => (Array.isArray(sortedLayers) ? sortedLayers : []).map((layer, index) => {
      const filename = layer.content ? layer.content.split(/[/\\]/).pop() : null;
      return {
        id: layer.id,
        name: filename || `Layer ${index + 1}`,
        visible: layer.visible,
        locked: layer.locked,
        opacity: layer.opacity ?? 100,
        blendMode: layer.blend_mode ?? 'Normal',
        thumbnail: resolveImageUrl(layer.content ?? null),
      };
    }),
    [sortedLayers]
  );

  const isSelectedLocked = useMemo(
    () => (state.selectedLayerId ? lockedLayers.has(state.selectedLayerId) : false),
    [lockedLayers, state.selectedLayerId]
  );

  useEffect(() => {
    setLockedLayers(new Set(state.layers.filter((layer) => layer.locked).map((layer) => layer.id)));
  }, [state.layers]);

  const selectedImageUrl = useMemo(
    () => resolveImageUrl(selectedLayer?.content ?? null),
    [selectedLayer]
  );

  useEffect(() => {
    if (isSelectedLocked && activeTool) {
      setActiveTool(null);
    }
  }, [isSelectedLocked, activeTool]);

  const handleSelectPhoto = (layer: any) => {
    // Save current adjustments for the previously selected layer
    if (state.selectedLayerId) {
      const currentAdjustments = { ...state.adjustments };
      setLayerAdjustments(prev => ({
        ...prev,
        [state.selectedLayerId]: currentAdjustments
      }));
    }
    
    // Load adjustments for the newly selected layer (or defaults if none exist)
    const savedAdjustments = layerAdjustments[layer.id];
    const adjustmentsToLoad = savedAdjustments || {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      highlights: 0,
      shadows: 0,
      sharpness: 1.0,
    };
    
    // Update selected layer ID
    setSelectedLayerId(layer.id);
    
    // Apply adjustments for the newly selected layer
    updateAdjustments(adjustmentsToLoad, { recordHistory: false });
    
    // Check if these adjustments mean the layer is edited
    const isAtDefaults = 
      adjustmentsToLoad.brightness === 0 &&
      adjustmentsToLoad.contrast === 0 &&
      adjustmentsToLoad.saturation === 0 &&
      adjustmentsToLoad.exposure === 0 &&
      adjustmentsToLoad.highlights === 0 &&
      adjustmentsToLoad.shadows === 0 &&
      adjustmentsToLoad.sharpness === 1.0;
    
    setEditedLayers(prev => {
      const newSet = new Set(prev);
      if (isAtDefaults) {
        newSet.delete(layer.id);
      } else {
        newSet.add(layer.id);
      }
      return newSet;
    });
  };

  const buildLayerPayload = (layer: any, overrides: Partial<any>) => ({
    project_id: layer.project_id,
    type: layer.type,
    content: layer.content,
    z_index: layer.z_index ?? 0,
    locked: layer.locked ?? false,
    opacity: layer.opacity ?? 100,
    visible: layer.visible ?? true,
    x: layer.x ?? 0,
    y: layer.y ?? 0,
    width: layer.width ?? null,
    height: layer.height ?? null,
    blend_mode: layer.blend_mode ?? null,
    ...overrides,
  });

  const updateLayerRecord = async (layerId: number, overrides: Partial<any>) => {
    const layer = state.layers.find((entry) => entry.id === layerId);
    if (!layer) return;

    const payload = buildLayerPayload(layer, overrides);
    await axios.put(`${API_URL}/api/layers/${layerId}`, payload);
    setLayers(state.layers.map((entry) => (
      entry.id === layerId ? { ...entry, ...overrides } : entry
    )));
  };

  const toggleLayerVisibility = (layerId: number) => {
    const layer = state.layers.find((entry) => entry.id === layerId);
    if (!layer) return;
    updateLayerRecord(layerId, { visible: !layer.visible });
  };

  const toggleLayerLock = (layerId: number) => {
    const layer = state.layers.find((entry) => entry.id === layerId);
    if (!layer) return;
    updateLayerRecord(layerId, { locked: !layer.locked });
  };

  const handleLayerSelect = (layerId: number) => {
    const layer = state.layers.find((entry) => entry.id === layerId);
    if (layer) {
      handleSelectPhoto(layer);
    }
  };

  const handleLayerReorder = async (layerId: number, direction: 'up' | 'down') => {
    const currentIndex = sortedLayers.findIndex((layer) => layer.id === layerId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedLayers.length) return;

    const currentLayer = sortedLayers[currentIndex];
    const targetLayer = sortedLayers[targetIndex];

    const currentZ = currentLayer.z_index ?? currentIndex;
    const targetZ = targetLayer.z_index ?? targetIndex;

    const updatedLayers = state.layers.map((entry) => {
      if (entry.id === currentLayer.id) {
        return { ...entry, z_index: targetZ };
      }
      if (entry.id === targetLayer.id) {
        return { ...entry, z_index: currentZ };
      }
      return entry;
    });
    setLayers(updatedLayers);

    await Promise.all([
      axios.put(`${API_URL}/api/layers/${currentLayer.id}`, buildLayerPayload(currentLayer, { z_index: targetZ })),
      axios.put(`${API_URL}/api/layers/${targetLayer.id}`, buildLayerPayload(targetLayer, { z_index: currentZ })),
    ]);
  };

  const handleNewLayer = async () => {
    const maxZ = sortedLayers.reduce((max, layer) => Math.max(max, layer.z_index ?? 0), 0);
    const payload = {
      project_id: projectId,
      type: 'image',
      content: null,
      z_index: maxZ + 1,
      locked: false,
      opacity: 100,
      visible: true,
      x: 0,
      y: 0,
      width: null,
      height: null,
      blend_mode: 'normal',
    };
    const response = await axios.post(`${API_URL}/api/layers`, payload);
    const newLayerId = response.data.layer;
    setLayers([...state.layers, { id: newLayerId, ...payload }]);
    setSelectedLayerId(newLayerId);
    updateAdjustments({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      highlights: 0,
      shadows: 0,
      sharpness: 1.0,
    }, { recordHistory: false });
  };

  const handleDuplicateLayer = async (layerId: number) => {
    const layer = state.layers.find((entry) => entry.id === layerId);
    if (!layer) return;

    const maxZ = sortedLayers.reduce((max, entry) => Math.max(max, entry.z_index ?? 0), 0);
    const payload = buildLayerPayload(layer, {
      z_index: maxZ + 1,
      locked: false,
    });

    const response = await axios.post(`${API_URL}/api/layers`, payload);
    const newLayerId = response.data.layer;
    setLayers([...state.layers, { id: newLayerId, ...payload }]);
  };

  const handleDeleteLayer = async (layerId: number) => {
    await axios.delete(`${API_URL}/api/layers/${layerId}`);
    setLayers(state.layers.filter((entry) => entry.id !== layerId));
    setLayerAdjustments(prev => {
      const next = { ...prev };
      delete next[layerId];
      return next;
    });
    if (state.selectedLayerId === layerId) {
      const remaining = sortedLayers.filter((entry) => entry.id !== layerId);
      const nextSelected = remaining[0]?.id ?? null;
      setSelectedLayerId(nextSelected);
    }
  };

  const handleMergeDown = async (layerId: number) => {
    const index = sortedLayers.findIndex((layer) => layer.id === layerId);
    if (index === -1 || index === sortedLayers.length - 1) return;

    const topLayer = sortedLayers[index];
    const bottomLayer = sortedLayers[index + 1];

    if (!topLayer.content || !bottomLayer.content) return;

    const loadImage = (src: string) => new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

    const [topImg, bottomImg] = await Promise.all([
      loadImage(resolveImageUrl(topLayer.content)),
      loadImage(resolveImageUrl(bottomLayer.content)),
    ]);

    if (!topImg || !bottomImg) return;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(topImg.width, bottomImg.width);
    canvas.height = Math.max(topImg.height, bottomImg.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalAlpha = (bottomLayer.opacity ?? 100) / 100;
    ctx.drawImage(bottomImg, 0, 0);
    ctx.globalAlpha = (topLayer.opacity ?? 100) / 100;
    ctx.drawImage(topImg, 0, 0);
    ctx.globalAlpha = 1;

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;

    const formData = new FormData();
    formData.append('file', new File([blob], `merged-layer-${Date.now()}.png`, { type: 'image/png' }));
    formData.append('project_id', String(projectId));

    const response = await axios.post(`${API_URL}/api/import?project_id=${projectId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    const newLayerId = response.data.id ?? response.data.layer;

    await Promise.all([
      axios.delete(`${API_URL}/api/layers/${topLayer.id}`),
      axios.delete(`${API_URL}/api/layers/${bottomLayer.id}`),
    ]);

    const refreshed = await axios.get(`${API_URL}/api/layers`, { params: { project_id: projectId } });
    setLayers(refreshed.data);
    setSelectedLayerId(newLayerId ?? null);
    updateAdjustments({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      exposure: 0,
      highlights: 0,
      shadows: 0,
      sharpness: 1.0,
    }, { recordHistory: false });
    setLayerAdjustments(prev => {
      const next = { ...prev };
      delete next[topLayer.id];
      delete next[bottomLayer.id];
      if (newLayerId) {
        next[newLayerId] = {
          brightness: 0,
          contrast: 0,
          saturation: 0,
          exposure: 0,
          highlights: 0,
          shadows: 0,
          sharpness: 1.0,
        };
      }
      return next;
    });
  };

  const handleLayersChange = (layers: any[]) => {
    if (layers.length === 0) {
      setLayers(layers);
      return;
    }

    const existingSelectedId = state.selectedLayerId;
    const hasSelected = existingSelectedId
      ? layers.some((layer) => layer.id === existingSelectedId)
      : false;
    const nextSelectedId = hasSelected ? existingSelectedId : layers[0].id;

    setLayers(layers);

    if (nextSelectedId !== state.selectedLayerId) {
      setSelectedLayerId(nextSelectedId);
    }
  };

  // Keyboard shortcuts integration
  useKeyboard({
    onSave: () => {},
    onExport: () => {},
    onNewProject: () => {},
    onUndo: () => {},
    onRedo: () => {},
    onSelectTool: (tool: Tool) => {
      if (!isSelectedLocked) {
        setActiveTool(tool);
      }
    },
    onDuplicateLayer: () => {},
    onDeleteLayer: () => {},
    onMoveLayerUp: () => {},
    onMoveLayerDown: () => {},
    onZoomIn: () => {},
    onZoomOut: () => {},
    onZoomReset: () => {},
    onZoomFit: () => {},
    onShowHelp: () => setShowShortcuts(true),
  });

  const handleToolComplete = () => {
    setActiveTool(null);
    // Mark layer as edited when any tool completes
    if (state.selectedLayerId) {
      setEditedLayers(prev => new Set(prev).add(state.selectedLayerId!));
    }
    // Refresh layers or canvas here
  };

  const handleToolCancel = () => {
    setActiveTool(null);
  };

  const zoomLevels = [25, 50, 75, 100, 125, 150, 200, 300, 400];

  const clampZoom = (value: number) => Math.max(25, Math.min(400, value));

  const handleZoomChange = (value: number) => {
    setZoom(clampZoom(value));
    setShowZoomMenu(false);
  };

  const handleCanvasWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? 10 : -10;
    setZoom((prev) => clampZoom(prev + delta));
  };

  if (loading) {
    console.log('Editor in loading state');
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading project...</div>
      </div>
    );
  }

  if (error) {
    console.log('Editor in error state:', error);
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="bg-red-900 bg-opacity-20 border border-red-800 rounded-lg p-4 text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-950 text-gray-100 overflow-hidden">
        {/* Main Layout */}
        <div className="flex items-stretch h-[calc(100vh-57px)] min-w-0 relative z-0">
          {/* Left Sidebar - Tools */}
          <aside className="w-16 h-full bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 space-y-4 flex-shrink-0 relative z-30">
            <button
              onClick={() => !isSelectedLocked && setActiveTool('move')}
              disabled={isSelectedLocked}
              className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                activeTool === 'move'
                  ? 'bg-blue-600 text-white'
                  : isSelectedLocked
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title="Move Tool (V)"
            >
              <Move className="w-5 h-5" />
            </button>
            <button
              onClick={() => !isSelectedLocked && setActiveTool('crop')}
              disabled={isSelectedLocked}
              className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                activeTool === 'crop'
                  ? 'bg-blue-600 text-white'
                  : isSelectedLocked
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title="Crop Tool (C)"
            >
              <Crop className="w-5 h-5" />
            </button>
            <button
              onClick={() => !isSelectedLocked && setActiveTool('brush')}
              disabled={isSelectedLocked}
              className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                activeTool === 'brush'
                  ? 'bg-blue-600 text-white'
                  : isSelectedLocked
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title="Brush Tool (B)"
            >
              <Paintbrush className="w-5 h-5" />
            </button>
            <button
              onClick={() => !isSelectedLocked && setActiveTool('text')}
              disabled={isSelectedLocked}
              className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                activeTool === 'text'
                  ? 'bg-blue-600 text-white'
                  : isSelectedLocked
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title="Text Tool (T)"
            >
              <Type className="w-5 h-5" />
            </button>
            <button
              onClick={() => !isSelectedLocked && setActiveTool('shapes')}
              disabled={isSelectedLocked}
              className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                activeTool === 'shapes'
                  ? 'bg-blue-600 text-white'
                  : isSelectedLocked
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title="Shapes Tool (S)"
            >
              <Square className="w-5 h-5" />
            </button>
          </aside>

          {/* Center - Canvas Area */}
          <main className="flex-1 flex flex-col bg-gray-950 min-w-0 relative z-0">
            <div
              ref={canvasContainerRef}
              className="flex-1 flex items-center justify-center min-w-0 min-h-0 w-full h-full relative"
              onWheel={handleCanvasWheel}
            >
              <button
                onClick={() => setRecenterNonce((value) => value + 1)}
                className="absolute top-3 right-3 z-20 p-2 rounded-full bg-gray-900/80 hover:bg-gray-800 text-gray-100 shadow-lg border border-gray-700"
                title="Recenter image"
                type="button"
              >
                <Target className="w-4 h-4" />
              </button>
              {activeTool === 'crop' && state.selectedLayerId && selectedImageUrl ? (
                <CropTool
                  layerId={state.selectedLayerId}
                  imageUrl={selectedImageUrl}
                  originalWidth={canvasSize.width}
                  originalHeight={canvasSize.height}
                  onComplete={handleToolComplete}
                  onCancel={handleToolCancel}
                />
              ) : activeTool === 'brush' && state.selectedLayerId && selectedImageUrl ? (
                <BrushTool
                  layerId={state.selectedLayerId}
                  imageUrl={selectedImageUrl}
                  width={canvasSize.width}
                  height={canvasSize.height}
                  onComplete={handleToolComplete}
                  onCancel={handleToolCancel}
                />
              ) : (activeTool === 'text' || activeTool === 'shapes') && state.selectedLayerId && selectedImageUrl ? (
                <TextShapesTool
                  layerId={state.selectedLayerId}
                  imageUrl={selectedImageUrl}
                  originalWidth={canvasSize.width}
                  originalHeight={canvasSize.height}
                  onComplete={handleToolComplete}
                  onCancel={handleToolCancel}
                />
              ) : (
                <MainCanvas width={canvasSize.width} height={canvasSize.height} zoom={zoom} recenterToken={recenterNonce} layerAdjustments={layerAdjustments} />
              )}
            </div>
            
            {/* Bottom Bar - Image Info */}
            <div className="bg-gray-950 px-6 py-2 flex items-center justify-between text-sm text-gray-400">
              <span>
                {activeTool && `Active Tool: ${activeTool.charAt(0).toUpperCase() + activeTool.slice(1)}`}
              </span>
              <div className="relative">
                <button
                  onClick={() => setShowZoomMenu((prev) => !prev)}
                  className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm"
                >
                  {zoom}% Zoom
                </button>
                {showZoomMenu && (
                  <div className="absolute right-0 bottom-10 w-32 bg-gray-900 border border-gray-700 rounded shadow-lg z-50">
                    <div className="py-1">
                      {zoomLevels.map((level) => (
                        <button
                          key={level}
                          onClick={() => handleZoomChange(level)}
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-800 ${
                            zoom === level ? 'text-blue-400' : 'text-gray-200'
                          }`}
                        >
                          {level}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Right Sidebar - Adjustments & Layers */}
          <div className="relative transition-all duration-200 flex-shrink-0 h-full" style={{ width: isSidebarCollapsed ? 0 : 320 }}>
            <button
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className={`absolute top-1/2 left-0 -translate-y-1/2 p-2 bg-gray-900/95 hover:bg-gray-800 rounded-full shadow-lg border border-gray-700 z-40 transition-transform ${
                isSidebarCollapsed ? '-translate-x-full -ml-2' : '-translate-x-1/2 -ml-3'
              }`}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-4 h-4 text-gray-200" />
              ) : (
                <ChevronLeft className="w-4 h-4 text-gray-200" />
              )}
            </button>

            {!isSidebarCollapsed && (
              <aside className="w-80 h-full bg-gray-900 overflow-y-auto">
                <div className="p-4 space-y-4 min-h-full">
                  <div className="bg-gray-800 rounded-full border border-gray-700 shadow-sm">
                  <div className="flex items-center space-x-2 p-2">
                    <button
                      onClick={() => setSidebarTab('preview')}
                      className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        sidebarTab === 'preview'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => setSidebarTab('edit')}
                      className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        sidebarTab === 'edit'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      Editing
                    </button>
                    <button
                      onClick={() => setSidebarTab('layers')}
                      className={`flex-1 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        sidebarTab === 'layers'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      Layers
                    </button>
                  </div>
                </div>

                  {sidebarTab === 'preview' ? (
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Photos</h3>
                        <div className="relative">
                          <button
                            onClick={() => setShowPhotoFilter(!showPhotoFilter)}
                            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-200 flex items-center gap-2 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            {photoFilter === 'all' ? 'All' : photoFilter === 'liked' ? 'Liked' : photoFilter === 'locked' ? 'Locked' : photoFilter === 'edited' ? 'Edited' : 'Not Edited'}
                          </button>
                          {showPhotoFilter && (
                            <div className="absolute right-0 top-full mt-1 w-40 bg-gray-900 border border-gray-700 rounded shadow-lg z-50">
                              <div className="py-1">
                                <button
                                  onClick={() => { setPhotoFilter('all'); setShowPhotoFilter(false); }}
                                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-800 transition-colors ${
                                    photoFilter === 'all' ? 'text-blue-400' : 'text-gray-200'
                                  }`}
                                >
                                  All
                                </button>
                                <button
                                  onClick={() => { setPhotoFilter('liked'); setShowPhotoFilter(false); }}
                                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-800 transition-colors ${
                                    photoFilter === 'liked' ? 'text-blue-400' : 'text-gray-200'
                                  }`}
                                >
                                  Liked
                                </button>
                                <button
                                  onClick={() => { setPhotoFilter('locked'); setShowPhotoFilter(false); }}
                                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-800 transition-colors ${
                                    photoFilter === 'locked' ? 'text-blue-400' : 'text-gray-200'
                                  }`}
                                >
                                  Locked
                                </button>
                                <button
                                  onClick={() => { setPhotoFilter('edited'); setShowPhotoFilter(false); }}
                                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-800 transition-colors ${
                                    photoFilter === 'edited' ? 'text-blue-400' : 'text-gray-200'
                                  }`}
                                >
                                  Edited
                                </button>
                                <button
                                  onClick={() => { setPhotoFilter('not-edited'); setShowPhotoFilter(false); }}
                                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-800 transition-colors ${
                                    photoFilter === 'not-edited' ? 'text-blue-400' : 'text-gray-200'
                                  }`}
                                >
                                  Not Edited
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <PhotoGallery
                        projectId={projectId}
                        selectedLayerId={state.selectedLayerId}
                        onSelectPhoto={handleSelectPhoto}
                        onOpenEditor={() => setSidebarTab('edit')}
                        onLayersChange={handleLayersChange}
                        filter={photoFilter}
                        editedLayers={editedLayers}
                        onEditLayer={(layerId) => setEditedLayers(prev => new Set(prev).add(layerId))}
                        onDelete={handleDeleteLayer}
                      />
                    </div>
                  ) : sidebarTab === 'layers' ? (
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                      <LayersPanel
                        layers={layersForPanel}
                        selectedLayerId={state.selectedLayerId ?? undefined}
                        onLayerSelect={handleLayerSelect}
                        onLayerVisibilityToggle={toggleLayerVisibility}
                        onLayerLockToggle={toggleLayerLock}
                        onLayerOpacityChange={(layerId, opacity) => updateLayerRecord(layerId, { opacity })}
                        onLayerBlendModeChange={(layerId, mode) => updateLayerRecord(layerId, { blend_mode: mode })}
                        onLayerReorder={handleLayerReorder}
                        onLayerDuplicate={handleDuplicateLayer}
                        onLayerDelete={handleDeleteLayer}
                        onLayerMergeDown={handleMergeDown}
                        onNewLayer={handleNewLayer}
                      />
                    </div>
                  ) : (
                    <>
                      {/* Adjustments Section */}
                      <AdjustmentsPanel 
                        isLocked={isSelectedLocked}
                        onEditApplied={() => {
                          if (state.selectedLayerId) {
                            const layerId = state.selectedLayerId;
                            const current = state.adjustments;
                            
                            // Save current adjustments for this layer
                            setLayerAdjustments(prev => ({
                              ...prev,
                              [layerId]: { ...current }
                            }));
                            
                            // Check if current adjustments match default values (not edited)
                            const isAtDefaults = 
                              current.brightness === 0 &&
                              current.contrast === 0 &&
                              current.saturation === 0 &&
                              current.exposure === 0 &&
                              current.highlights === 0 &&
                              current.shadows === 0 &&
                              current.sharpness === 1.0;
                            
                            setEditedLayers(prev => {
                              const newSet = new Set(prev);
                              if (isAtDefaults) {
                                newSet.delete(layerId);
                              } else {
                                newSet.add(layerId);
                              }
                              return newSet;
                            });
                          }
                        }}
                      />

                      {/* Layers Section */}
                      <div className="bg-gray-800 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-white mb-4">Layers</h3>
                        <div className="space-y-2">
                          <div className="p-3 bg-gray-700 rounded text-sm text-gray-300">
                            No layers yet
                          </div>
                        </div>
                      </div>

                      {/* History Section */}
                      <HistoryPanel />
                    </>
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>
        
        {/* Keyboard Shortcuts Panel */}
        <ShortcutsPanel isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

        {/* Fullscreen View Mode */}
        {isFullscreenView && (
          <div className="fixed inset-0 bg-gray-950 z-50 flex items-center justify-center">
            {/* Navigation Buttons */}
            <button
              onClick={() => {
                const currentIndex = state.layers.findIndex((l) => l.id === state.selectedLayerId);
                if (currentIndex > 0) {
                  setSelectedLayerId(state.layers[currentIndex - 1].id);
                }
              }}
              disabled={state.layers.findIndex((l) => l.id === state.selectedLayerId) === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-gray-900/95 hover:bg-gray-800 rounded-full shadow-lg border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all z-10"
              title="Previous image"
            >
              <ChevronLeft className="w-6 h-6 text-gray-200" />
            </button>

            <button
              onClick={() => {
                const currentIndex = state.layers.findIndex((l) => l.id === state.selectedLayerId);
                if (currentIndex < state.layers.length - 1) {
                  setSelectedLayerId(state.layers[currentIndex + 1].id);
                }
              }}
              disabled={state.layers.findIndex((l) => l.id === state.selectedLayerId) === state.layers.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-gray-900/95 hover:bg-gray-800 rounded-full shadow-lg border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all z-10"
              title="Next image"
            >
              <ChevronRight className="w-6 h-6 text-gray-200" />
            </button>

            {/* Close Button */}
            <button
              onClick={() => setIsFullscreenView(false)}
              className="absolute top-4 right-4 p-2 bg-gray-900/95 hover:bg-gray-800 rounded-full shadow-lg border border-gray-700 transition-all z-10"
              title="Exit fullscreen (ESC)"
            >
              <svg className="w-6 h-6 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Image Display */}
            <div className="w-full h-full flex items-center justify-center p-8">
              {selectedImageUrl ? (
                <img
                  src={selectedImageUrl}
                  alt={selectedLayer?.content ? selectedLayer.content.split(/[/\\]/).pop() || 'Image' : 'Image'}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <p className="text-gray-400">No image to display</p>
              )}
            </div>

            {/* Image Info */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/95 px-4 py-2 rounded-full border border-gray-700">
              <p className="text-sm text-gray-300">
                {state.layers.findIndex((l) => l.id === state.selectedLayerId) + 1} / {state.layers.length}
                {selectedLayer?.content && ` - ${selectedLayer.content.split(/[/\\]/).pop() || ''}`}
              </p>
            </div>
          </div>
        )}
      </div>
  );
};

const EditorPage: React.FC<EditorPageProps> = (props) => (
  <EditorProvider>
    <EditorErrorBoundary>
      <EditorInner {...props} />
    </EditorErrorBoundary>
  </EditorProvider>
);

export default EditorPage;