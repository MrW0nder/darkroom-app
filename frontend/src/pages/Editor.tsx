/**
 * Editor - Main editing interface
 * Hybrid Lightroom + Photoshop layout with full tool integration
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { EditorProvider } from '../contexts/EditorContext.js'; // Added .js extension
import { useEditor } from '../contexts/EditorContext.js';
import MainCanvas from '../components/editor/MainCanvas';
import AdjustmentsPanel from '../components/panels/AdjustmentsPanel.js'; // Added .js extension
import CropCanvas from '../components/tools/CropCanvas.js';
import type { CropCanvasHandle } from '../components/tools/CropCanvas.js';
import CropControls from '../components/tools/CropControls.js';
import BrushTool from '../components/tools/BrushTool.js'; // Added .js extension
import TextShapesTool from '../components/tools/TextShapesTool.js'; // Added .js extension
import PresetsPanel from '../components/panels/PresetsPanel.js'; // Added .js extension
import HistoryPanel from '../components/panels/HistoryPanel.js'; // Added .js extension
import ShortcutsPanel from '../components/panels/ShortcutsPanel.js'; // Added .js extension
import LayersPanel from '../components/panels/LayersPanel.js';
import ExportPage from '../components/panels/ExportPage.js';
import { ExportDialog } from '../components/panels/ExportDialog.js';
import { CompareView } from '../components/views/CompareView.js';
import { WatermarkPanel } from '../components/panels/WatermarkPanel.js';
import { ColorGradingPanel } from '../components/panels/ColorGradingPanel.js';
import BatchQueuePanel from '../components/panels/BatchQueuePanel.js';
import PhotoGallery from '../components/PhotoGallery.js';
import useKeyboard from '../hooks/useKeyboard.js'; // Added .js extension
import type { Tool } from '../hooks/useKeyboard.js'; // Added type-only import
import { Move, Crop, Paintbrush, Type, Square, HelpCircle, ChevronLeft, ChevronRight, ChevronDown, Map, Scan, Upload, EyeOff, SplitSquareVertical, GripVertical, LayoutGrid, Layers as LayersIcon, SlidersHorizontal } from 'lucide-react';

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

// ─── Draggable edit-panel ordering ──────────────────────────────────────────
type PanelId = 'adjustments' | 'history' | 'colorgrading' | 'watermark';
const DEFAULT_PANEL_ORDER: PanelId[] = ['adjustments', 'history', 'colorgrading', 'watermark'];
const PANEL_ORDER_KEY = 'editor.panelOrder';

// ─── Detachable sidebar tabs ──────────────────────────────────────────────────
type DetachableTab = 'preview' | 'edit' | 'layers' | 'import';
const DETACHED_TABS_KEY = 'editor.detachedTabs';

const adjustmentKeys = [
  'brightness',
  'contrast',
  'saturation',
  'exposure',
  'highlights',
  'shadows',
  'sharpness',
  'shadowHue', 'shadowSat', 'shadowLum',
  'midtoneHue', 'midtoneSat', 'midtoneLum',
  'highlightHue', 'highlightSat', 'highlightLum',
] as const;

// Complete set of zero-default adjustments (incl. CG).
// Used as a base when loading per-layer adjustments so fields never
// "bleed" from a previously-selected layer via the prev.adjustments merge.
const FULL_ADJ_DEFAULTS = {
  brightness: 0, contrast: 0, saturation: 0, vibrance: 0, exposure: 0,
  highlights: 0, shadows: 0, sharpness: 1.0, temperature: 0, tint: 0,
  shadowHue: 0,    shadowSat: 0,    shadowLum: 0,
  midtoneHue: 0,   midtoneSat: 0,   midtoneLum: 0,
  highlightHue: 0, highlightSat: 0, highlightLum: 0,
} as const;

// CG keys that are intentionally NOT persisted to localStorage so the canvas
// always starts clean after a page reload (the user resets them in-session).
const CG_KEYS = [
  'shadowHue', 'shadowSat', 'shadowLum',
  'midtoneHue', 'midtoneSat', 'midtoneLum',
  'highlightHue', 'highlightSat', 'highlightLum',
] as const;

const EditorInner: React.FC<EditorPageProps> = ({ projectId, onClose, currentView = 'editor', onViewChange }) => {
  console.log('EditorInner rendering with projectId:', projectId);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'preview' | 'edit' | 'layers' | 'crop' | 'import'>('preview');
  const [tabOrder, setTabOrder] = useState<Array<'preview' | 'edit' | 'layers' | 'crop' | 'import'>>(['preview', 'edit', 'layers', 'crop', 'import']);
  const [detachedTabs, setDetachedTabs] = useState<Set<DetachableTab>>(() => {
    try {
      const s = localStorage.getItem(DETACHED_TABS_KEY);
      return s ? new Set(JSON.parse(s) as DetachableTab[]) : new Set();
    } catch { return new Set(); }
  });

  // ── Crop tool state ──────────────────────────────────────────────────────
  const [cropRotation,     setCropRotation]     = useState(0);
  const [cropAspect,       setCropAspect]       = useState<number | null>(null);
  const [cropFlipH,        setCropFlipH]        = useState(false);
  const [cropFlipV,        setCropFlipV]        = useState(false);
  const [cropDims,         setCropDims]         = useState({ w: 0, h: 0 });
  const [cropStraightenMode, setCropStraightenMode] = useState(false);
  const cropCanvasRef = useRef<CropCanvasHandle | null>(null);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
  const [showResizeTooltip, setShowResizeTooltip] = useState(false);
  const resizeTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sidebarDragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleSidebarDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    // Cancel any pending tooltip and hide it immediately on drag start
    if (resizeTooltipTimer.current) clearTimeout(resizeTooltipTimer.current);
    setShowResizeTooltip(false);
    sidebarDragRef.current = { startX: e.clientX, startWidth: sidebarWidth };
    setIsDraggingSidebar(true);
    const onMouseMove = (ev: MouseEvent) => {
      if (!sidebarDragRef.current) return;
      const delta = sidebarDragRef.current.startX - ev.clientX; // drag left = grow
      const newWidth = Math.min(600, Math.max(200, sidebarDragRef.current.startWidth + delta));
      setSidebarWidth(newWidth);
    };
    const onMouseUp = () => {
      sidebarDragRef.current = null;
      setIsDraggingSidebar(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleResizeHandleMouseEnter = () => {
    resizeTooltipTimer.current = setTimeout(() => setShowResizeTooltip(true), 1000);
  };

  const handleResizeHandleMouseLeave = () => {
    if (resizeTooltipTimer.current) clearTimeout(resizeTooltipTimer.current);
    setShowResizeTooltip(false);
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recenterNonce, setRecenterNonce] = useState(0);
  const [resetZoomNonce, setResetZoomNonce] = useState(0);
  const [showMinimap, setShowMinimap] = useState(false);
  const [isFullscreenView, setIsFullscreenView] = useState(false);
  const [showFullscreenCompare, setShowFullscreenCompare] = useState(false);
  const [fullscreenShowFilename, setFullscreenShowFilename] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [filmstripCollapsed, setFilmstripCollapsed] = useState(false);
  const [mainFilmstripCollapsed, setMainFilmstripCollapsed] = useState(
    () => localStorage.getItem('editor.mainFilmstripCollapsed') === 'true'
  );
  const [showPhotoFilter, setShowPhotoFilter] = useState(false);
  const [photoFilter, setPhotoFilter] = useState<'all' | 'liked' | 'locked' | 'edited' | 'not-edited'>(
    () => (localStorage.getItem('editor.photoFilter') as 'all' | 'liked' | 'locked' | 'edited' | 'not-edited') || 'all'
  );
  const [uploadTrigger, setUploadTrigger] = useState<(() => void) | null>(null);
  const [showGridSizePicker, setShowGridSizePicker] = useState(false);
  const [previewColumns, setPreviewColumns] = useState<number>(
    () => {
      const saved = localStorage.getItem('editor.previewColumns');
      return saved ? parseInt(saved, 10) : 2;
    }
  );
  const [showExportPage, setShowExportPage] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [editedLayers, setEditedLayers] = useState<Set<number>>(new Set());
  const [lockedLayers, setLockedLayers] = useState<Set<number>>(new Set());
  const [originalAdjustments, setOriginalAdjustments] = useState<Record<number, any>>({});
  const [copiedAdjustments, setCopiedAdjustments] = useState<Record<string, number> | null>(null);
  // Drag-to-reorder edit panels — order persisted in localStorage
  const [panelOrder, setPanelOrder] = useState<PanelId[]>(() => {
    try {
      const saved = localStorage.getItem(PANEL_ORDER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PanelId[];
        if (
          parsed.length === DEFAULT_PANEL_ORDER.length &&
          DEFAULT_PANEL_ORDER.every((id) => parsed.includes(id))
        ) return parsed;
      }
    } catch {}
    return [...DEFAULT_PANEL_ORDER];
  });
  const [draggingPanel, setDraggingPanel] = useState<PanelId | null>(null);
  const panelDragRef = useRef<PanelId | null>(null);
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
  // True only after loadProject has completed and history has been restored.
  // Prevents the save-history effect from wiping localStorage on the initial render
  // before the async load has had a chance to read it.
  const sessionLoadedRef = useRef(false);

  const { state, setCurrentProject, setLayers, setSelectedLayerId, updateAdjustments, undo, redo, restoreSession } = useEditor();

  const filmstripRef = useRef<HTMLDivElement>(null);
  const mainFilmstripRef = useRef<HTMLDivElement>(null);
  const tabPillRef = useRef<HTMLDivElement>(null);
  const tabDragRef = useRef<{ tab: string; startX: number } | null>(null);

  // Drag-to-reorder tabs
  const handleTabPointerDown = (e: React.PointerEvent<HTMLButtonElement>, tab: 'preview' | 'edit' | 'layers' | 'crop' | 'import') => {
    if (e.button !== 0) return;
    const startX = e.clientX;
    let started = false;
    tabDragRef.current = { tab, startX };

    const onMove = (ev: PointerEvent) => {
      if (!started && Math.abs(ev.clientX - startX) < 6) return;
      started = true;
      const pill = tabPillRef.current;
      if (!pill) return;
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      const btn = under?.closest('[data-tab]') as HTMLElement | null;
      if (!btn) return;
      const targetTab = btn.dataset.tab as typeof tab;
      if (!targetTab || targetTab === tab) return;
      setTabOrder(prev => {
        const next = [...prev];
        const from = next.indexOf(tab);
        const to = next.indexOf(targetTab);
        if (from === -1 || to === -1 || from === to) return prev;
        next.splice(from, 1);
        next.splice(to, 0, tab);
        return next;
      });
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      if (!started) { setSidebarTab(tab); }
      tabDragRef.current = null;
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  // Auto-scroll filmstrip to keep the active thumbnail centred when navigating
  useEffect(() => {
    const scrollRef = isFullscreenView ? filmstripRef.current : mainFilmstripRef.current;
    if (!scrollRef) return;
    const active = scrollRef.querySelector<HTMLButtonElement>('[data-active="true"]');
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [state.selectedLayerId, isFullscreenView]);

  // Reset focus mode whenever fullscreen closes
  useEffect(() => {
    if (!isFullscreenView) setIsFocusMode(false);
  }, [isFullscreenView]);

  useEffect(() => { localStorage.setItem('editor.photoFilter', photoFilter); }, [photoFilter]);
  useEffect(() => { localStorage.setItem('editor.previewColumns', String(previewColumns)); }, [previewColumns]);

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

  // Save layer adjustments to localStorage whenever they change.
  // CG fields are intentionally stripped so the canvas starts with no colour
  // grading applied after every page reload.
  useEffect(() => {
    localStorage.setItem(PANEL_ORDER_KEY, JSON.stringify(panelOrder));
  }, [panelOrder]);

  useEffect(() => {
    localStorage.setItem(DETACHED_TABS_KEY, JSON.stringify([...detachedTabs]));
  }, [detachedTabs]);

  // Save layer adjustments to localStorage whenever they change.
  // CG fields are intentionally stripped so the canvas starts with no colour
  // grading applied after every page reload.
  useEffect(() => {
    if (Object.keys(layerAdjustments).length > 0) {
      const stripped: Record<string, any> = {};
      for (const [id, adj] of Object.entries(layerAdjustments)) {
        if (!adj) { stripped[id] = adj; continue; }
        const clean = { ...adj };
        for (const k of CG_KEYS) delete (clean as any)[k];
        stripped[id] = clean;
      }
      localStorage.setItem(`darkroom-layer-adjustments-${projectId}`, JSON.stringify(stripped));
    } else {
      localStorage.removeItem(`darkroom-layer-adjustments-${projectId}`);
    }
  }, [layerAdjustments, projectId]);

  // Save history to localStorage whenever it changes (capped at 200 entries).
  // Guard: skip until the project has been fully loaded so we don't wipe the
  // stored history on the very first render when the stack is still empty.
  useEffect(() => {
    if (!sessionLoadedRef.current) return;
    const stack = state.historyStack;
    if (stack.length === 0) {
      localStorage.removeItem(`darkroom-history-${projectId}`);
      return;
    }
    const capped = stack.slice(-200);
    const cappedIndex = Math.min(state.historyIndex, capped.length - 1);
    try {
      localStorage.setItem(
        `darkroom-history-${projectId}`,
        JSON.stringify({ historyStack: capped, historyIndex: cappedIndex })
      );
    } catch (e) {
      // Storage quota exceeded — silently skip
      console.warn('Could not save history to localStorage', e);
    }
  }, [state.historyStack, state.historyIndex, projectId]);

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
        current.sharpness === 1.0 &&
        ((current as any).temperature ?? 0) === 0 &&
        ((current as any).tint ?? 0) === 0;
      
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
          
          // Load saved adjustments for the first layer if they exist.
          // Always start with full defaults so (a) no fields are left at stale
          // values from prev.adjustments and (b) CG is always 0 on page load
          // regardless of what may be in localStorage.
          const savedAdjustments = layerAdjustments[firstLayerId];
          const adjustmentsToApply = {
            ...FULL_ADJ_DEFAULTS,
            ...(savedAdjustments ?? {}),
            // Force CG to 0: never restore from localStorage across reloads.
            shadowHue: 0,    shadowSat: 0,    shadowLum: 0,
            midtoneHue: 0,   midtoneSat: 0,   midtoneLum: 0,
            highlightHue: 0, highlightSat: 0, highlightLum: 0,
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
            temperature: 0,
            tint: 0,
          };
        });
        setOriginalAdjustments(originals);

        // Restore history for this project from localStorage
        try {
          const savedHistory = localStorage.getItem(`darkroom-history-${projectId}`);
          if (savedHistory) {
            const { historyStack, historyIndex } = JSON.parse(savedHistory);
            if (Array.isArray(historyStack)) {
              restoreSession(historyStack, historyIndex ?? historyStack.length - 1);
            }
          }
        } catch (e) {
          console.warn('Could not restore history from localStorage', e);
        }
        // Allow the save-history effect to run from this point onward.
        sessionLoadedRef.current = true;

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

    // Defer the first measurement so the sidebar has fully painted before we
    // read the container's bounding rect — avoids the "centered on full window"
    // problem that occurs when the initial call fires before layout settles.
    const rafId = requestAnimationFrame(() => {
      updateSize();
    });

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [isSidebarCollapsed]);

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
    
    // Load adjustments for the newly selected layer (or defaults if none exist).
    // Spread FULL_ADJ_DEFAULTS as the base so CG and any other new fields never
    // bleed in from the previously-selected layer via the prev.adjustments merge.
    // CG values set during this session ARE preserved here (in-memory layerAdjustments
    // captures them); they just aren't persisted across page reloads.
    const savedAdjustments = layerAdjustments[layer.id];
    const adjustmentsToLoad = { ...FULL_ADJ_DEFAULTS, ...(savedAdjustments ?? {}) };

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
        adjustmentsToLoad.sharpness === 1.0 &&
      ((adjustmentsToLoad as any).temperature ?? 0) === 0 &&
      ((adjustmentsToLoad as any).tint ?? 0) === 0;
    
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
    name: layer.name ?? '',
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
      name: 'New Layer',
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
            temperature: 0,
            tint: 0,
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

  // ── Panel drag-to-reorder ────────────────────────────────────────────────
  const handlePanelGripDown = useCallback((e: React.PointerEvent<HTMLDivElement>, id: PanelId) => {
    e.preventDefault();
    panelDragRef.current = id;
    setDraggingPanel(id);

    const onMove = (ev: PointerEvent) => {
      const target = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)
        ?.closest<HTMLElement>('[data-panel-id]');
      const targetId = target?.dataset.panelId as PanelId | undefined;
      if (!targetId || targetId === panelDragRef.current) return;
      setPanelOrder(prev => {
        const from = prev.indexOf(panelDragRef.current!);
        const to   = prev.indexOf(targetId);
        if (from === -1 || to === -1 || from === to) return prev;
        const next = [...prev];
        next.splice(from, 1);
        next.splice(to, 0, panelDragRef.current!);
        return next;
      });
    };

    const onUp = () => {
      setDraggingPanel(null);
      panelDragRef.current = null;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, []);

  // ── Adjustment sync ──────────────────────────────────────────────────────
  const handleCopySettings = () => {
    if (!state.selectedLayerId) return;
    const adj = layerAdjustments[state.selectedLayerId] ?? state.adjustments;
    setCopiedAdjustments({ ...adj });
  };

  const handlePasteSettings = () => {
    if (!copiedAdjustments) return;
    const targets = state.layers.filter(
      (l) => l.type === 'image' && !l.locked && l.id !== state.selectedLayerId
    );
    // Write into layerAdjustments for every target layer
    setLayerAdjustments((prev) => {
      const next = { ...prev };
      targets.forEach((l) => { next[l.id] = { ...copiedAdjustments }; });
      return next;
    });
    // Mark them all as edited
    setEditedLayers((prev) => {
      const next = new Set(prev);
      targets.forEach((l) => next.add(l.id));
      return next;
    });
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
            temperature: 0,
            tint: 0,
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
            temperature: 0,
            tint: 0,
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

  // ── Menu bar event listeners ────────────────────────────────────────────────
  // The MenuBar dispatches CustomEvents on `window` so it doesn't need direct
  // access to editor state. We listen here and forward to the correct handlers.
  useEffect(() => {
    const defaultAdj = {
      brightness: 0, contrast: 0, saturation: 0,
      exposure: 0, highlights: 0, shadows: 0,
      sharpness: 1.0, temperature: 0, tint: 0,
    };

    const handlers: Record<string, () => void> = {
      'menu:undo':              undo,
      'menu:redo':              redo,
      'menu:export':            () => setShowExportPage(true),
      'menu:show-shortcuts':    () => setShowShortcuts(true),
      'menu:view':            () => setIsFullscreenView(prev => !prev),
      'menu:toggle-sidebar':    () => setIsSidebarCollapsed(prev => !prev),
      'menu:zoom-fit':          () => setRecenterNonce(n => n + 1),
      'menu:zoom-reset':        () => setResetZoomNonce(n => n + 1),
      'menu:reset-adjustments': () => {
        updateAdjustments(defaultAdj, { recordHistory: true });
      },
      'menu:fullscreen': () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      },
    };

    const listeners = Object.entries(handlers).map(([event, fn]) => {
      const listener = () => fn();
      window.addEventListener(event, listener);
      return { event, listener };
    });

    return () => {
      listeners.forEach(({ event, listener }) => window.removeEventListener(event, listener));
    };
  }, [undo, redo, updateAdjustments]);

  // Keyboard shortcuts integration
  useKeyboard({
    onSave: () => {},
    onExport: () => setShowExportPage(true),
    onNewProject: () => {},
    onUndo: undo,
    onRedo: redo,
    onSelectTool: (tool: Tool) => {
      if (!isSelectedLocked) {
        setActiveTool(tool);
      }
    },
    onDuplicateLayer: () => {},
    onDeleteLayer: () => {},
    onMoveLayerUp: () => {},
    onMoveLayerDown: () => {},
    onZoomReset: () => setResetZoomNonce(n => n + 1),
    onZoomFit:   () => setRecenterNonce(n => n + 1),
    onShowHelp: () => setShowShortcuts(true),
  });

  // Auto-center the active tab in the pill whenever it changes
  useEffect(() => {
    const pill = tabPillRef.current;
    if (!pill) return;
    const active = pill.querySelector<HTMLElement>(`[data-tab="${sidebarTab}"]`);
    if (!active) return;
    const pillCenter = pill.offsetWidth / 2;
    const btnCenter = active.offsetLeft + active.offsetWidth / 2;
    pill.scrollTo({ left: btnCenter - pillCenter, behavior: 'smooth' });
  }, [sidebarTab]);

  // Reset crop state each time the crop tool is activated
  useEffect(() => {
    if (activeTool === 'crop') {
      setCropRotation(0);
      setCropAspect(null);
      setCropFlipH(false);
      setCropFlipV(false);
      setCropDims({ w: 0, h: 0 });
      setCropStraightenMode(false);
    }
  }, [activeTool]);

  const handleToolComplete = async () => {
    setActiveTool(null);
    setSidebarTab('edit');
    // Mark layer as edited when any tool completes
    if (state.selectedLayerId) {
      setEditedLayers(prev => new Set(prev).add(state.selectedLayerId!));
    }
    // Refresh layers so the updated image URL is picked up
    try {
      const res = await axios.get(`${API_URL}/api/layers`, { params: { project_id: projectId } });
      if (res.data) setLayers(res.data);
    } catch { /* ignore */ }
  };

  const handleToolCancel = () => {
    setActiveTool(null);
    setSidebarTab('edit');
  };

  // ESC closes fullscreen view and exits focus mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsFullscreenView(false); setIsFocusMode(false); }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

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
        <div className="flex items-stretch h-[calc(100vh-40px)] min-w-0 relative z-0">
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
              onClick={() => { if (!isSelectedLocked) { setActiveTool('crop'); setSidebarTab('crop'); } }}
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

            {/* Detached tab shortcuts */}
            {detachedTabs.size > 0 && (
              <div className="w-6 border-t border-gray-700" />
            )}
            {(['preview', 'edit', 'layers', 'import'] as DetachableTab[])
              .filter(tab => detachedTabs.has(tab))
              .map(tab => {
                const isActive = sidebarTab === tab && !isSidebarCollapsed;
                const label = tab === 'edit' ? 'Editing' : tab.charAt(0).toUpperCase() + tab.slice(1);
                return (
                  <button
                    key={tab}
                    onClick={() => {
                      setSidebarTab(tab);
                      setIsSidebarCollapsed(false);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setDetachedTabs(prev => { const s = new Set(prev); s.delete(tab); return s; });
                      setSidebarTab(tab);
                      setIsSidebarCollapsed(false);
                    }}
                    className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white'
                    }`}
                    title={`${label} — right-click to dock back to sidebar`}
                  >
                    {tab === 'preview'  ? <LayoutGrid className="w-5 h-5" /> :
                     tab === 'edit'     ? <SlidersHorizontal className="w-5 h-5" /> :
                     tab === 'layers'   ? <LayersIcon className="w-5 h-5" /> :
                                          <Upload className="w-5 h-5" />}
                  </button>
                );
              })
            }

            {/* Spacer pushes export to bottom */}
            <div className="flex-1" />

            {/* Export */}
            <button
              onClick={(e) => e.shiftKey ? setShowExportDialog(true) : setShowExportPage(true)}
              className="w-10 h-10 rounded flex items-center justify-center transition-colors bg-gray-800 hover:bg-blue-700 text-gray-300 hover:text-white"
              title="Export photos (Shift+click for quick export)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          </aside>

          {/* Center - Canvas Area */}
          <main className="flex-1 flex flex-col bg-gray-950 min-w-0 relative z-0">
            <div
              ref={canvasContainerRef}
              className="flex-1 flex items-center justify-center min-w-0 min-h-0 w-full h-full relative"
            >
              <button
                onClick={() => setShowMinimap(v => !v)}
                className={`absolute top-3 left-3 z-20 p-2 rounded-full shadow-lg border transition-colors ${
                  showMinimap
                    ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500'
                    : 'bg-gray-900/80 hover:bg-gray-800 text-gray-100 border-gray-700'
                }`}
                title="Toggle navigator minimap"
                type="button"
              >
                <Map className="w-4 h-4" />
              </button>
              <button
                onClick={() => setRecenterNonce((value) => value + 1)}
                className="absolute top-3 right-3 z-20 p-2 rounded-full bg-gray-900/80 hover:bg-gray-800 text-gray-100 shadow-lg border border-gray-700"
                title="Recenter image"
                type="button"
              >
                <Scan className="w-4 h-4" />
              </button>
              {activeTool === 'crop' && sidebarTab === 'crop' && state.selectedLayerId && selectedImageUrl ? (
                <CropCanvas
                  ref={cropCanvasRef}
                  layerId={state.selectedLayerId}
                  imageUrl={selectedImageUrl}
                  rotation={cropRotation}
                  aspectRatio={cropAspect}
                  flipH={cropFlipH}
                  flipV={cropFlipV}
                  straightenMode={cropStraightenMode}
                  onRotationChange={setCropRotation}
                  onCropSizeChange={(w, h) => setCropDims({ w, h })}
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
              ) : showCompare && selectedImageUrl ? (
                <CompareView
                  originalImage={selectedImageUrl}
                  editedImage={selectedImageUrl}
                  adjustments={state.adjustments}
                />
              ) : (
                <MainCanvas 
                  imageUrl={selectedImageUrl} 
                  recenterNonce={recenterNonce}
                  resetZoomNonce={resetZoomNonce}
                  showMinimap={showMinimap}
                  adjustments={state.adjustments}
                />
              )}
            </div>
            
            {/* Filmstrip — collapsible horizontal thumbnail tray (main editor) */}
            <div
              className="flex-shrink-0 bg-gray-900 border-t border-gray-800 relative transition-all duration-200 overflow-hidden"
              style={{ height: mainFilmstripCollapsed ? 20 : 96 }}
            >
              {/* Collapse / expand handle */}
              <button
                onClick={() => {
                  const next = !mainFilmstripCollapsed;
                  setMainFilmstripCollapsed(next);
                  localStorage.setItem('editor.mainFilmstripCollapsed', String(next));
                }}
                className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-full px-2 py-0.5 flex items-center gap-1 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors z-20"
                title={mainFilmstripCollapsed ? 'Show filmstrip' : 'Hide filmstrip'}
                type="button"
              >
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${mainFilmstripCollapsed ? 'rotate-180' : ''}`} />
              </button>

              {!mainFilmstripCollapsed && (
                <div
                  ref={mainFilmstripRef}
                  className="flex gap-1.5 overflow-x-auto w-full h-full items-center px-3 py-1"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}
                >
                  {state.layers.filter(l => l.type === 'image').map((layer, idx) => {
                    const thumbUrl = resolveImageUrl(layer.content ?? null);
                    const isActive = layer.id === state.selectedLayerId;
                    const isEdited = editedLayers.has(layer.id);
                    const isLocked = lockedLayers.has(layer.id);
                    return (
                      <button
                        key={layer.id}
                        data-active={isActive ? 'true' : 'false'}
                        onClick={() => setSelectedLayerId(layer.id)}
                        className={`relative flex-shrink-0 w-[72px] h-[72px] rounded overflow-hidden border-2 transition-all ${
                          isActive
                            ? 'border-blue-500 opacity-100 scale-105'
                            : 'border-transparent opacity-50 hover:opacity-85 hover:border-gray-500'
                        }`}
                        title={layer.content?.split(/[/\\]/).pop() || `Image ${idx + 1}`}
                        type="button"
                      >
                        {thumbUrl ? (
                          <img src={thumbUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-500 text-xs">{idx + 1}</div>
                        )}
                        {/* Edited dot */}
                        {isEdited && (
                          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-400 shadow" />
                        )}
                        {/* Lock icon */}
                        {isLocked && (
                          <span className="absolute bottom-1 right-1 text-[9px] text-amber-400 leading-none">🔒</span>
                        )}
                        {/* Index badge */}
                        <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] text-white/60 bg-black/40 leading-4">{idx + 1}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Bar - Image Info */}
            <div className="bg-gray-900 border-t border-gray-800 px-4 py-1.5 flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
              <span>
                {activeTool ? `Tool: ${activeTool.charAt(0).toUpperCase() + activeTool.slice(1)}` : ''}
              </span>
              <span>
                {state.layers.filter(l => l.type === 'image').length > 0 && (
                  `${state.layers.filter(l => l.type === 'image').findIndex(l => l.id === state.selectedLayerId) + 1} / ${state.layers.filter(l => l.type === 'image').length} photos`
                )}
              </span>
            </div>
          </main>

          {/* Right Sidebar - Adjustments & Layers */}
          <div
            className={`relative flex-shrink-0 h-full ${isDraggingSidebar ? '' : 'transition-all duration-200'}`}
            style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}
          >
            {/* Drag-to-resize handle — double-click resets to default width */}
            {!isSidebarCollapsed && (
              <div
                onMouseDown={handleSidebarDragStart}
                onDoubleClick={() => setSidebarWidth(320)}
                onMouseEnter={handleResizeHandleMouseEnter}
                onMouseLeave={handleResizeHandleMouseLeave}
                className="absolute left-0 top-0 w-1 h-full z-50 cursor-col-resize"
              >
                {showResizeTooltip && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 bg-gray-900 border border-gray-700 text-gray-200 text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap pointer-events-none">
                    Double-click to reset
                  </div>
                )}
              </div>
            )}
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
              <aside className="h-full bg-gray-900 overflow-y-auto" style={{ width: '100%' }}>
                <div className="p-3 space-y-2 min-h-full">
                  <div className="flex justify-center">
                  <div
                    ref={tabPillRef}
                    className="bg-gray-800 rounded-full border border-gray-700 shadow-sm overflow-x-auto max-w-full"
                    style={{ scrollbarWidth: 'none' }}
                    onWheel={(e) => { e.currentTarget.scrollLeft += e.deltaY; }}
                  >
                  <div className="flex items-center p-2 gap-1">
                    {tabOrder
                      .filter(tab => (tab !== 'crop' || activeTool === 'crop') && !detachedTabs.has(tab as DetachableTab))
                      .map(tab => {
                        const labels: Record<string, string> = { preview: 'Preview', edit: 'Editing', layers: 'Layers', crop: 'Crop', import: 'Import' };
                        return (
                          <button
                            key={tab}
                            data-tab={tab}
                            onPointerDown={(e) => handleTabPointerDown(e, tab as any)}
                            onContextMenu={(e) => {
                              if (tab === 'crop') return;
                              e.preventDefault();
                              const t = tab as DetachableTab;
                              setDetachedTabs(prev => { const s = new Set(prev); s.add(t); return s; });
                              if (sidebarTab === tab) {
                                const nextVisible = tabOrder.find(
                                  x => x !== 'crop' && !detachedTabs.has(x as DetachableTab) && x !== tab
                                );
                                if (nextVisible) setSidebarTab(nextVisible as any);
                              }
                            }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap select-none cursor-grab active:cursor-grabbing ${
                              sidebarTab === tab
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:text-white hover:bg-gray-700'
                            }`}
                            title={tab !== 'crop' ? 'Drag to reorder · Right-click to move to toolbar' : undefined}
                          >
                            {labels[tab]}
                          </button>
                        );
                      })
                    }
                  </div>
                </div>
                </div>

                  {sidebarTab === 'preview' ? (
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Photos</h3>
                        <div className="flex items-center gap-2">
                          {/* Compact upload icon — only shown when photos exist */}
                          {state.layers.length > 0 && (
                            <button
                              type="button"
                              onClick={() => uploadTrigger?.()}
                              className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                              title="Upload more photos"
                            >
                              <Upload className="w-4 h-4 text-gray-200" />
                            </button>
                          )}
                          {/* Grid size picker */}
                          <div className="relative">
                            <button
                              onClick={() => { setShowGridSizePicker(p => !p); setShowPhotoFilter(false); }}
                              className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                              title="Change grid size"
                            >
                              {/* 2×2 dots icon representing grid */}
                              <svg className="w-4 h-4 text-gray-200" viewBox="0 0 16 16" fill="currentColor">
                                <rect x="1" y="1" width="6" height="6" rx="1"/>
                                <rect x="9" y="1" width="6" height="6" rx="1"/>
                                <rect x="1" y="9" width="6" height="6" rx="1"/>
                                <rect x="9" y="9" width="6" height="6" rx="1"/>
                              </svg>
                            </button>
                            {showGridSizePicker && (
                              <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded shadow-lg z-50 p-2">
                                <p className="text-xs text-gray-400 mb-2 whitespace-nowrap">Columns per row</p>
                                <div className="flex gap-1.5">
                                  {[1, 2, 3, 4].map(n => (
                                    <button
                                      key={n}
                                      onClick={() => { setPreviewColumns(n); setShowGridSizePicker(false); }}
                                      className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                                        previewColumns === n ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                      }`}
                                      title={`${n} column${n > 1 ? 's' : ''}`}
                                    >
                                      {/* Mini grid icon showing the column count */}
                                      <svg viewBox="0 0 12 12" className="w-5 h-5" fill="currentColor">
                                        {Array.from({ length: n }).map((_, i) => {
                                          const w = n === 1 ? 10 : n === 2 ? 4 : n === 3 ? 2.5 : 1.5;
                                          const gap = n === 1 ? 0 : (10 - w * n) / (n - 1);
                                          const x = 1 + i * (w + gap);
                                          return (
                                            <g key={i}>
                                              <rect x={x} y="1" width={w} height="4" rx="0.5" />
                                              <rect x={x} y="7" width={w} height="4" rx="0.5" />
                                            </g>
                                          );
                                        })}
                                      </svg>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {/* Filter dropdown */}
                          <div className="relative">
                          <button
                            onClick={() => { setShowPhotoFilter(p => !p); setShowGridSizePicker(false); }}
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
                      </div>
                      <PhotoGallery
                        projectId={projectId}
                        selectedLayerId={state.selectedLayerId}
                        columns={previewColumns}
                        onSelectPhoto={handleSelectPhoto}
                        onOpenEditor={() => setSidebarTab('edit')}
                        onLayersChange={handleLayersChange}
                        filter={photoFilter}
                        editedLayers={editedLayers}
                        onEditLayer={(layerId) => setEditedLayers(prev => new Set(prev).add(layerId))}
                        onDelete={handleDeleteLayer}
                        onUploadTrigger={(fn) => setUploadTrigger(() => fn)}
                      />
                    </div>
                  ) : sidebarTab === 'layers' ? (
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                      <LayersPanel projectId={projectId} />
                    </div>
                  ) : sidebarTab === 'import' ? (
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                      <BatchQueuePanel
                        projectId={projectId}
                        onLayerAdded={async (layer) => {
                          // Re-fetch the full layer list so z_index ordering is correct
                          try {
                            const res = await axios.get(`${API_URL}/api/layers`, { params: { project_id: projectId } });
                            const fresh = res.data || [];
                            setLayers(fresh);
                            // Select the newly imported layer
                            setSelectedLayerId(layer.id);
                          } catch {
                            // Fallback: just append optimistically
                            setLayers([...state.layers, layer]);
                            if (!state.selectedLayerId) setSelectedLayerId(layer.id);
                          }
                          // Switch to preview so the user sees their photo
                          setSidebarTab('preview');
                        }}
                      />
                    </div>
                  ) : sidebarTab === 'crop' && activeTool === 'crop' ? (
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                      <CropControls
                        rotation={cropRotation}
                        onRotation={setCropRotation}
                        aspectRatio={cropAspect}
                        onAspect={setCropAspect}
                        flipH={cropFlipH}
                        onFlipH={setCropFlipH}
                        flipV={cropFlipV}
                        onFlipV={setCropFlipV}
                        cropW={cropDims.w}
                        cropH={cropDims.h}
                        originalAspect={
                          selectedLayer?.width && selectedLayer?.height
                            ? selectedLayer.width / selectedLayer.height
                            : null
                        }
                        straightenMode={cropStraightenMode}
                        onStraightenMode={setCropStraightenMode}
                        onApplySize={(w, h) => cropCanvasRef.current?.setPixelSize(w, h)}
                        onCycleGrid={() => cropCanvasRef.current?.cycleGrid()}
                        onReset={() => cropCanvasRef.current?.reset()}
                        onApply={async () => { await cropCanvasRef.current?.apply(); }}
                        onCancel={handleToolCancel}
                      />
                    </div>
                  ) : (
                    <>
                      {panelOrder.map((id) => {
                        let content: React.ReactNode;
                        if (id === 'adjustments') {
                          content = (
                            <AdjustmentsPanel
                              isLocked={isSelectedLocked}
                              onToggleCompare={() => setShowCompare(c => !c)}
                              compareActive={showCompare}
                              hasCopied={copiedAdjustments !== null}
                              onCopySettings={handleCopySettings}
                              onPasteSettings={handlePasteSettings}
                              pasteTargetCount={state.layers.filter(
                                (l) => l.type === 'image' && !l.locked && l.id !== state.selectedLayerId
                              ).length}
                              onEditApplied={() => {
                                if (state.selectedLayerId) {
                                  const layerId = state.selectedLayerId;
                                  const current = state.adjustments;
                                  setLayerAdjustments(prev => ({ ...prev, [layerId]: { ...current } }));
                                  const isAtDefaults =
                                    current.brightness === 0 && current.contrast === 0 &&
                                    current.saturation === 0 && current.exposure === 0 &&
                                    current.highlights === 0 && current.shadows === 0 &&
                                    current.sharpness === 1.0;
                                  setEditedLayers(prev => {
                                    const newSet = new Set(prev);
                                    if (isAtDefaults) newSet.delete(layerId); else newSet.add(layerId);
                                    return newSet;
                                  });
                                }
                              }}
                            />
                          );
                        } else if (id === 'history') {
                          content = <HistoryPanel />;
                        } else if (id === 'colorgrading') {
                          content = <ColorGradingPanel />;
                        } else {
                          content = <WatermarkPanel layerId={state.selectedLayerId} />;
                        }
                        return (
                          <div
                            key={id}
                            data-panel-id={id}
                            className={`group flex items-start gap-1 transition-opacity duration-150${
                              draggingPanel === id ? ' opacity-40' : ''
                            }`}
                          >
                            {/* Drag-to-reorder grip */}
                            <div
                              className="flex-shrink-0 w-3.5 pt-3 flex justify-center opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing touch-none select-none transition-opacity"
                              onPointerDown={(e) => handlePanelGripDown(e, id)}
                              title="Drag to reorder"
                            >
                              <GripVertical className="w-3 h-3 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">{content}</div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>
        
        {/* Keyboard Shortcuts Panel */}
        <ShortcutsPanel isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

        {/* Export Page */}
        {showExportPage && (
          <ExportPage
            projectId={projectId}
            layers={state.layers}
            layerAdjustments={layerAdjustments}
            editedLayers={editedLayers}
            lockedLayers={lockedLayers}
            onClose={() => setShowExportPage(false)}
          />
        )}

        {/* Quick Export Dialog */}
        <ExportDialog
          isOpen={showExportDialog}
          onClose={() => setShowExportDialog(false)}
          layerId={state.selectedLayerId}
          adjustments={state.selectedLayerId ? layerAdjustments[state.selectedLayerId] ?? state.adjustments : undefined}
          filename={state.layers.find(l => l.id === state.selectedLayerId)?.name}
        />

        {/* Fullscreen View Mode */}
        {isFullscreenView && (
          <div className="fixed inset-0 bg-gray-950 z-50 flex items-center justify-center">
            {/* Focus mode button — top-left: hides all controls until proximity hover */}
            <div className={`absolute z-10 ${
              isFocusMode
                ? 'top-0 left-0 group w-20 h-20 flex items-start justify-start pt-4 pl-4'
                : 'top-4 left-4'
            }`}>
              <button
                onClick={() => setIsFocusMode(v => !v)}
                className={`p-2.5 rounded-full border transition-all ${
                  isFocusMode
                    ? 'opacity-0 group-hover:opacity-100 bg-gray-900/40 group-hover:bg-gray-900/85 border-gray-700/50 group-hover:border-gray-600'
                    : 'bg-gray-900/40 hover:bg-gray-900/85 border-gray-700/50 hover:border-gray-600'
                }`}
                title={isFocusMode ? 'Exit focus mode' : 'Focus mode — hide controls'}
              >
                <EyeOff className="w-[18px] h-[18px] text-gray-200" />
              </button>
            </div>

            {/* Navigation Buttons */}
            <div className={`absolute z-10 ${
              isFocusMode
                ? 'left-0 top-1/2 -translate-y-1/2 group w-20 h-32 flex items-center justify-start pl-4'
                : 'left-4 top-1/2 -translate-y-1/2'
            }`}>
              <button
                onClick={() => {
                  const currentIndex = state.layers.findIndex((l) => l.id === state.selectedLayerId);
                  if (currentIndex > 0) {
                    setSelectedLayerId(state.layers[currentIndex - 1].id);
                  }
                }}
                disabled={state.layers.findIndex((l) => l.id === state.selectedLayerId) === 0}
                className={`p-2.5 bg-gray-900/40 hover:bg-gray-900/85 rounded-full border border-gray-700/50 hover:border-gray-600 transition-all disabled:cursor-not-allowed ${
                  isFocusMode ? 'opacity-0 group-hover:opacity-100' : 'disabled:opacity-20'
                }`}
                title="Previous image"
              >
                <ChevronLeft className="w-[18px] h-[18px] text-gray-200" />
              </button>
            </div>

            <div className={`absolute z-10 ${
              isFocusMode
                ? 'right-0 top-1/2 -translate-y-1/2 group w-20 h-32 flex items-center justify-end pr-4'
                : 'right-4 top-1/2 -translate-y-1/2'
            }`}>
              <button
                onClick={() => {
                  const currentIndex = state.layers.findIndex((l) => l.id === state.selectedLayerId);
                  if (currentIndex < state.layers.length - 1) {
                    setSelectedLayerId(state.layers[currentIndex + 1].id);
                  }
                }}
                disabled={state.layers.findIndex((l) => l.id === state.selectedLayerId) === state.layers.length - 1}
                className={`p-2.5 bg-gray-900/40 hover:bg-gray-900/85 rounded-full border border-gray-700/50 hover:border-gray-600 transition-all disabled:cursor-not-allowed ${
                  isFocusMode ? 'opacity-0 group-hover:opacity-100' : 'disabled:opacity-20'
                }`}
                title="Next image"
              >
                <ChevronRight className="w-[18px] h-[18px] text-gray-200" />
              </button>
            </div>

            {/* B/A toggle — top-left (next to focus mode button) */}
            <div className={`absolute z-10 ${
              isFocusMode
                ? 'top-0 left-14 group w-auto h-20 flex items-start justify-start pt-4'
                : 'top-4 left-14'
            }`}>
              <button
                onClick={() => setShowFullscreenCompare(v => !v)}
                className={`p-2.5 rounded-full border transition-all ${
                  showFullscreenCompare
                    ? 'bg-blue-600/80 hover:bg-blue-500 border-blue-500 text-white'
                    : 'bg-gray-900/40 hover:bg-gray-900/85 border-gray-700/50 hover:border-gray-600'
                } ${isFocusMode ? 'opacity-0 group-hover:opacity-100' : ''}`}
                title="Before / After comparison"
              >
                <SplitSquareVertical className="w-[18px] h-[18px] text-gray-200" />
              </button>
            </div>

            {/* Close Button — top-right */}
            <div className={`absolute z-10 ${
              isFocusMode
                ? 'top-0 right-0 group w-20 h-20 flex items-start justify-end pt-4 pr-4'
                : 'top-4 right-4'
            }`}>
              <button
                onClick={() => { setIsFullscreenView(false); setIsFocusMode(false); setShowFullscreenCompare(false); }}
                className={`p-2.5 bg-gray-900/40 hover:bg-gray-900/85 rounded-full border border-gray-700/50 hover:border-gray-600 transition-all ${
                  isFocusMode ? 'opacity-0 group-hover:opacity-100' : ''
                }`}
                title="Exit fullscreen (ESC)"
              >
                <svg className="w-[18px] h-[18px] text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Image Display — shrinks when filmstrip is open */}
            <div
              className="w-full h-full flex items-center justify-center transition-all"
              style={{ paddingBottom: filmstripCollapsed ? 20 : 104 }}
            >
              {showFullscreenCompare && selectedImageUrl ? (
                <CompareView
                  originalImage={selectedImageUrl}
                  editedImage={selectedImageUrl}
                  adjustments={state.adjustments}
                />
              ) : selectedImageUrl ? (
                <img
                  src={selectedImageUrl}
                  alt={selectedLayer?.content ? selectedLayer.content.split(/[/\\]/).pop() || 'Image' : 'Image'}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <p className="text-gray-400">No image to display</p>
              )}
            </div>

            {/* Image Info — rides just above the filmstrip */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 z-20 ${isFocusMode ? 'group px-16 pt-6 pb-2' : ''}`}
              style={{ bottom: filmstripCollapsed ? 28 : 112 }}
            >
              <div
                className={`bg-gray-900/40 hover:bg-gray-900/85 px-4 py-2 rounded-full border border-gray-700/50 hover:border-gray-600 cursor-pointer select-none transition-all ${isFocusMode ? 'opacity-0 group-hover:opacity-100' : ''}`}
                onClick={() => setFullscreenShowFilename(v => !v)}
                title={fullscreenShowFilename ? 'Click to hide filename' : 'Click to show filename'}
              >
                <p className="text-sm text-gray-300">
                  {state.layers.findIndex((l) => l.id === state.selectedLayerId) + 1} / {state.layers.length}
                  {fullscreenShowFilename && selectedLayer?.content && ` — ${selectedLayer.content.split(/[/\\]/).pop() || ''}`}
                </p>
              </div>
            </div>

            {/* Filmstrip — collapsible horizontal thumbnail tray */}
            <div
              className={`absolute bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-800 z-10 transition-all overflow-hidden ${isFocusMode ? 'opacity-0 hover:opacity-100' : ''}`}
              style={{ height: filmstripCollapsed ? 20 : 96 }}
            >
              {/* Collapse / expand handle centred on the top edge */}
              <button
                onClick={() => setFilmstripCollapsed(v => !v)}
                className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-600 rounded-full px-2 py-0.5 flex items-center gap-1 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors z-20"
                title={filmstripCollapsed ? 'Show filmstrip' : 'Hide filmstrip'}
              >
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${filmstripCollapsed ? 'rotate-180' : ''}`} />
              </button>

              {!filmstripCollapsed && (
                <div
                  ref={filmstripRef}
                  className="flex gap-2 overflow-x-auto w-full h-full items-center px-3 py-1"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}
                >
                  {state.layers.map((layer) => {
                    const thumbUrl = resolveImageUrl(layer.content ?? null);
                    const isActive = layer.id === state.selectedLayerId;
                    return (
                      <button
                        key={layer.id}
                        data-active={isActive ? 'true' : 'false'}
                        onClick={() => setSelectedLayerId(layer.id)}
                        className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all ${
                          isActive
                            ? 'border-blue-500 opacity-100 scale-105'
                            : 'border-transparent opacity-55 hover:opacity-85 hover:border-gray-500'
                        }`}
                        title={layer.content?.split(/[/\\]/).pop() || `Image ${layer.id}`}
                      >
                        {thumbUrl ? (
                          <img src={thumbUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                        ) : (
                          <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-500 text-xs">?</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
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
