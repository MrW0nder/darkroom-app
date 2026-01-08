/**
 * useCrop - Custom hook for crop tool state and API integration
 * Manages crop rectangle, rotation, aspect ratio, and API calls
 */
import { useState, useCallback } from 'react';

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UseCropReturn {
  cropRect: CropRect | null;
  setCropRect: (rect: CropRect) => void;
  rotation: number;
  setRotation: (angle: number) => void;
  aspectRatio: number | null;
  setAspectRatio: (ratio: number | null) => void;
  applyCrop: (x: number, y: number, width: number, height: number, angle?: number) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export const useCrop = (layerId: number): UseCropReturn => {
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyCrop = useCallback(
    async (x: number, y: number, width: number, height: number, angle: number = 0) => {
      setLoading(true);
      setError(null);

      try {
        // Apply rotation first if needed
        if (angle !== 0) {
          const rotateResponse = await fetch('http://127.0.0.1:8000/api/crop/rotate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              layer_id: layerId,
              angle: angle,
            }),
          });

          if (!rotateResponse.ok) {
            const data = await rotateResponse.json();
            throw new Error(data.detail || 'Rotation failed');
          }
        }

        // Apply crop
        const cropResponse = await fetch('http://127.0.0.1:8000/api/crop/apply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            layer_id: layerId,
            x: Math.max(0, x),
            y: Math.max(0, y),
            width: Math.max(1, width),
            height: Math.max(1, height),
          }),
        });

        if (!cropResponse.ok) {
          const data = await cropResponse.json();
          throw new Error(data.detail || 'Crop failed');
        }

        const result = await cropResponse.json();
        console.log('Crop applied successfully:', result);
        
        // Reset state
        setCropRect(null);
        setRotation(0);
        setAspectRatio(null);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMessage);
        console.error('Crop error:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [layerId]
  );

  return {
    cropRect,
    setCropRect,
    rotation,
    setRotation,
    aspectRatio,
    setAspectRatio,
    applyCrop,
    loading,
    error,
  };
};
