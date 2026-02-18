/**
 * PhotoGallery - Display and manage photos in a project
 */
import React, { useState, useEffect, useRef } from 'react';
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
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ projectId, selectedLayerId, onSelectPhoto, onOpenEditor, onLayersChange, filter = 'all', editedLayers = new Set(), onEditLayer, onDelete }) => {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [favoritedLayers, setFavoritedLayers] = useState<Set<number>>(new Set());
  const [lockedLayers, setLockedLayers] = useState<Set<number>>(new Set());
  const selectedPhotoRef = useRef<HTMLDivElement>(null);

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
      {/* Upload Button */}
      <div className="mb-4">
        <label className="flex items-center justify-center w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg cursor-pointer transition-colors">
          <Upload className="w-5 h-5 mr-2" />
          <span className="font-medium">
            {uploading ? 'Uploading...' : 'Upload Photos'}
          </span>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Photos Grid */}
      {(() => {
        const filteredLayers = layers.filter(layer => {
          if (filter === 'all') return true;
          if (filter === 'liked') return favoritedLayers.has(layer.id);
          if (filter === 'locked') return lockedLayers.has(layer.id);
          if (filter === 'edited') return editedLayers.has(layer.id);
          if (filter === 'not-edited') return !editedLayers.has(layer.id);
          return true;
        });
        
        return filteredLayers.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-700" />
            <p>No photos match this filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredLayers.map((layer, index) => (
            <div
              key={layer.id}
              ref={selectedLayerId === layer.id ? selectedPhotoRef : null}
              onClick={() => onSelectPhoto?.(layer)}
              onDoubleClick={() => {
                onSelectPhoto?.(layer);
                onOpenEditor?.(layer);
              }}
              className={`relative aspect-square bg-gray-800 rounded-lg overflow-hidden cursor-pointer group border transition-all ${
                selectedLayerId === layer.id
                  ? 'border-blue-500 ring-2 ring-blue-500'
                  : 'border-gray-700 hover:border-blue-600'
              }`}
            >
              {getImageUrl(layer) ? (
                <img
                  src={getImageUrl(layer)}
                  alt={layer.content ? layer.content.split(/[/\\]/).pop() || 'photo' : 'photo'}
                  className="w-full h-full object-cover"
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

              {/* Image number */}
              <div className="absolute top-1 left-1 bg-gray-900/80 px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                {index + 1}/{filteredLayers.length}
              </div>

              {/* Favorite button */}
              <button
                onClick={(e) => toggleFavorite(layer.id, e)}
                className="absolute bottom-1 left-1 p-1 bg-gray-900/80 hover:bg-gray-800 rounded transition-colors"
                title={favoritedLayers.has(layer.id) ? "Unfavorite" : "Favorite"}
              >
                <Heart 
                  className={`w-3 h-3 transition-colors ${
                    favoritedLayers.has(layer.id) 
                      ? 'fill-red-500 text-red-500' 
                      : 'text-gray-300'
                  }`}
                />
              </button>

              {/* Lock button */}
              <button
                onClick={(e) => toggleLock(layer.id, e)}
                className="absolute bottom-1 right-1 p-1 bg-gray-900/80 hover:bg-gray-800 rounded transition-colors"
                title={lockedLayers.has(layer.id) ? "Unlock for editing" : "Lock to prevent editing"}
              >
                <Lock 
                  className={`w-3 h-3 transition-colors ${
                    lockedLayers.has(layer.id) 
                      ? 'text-yellow-400' 
                      : 'text-gray-300'
                  }`}
                />
              </button>

              {/* Delete button */}
              <button
                onClick={(e) => handleDeleteLayer(layer.id, e)}
                disabled={lockedLayers.has(layer.id)}
                className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-500 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                title={lockedLayers.has(layer.id) ? "Locked - cannot delete" : "Delete photo"}
              >
                <Trash2 className="w-4 h-4 text-white" />
              </button>
            </div>
          ))}
        </div>
        );
      })()}
    </div>
  );
};

export default PhotoGallery;
