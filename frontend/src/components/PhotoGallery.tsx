/**
 * PhotoGallery - Display and manage photos in a project
 */
import React, { useState, useEffect, useRef, useLayoutEffect, useMemo } from 'react';
import axios from 'axios';
import { Upload, Trash2, Image as ImageIcon, Heart, Lock } from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:8000';

interface Layer {
  id: number;
  project_id: number;
  type: string;
  content: string | null;
  width: number;
  height: number;
  z_index: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  blend_mode?: string | null;
  x?: number;
  y?: number;
  created_at?: string;
}

interface PhotoGalleryProps {
  projectId: number;
  selectedLayerId?: number | null;
  onSelectPhoto?: (layer: Layer) => void;
  onOpenEditor?: (layer: Layer) => void;
  onLayersChange?: (layers: Layer[]) => void;
  filter?: 'all' | 'liked' | 'locked' | 'edited' | 'not-edited';
  editedLayers?: Set<number>;
  onEditLayer?: (layerId: number) => void;
  onDelete?: (layerId: number) => Promise<void>;
  columns?: number;
  /** Called once with a function that triggers the file picker — used by parent to show a compact upload icon button when photos exist */
  onUploadTrigger?: (trigger: () => void) => void;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ projectId, selectedLayerId, onSelectPhoto, onOpenEditor, onLayersChange, filter = 'all', editedLayers = new Set(), onEditLayer, onDelete, columns = 2, onUploadTrigger }) => {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [favoritedLayers, setFavoritedLayers] = useState<Set<number>>(new Set());
  const [lockedLayers, setLockedLayers] = useState<Set<number>>(new Set());

  // ── Pointer-drag state ──────────────────────────────────────────────────
  const [isDragging, setIsDragging] = useState(false);
  const [previewIds, setPreviewIds] = useState<number[]>([]);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
  const [ghostData, setGhostData] = useState<{ url: string; w: number; h: number } | null>(null);

  // Refs that are safe to read inside async event handlers without stale closures
  const draggingIdRef   = useRef<number | null>(null);
  const previewIdsRef   = useRef<number[]>([]);
  const prevRectsRef    = useRef<Map<number, DOMRect>>(new Map());
  const cardRefs        = useRef<Map<number, HTMLDivElement>>(new Map());
  const didDragRef      = useRef(false);
  const filteredLayersRef = useRef<Layer[]>([]);
  const selectedPhotoRef  = useRef<HTMLDivElement>(null);
  const fileInputRef      = useRef<HTMLInputElement>(null);

  // filteredLayers – computed once here so the drag handler can read via filteredLayersRef
  const filteredLayers = useMemo(() => {
    const result = layers.filter(layer => {
      if (filter === 'all') return true;
      if (filter === 'liked') return favoritedLayers.has(layer.id);
      if (filter === 'locked') return lockedLayers.has(layer.id);
      if (filter === 'edited') return editedLayers.has(layer.id);
      if (filter === 'not-edited') return !editedLayers.has(layer.id);
      return true;
    });
    filteredLayersRef.current = result;
    return result;
  }, [layers, filter, favoritedLayers, lockedLayers, editedLayers]);

  // displayLayers – reordered during drag to drive live preview
  const displayLayers = useMemo(() => {
    if (!isDragging || previewIds.length === 0) return filteredLayers;
    return previewIds
      .map(id => filteredLayers.find(l => l.id === id))
      .filter((l): l is Layer => l !== undefined);
  }, [isDragging, previewIds, filteredLayers]);

  // Expose the file picker trigger to the parent so it can show a compact
  // upload icon button in its own header when photos exist.
  useEffect(() => {
    onUploadTrigger?.(() => fileInputRef.current?.click());
  }, [onUploadTrigger]);

  // FLIP "Play" step: after React commits the new order, animate each card
  // from its old DOM position to its new one.
  useLayoutEffect(() => {
    if (!isDragging || prevRectsRef.current.size === 0) return;
    cardRefs.current.forEach((el, id) => {
      const prev = prevRectsRef.current.get(id);
      if (!prev) return;
      const curr = el.getBoundingClientRect();
      const dx = prev.left - curr.left;
      const dy = prev.top  - curr.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      // Invert: snap back instantly
      el.style.transition = 'none';
      el.style.transform  = `translate(${dx}px, ${dy}px)`;
      // Play: animate forward
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition = 'transform 180ms cubic-bezier(0.2, 0, 0, 1)';
          el.style.transform  = '';
        });
      });
    });
    prevRectsRef.current.clear();
  }, [previewIds]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pointer drag handler ────────────────────────────────────────────────
  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    layer: Layer,
    imageUrl: string,
  ) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    const rect    = el.getBoundingClientRect();
    const startX  = e.clientX;
    const startY  = e.clientY;
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    let started = false;

    const onMove = (ev: PointerEvent) => {
      if (!started && Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return;

      if (!started) {
        started = true;
        didDragRef.current = true;
        draggingIdRef.current = layer.id;
        const initIds = filteredLayersRef.current.map(l => l.id);
        previewIdsRef.current = initIds;
        setPreviewIds(initIds);
        setGhostData({ url: imageUrl, w: rect.width, h: rect.height });
        setIsDragging(true);
      }

      setGhostPos({ x: ev.clientX - offsetX, y: ev.clientY - offsetY });

      // Find which card the pointer is over
      const under = document.elementFromPoint(ev.clientX, ev.clientY);
      const card  = under?.closest('[data-layer-id]') as HTMLElement | null;
      if (!card) return;
      const targetId = parseInt(card.dataset.layerId!, 10);
      if (isNaN(targetId) || targetId === draggingIdRef.current) return;

      const fromIdx = previewIdsRef.current.indexOf(draggingIdRef.current!);
      const toIdx   = previewIdsRef.current.indexOf(targetId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

      // ── Two-threshold hysteresis ─────────────────────────────────────────
      // The card area is divided into three zones:
      //   [0% – 30%]  backward trigger
      //   [30% – 70%] neutral dead-zone  → no action
      //   [70% – 100%] forward trigger
      //
      // Moving forward  (toIdx > fromIdx): only swap past the 70% line.
      // Moving backward (toIdx < fromIdx): only swap before the 30% line.
      // The 40% dead-zone in the centre prevents the cursor from sitting
      // right on a threshold after a grid reflow and causing oscillation.
      const BACK  = 0.30;
      const FWD   = 0.70;
      const targetRect = card.getBoundingClientRect();
      // Pick the dominant axis: horizontal within a row, vertical across rows.
      const useX = Math.abs(ev.clientX - (targetRect.left + targetRect.width  / 2)) >=
                   Math.abs(ev.clientY - (targetRect.top  + targetRect.height / 2));
      if (toIdx > fromIdx) {
        // Forward: pointer must be past the 70% mark
        const fwdLine = useX
          ? targetRect.left + targetRect.width  * FWD
          : targetRect.top  + targetRect.height * FWD;
        if (useX ? ev.clientX < fwdLine : ev.clientY < fwdLine) return;
      } else {
        // Backward: pointer must be before the 30% mark
        const backLine = useX
          ? targetRect.left + targetRect.width  * BACK
          : targetRect.top  + targetRect.height * BACK;
        if (useX ? ev.clientX > backLine : ev.clientY > backLine) return;
      }
      // ────────────────────────────────────────────────────────────────────

      // FLIP "First": capture current card positions before the reorder
      cardRefs.current.forEach((cardEl, cid) => {
        prevRectsRef.current.set(cid, cardEl.getBoundingClientRect());
      });

      const next = [...previewIdsRef.current];
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, draggingIdRef.current!);
      previewIdsRef.current = next;
      setPreviewIds(next);   // triggers FLIP "Last" + "Play" via useLayoutEffect
    };

    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup',   onUp);
      if (!started) { didDragRef.current = false; return; }

      const finalIds = previewIdsRef.current;
      setIsDragging(false);
      setGhostData(null);
      draggingIdRef.current = null;

      // Commit: rebuild the full layers array, preserving positions of non-filtered layers
      setLayers(prev => {
        const filteredSet = new Set(finalIds);
        const slots: number[] = [];
        prev.forEach((l, i) => { if (filteredSet.has(l.id)) slots.push(i); });
        const newLayers = [...prev];
        finalIds.forEach((id, i) => {
          const src = prev.find(l => l.id === id)!;
          newLayers[slots[i]] = { ...src, z_index: slots[i] };
        });
        axios.post(`${API_URL}/api/layers/reorder`, { layer_ids: newLayers.map(l => l.id) })
          .catch(err => { console.error('Reorder failed', err); fetchLayers(); });
        onLayersChange?.(newLayers);
        return newLayers;
      });

      previewIdsRef.current = [];
      setPreviewIds([]);
      setTimeout(() => { didDragRef.current = false; }, 0);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup',   onUp);
  };
  // ───────────────────────────────────────────────────────────────────────

  const favoritesStorageKey = `darkroom-favorited-layers-${projectId}`;

  useEffect(() => {
    fetchLayers();
  }, [projectId]);

  useEffect(() => {
    const savedFavorites = localStorage.getItem(favoritesStorageKey);
    if (savedFavorites) {
      try {
        const parsed = JSON.parse(savedFavorites) as number[];
        setFavoritedLayers(new Set(parsed));
      } catch (e) {
        console.error('Failed to parse favorites from localStorage', e);
      }
    }
  }, [favoritesStorageKey]);

  useEffect(() => {
    if (favoritedLayers.size > 0) {
      localStorage.setItem(favoritesStorageKey, JSON.stringify(Array.from(favoritedLayers)));
    } else {
      localStorage.removeItem(favoritesStorageKey);
    }
  }, [favoritedLayers, favoritesStorageKey]);


  // Scroll to selected photo when it changes
  useEffect(() => {
    if (selectedPhotoRef.current) {
      selectedPhotoRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedLayerId]);

  const fetchLayers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/layers`, {
        params: { project_id: projectId }
      });
      setLayers(response.data);
      const layerIds = new Set(response.data.map((layer: Layer) => layer.id));
      setFavoritedLayers(prev => new Set(Array.from(prev).filter((id) => layerIds.has(id))));
      setLockedLayers(new Set(response.data.filter((layer: Layer) => layer.locked).map((layer: Layer) => layer.id)));
      onLayersChange?.(response.data);
    } catch (err) {
      console.error('Error fetching layers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('project_id', projectId.toString());

        await axios.post(`${API_URL}/api/import?project_id=${projectId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      await fetchLayers();
    } catch (err: any) {
      console.error('Error uploading files:', err);
      alert(err.response?.data?.detail || 'Failed to upload images');
    } finally {
      setUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  const handleDeleteLayer = async (layerId: number, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm('Delete this photo?')) return;

    try {
      if (onDelete) {
        await onDelete(layerId);
        await fetchLayers();
      } else {
        await axios.delete(`${API_URL}/api/layers/${layerId}`);
        await fetchLayers();
      }
    } catch (err: any) {
      console.error('Error deleting layer:', err);
      alert(err.response?.data?.detail || 'Failed to delete image');
    }
  };

  const getImageUrl = (layer: Layer) => {
    if (!layer.content) {
      console.warn(`Layer ${layer.id} has no content`);
      return '';
    }
    // Handle both absolute paths and relative paths
    let filename = layer.content;
    if (filename.includes('/') || filename.includes('\\')) {
      filename = filename.split(/[\/\\]/).pop() || '';
    }
    if (!filename) {
      console.error(`Could not extract filename from content: ${layer.content}`);
      return '';
    }
    const url = `${API_URL}/storage/originals/${filename}`;
    console.debug(`Generated image URL for layer ${layer.id}: ${url}`);
    return url;
  };

  const toggleFavorite = (layerId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoritedLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(layerId)) {
        newSet.delete(layerId);
      } else {
        newSet.add(layerId);
      }
      return newSet;
    });
  };

  const toggleLock = (layerId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const layer = layers.find((entry) => entry.id === layerId);
    if (!layer) return;

    const nextLocked = !layer.locked;
    const payload = {
      project_id: layer.project_id,
      type: layer.type,
      content: layer.content,
      z_index: layer.z_index,
      locked: nextLocked,
      opacity: layer.opacity,
      visible: layer.visible,
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      blend_mode: layer.blend_mode,
    };

    axios
      .put(`${API_URL}/api/layers/${layerId}`, payload)
      .then(() => {
        const updatedLayers = layers.map((entry) => (
          entry.id === layerId ? { ...entry, locked: nextLocked } : entry
        ));
        setLayers(updatedLayers);
        setLockedLayers(prev => {
          const next = new Set(prev);
          if (nextLocked) {
            next.add(layerId);
          } else {
            next.delete(layerId);
          }
          return next;
        });
        onLayersChange?.(updatedLayers);
      })
      .catch((err) => {
        console.error('Error updating layer lock state:', err);
      });
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading photos...
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Hidden file input — always in DOM, triggered by big button or parent icon */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileUpload}
        disabled={uploading}
        className="hidden"
      />

      {/* Big upload button — only shown when there are no photos yet */}
      {!loading && layers.length === 0 && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg cursor-pointer transition-colors disabled:opacity-60"
          >
            <Upload className="w-5 h-5 mr-2" />
            <span className="font-medium">
              {uploading ? 'Uploading...' : 'Upload Photos'}
            </span>
          </button>
        </div>
      )}

      {/* Photos Grid */}
      {displayLayers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-700" />
          <p>No photos match this filter</p>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {displayLayers.map((layer, index) => (
            <div
              key={layer.id}
              data-layer-id={layer.id}
              ref={(el) => {
                if (el) cardRefs.current.set(layer.id, el);
                else    cardRefs.current.delete(layer.id);
                if (selectedLayerId === layer.id)
                  (selectedPhotoRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
              }}
              onPointerDown={(e) => handlePointerDown(e, layer, getImageUrl(layer))}
              onClick={() => { if (!didDragRef.current) onSelectPhoto?.(layer); }}
              onDoubleClick={() => {
                if (didDragRef.current) return;
                onSelectPhoto?.(layer);
                onOpenEditor?.(layer);
              }}
              style={{ opacity: isDragging && draggingIdRef.current === layer.id ? 0.15 : 1 }}
              className={`relative aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-grab active:cursor-grabbing group border select-none ${
                selectedLayerId === layer.id
                  ? 'border-blue-500 ring-2 ring-blue-500'
                  : 'border-gray-700 hover:border-blue-600'
              }`}
            >
              {getImageUrl(layer) ? (
                <img
                  src={getImageUrl(layer)}
                  alt={layer.content ? layer.content.split(/[/\\]/).pop() || 'photo' : 'photo'}
                  className="w-full h-full object-cover select-none"
                  draggable={false}
                  loading="lazy"
                  onError={(e) => {
                    console.error(`Failed to load image for layer ${layer.id}: ${(e.target as HTMLImageElement).src}`);
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                  onLoad={() => {
                    console.debug(`Successfully loaded image for layer ${layer.id}`);
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <ImageIcon className="w-12 h-12 text-gray-600" />
                </div>
              )}

              {/* Image number — semi-transparent, full opacity on hover */}
              <div className="absolute top-1 left-1 bg-gray-900/80 px-1.5 py-0.5 rounded text-[10px] text-white font-medium opacity-40 group-hover:opacity-100 transition-opacity">
                {index + 1}/{displayLayers.length}
              </div>

              {/* Favorite button — hidden unless hearted or hovering */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => toggleFavorite(layer.id, e)}
                className={`absolute bottom-1 left-1 p-1 bg-gray-900/80 hover:bg-gray-800 rounded transition-opacity ${
                  favoritedLayers.has(layer.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
                }`}
                title={favoritedLayers.has(layer.id) ? "Unfavorite" : "Favorite"}
              >
                <Heart
                  className={`w-3 h-3 transition-colors ${
                    favoritedLayers.has(layer.id) ? 'fill-red-500 text-red-500' : 'text-gray-300'
                  }`}
                />
              </button>

              {/* Lock button — hidden unless locked or hovering */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => toggleLock(layer.id, e)}
                className={`absolute bottom-1 right-1 p-1 bg-gray-900/80 hover:bg-gray-800 rounded transition-opacity ${
                  lockedLayers.has(layer.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
                }`}
                title={lockedLayers.has(layer.id) ? "Unlock for editing" : "Lock to prevent editing"}
              >
                <Lock
                  className={`w-3 h-3 transition-colors ${
                    lockedLayers.has(layer.id) ? 'text-yellow-400' : 'text-gray-300'
                  }`}
                />
              </button>

              {/* Delete button — hidden until hovering, never shown when locked */}
              {!lockedLayers.has(layer.id) && (
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => handleDeleteLayer(layer.id, e)}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-500 rounded opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity"
                  title="Delete photo"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Floating ghost card that follows the cursor while dragging */}
      {ghostData && (
        <div
          style={{
            position: 'fixed',
            left: ghostPos.x,
            top: ghostPos.y,
            width: ghostData.w,
            height: ghostData.h,
            pointerEvents: 'none',
            zIndex: 9999,
            opacity: 0.9,
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            transform: 'scale(1.06) rotate(1.5deg)',
          }}
        >
          {ghostData.url ? (
            <img src={ghostData.url} className="w-full h-full object-cover" draggable={false} alt="" />
          ) : (
            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-gray-500" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;
