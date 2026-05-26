/**
 * CropTool - Interactive crop tool with rotation and aspect ratios
 * Hybrid Lightroom + Photoshop approach with professional controls
 */
import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Transformer, Image as KonvaImage } from 'react-konva';
import { useEditor } from '../../contexts/EditorContext.js'; // Added .js extension
import { useCrop } from '../../hooks/useCrop.js'; // Added .js extension

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:8000';

interface CropToolProps {
  layerId: number;
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
  containerWidth?: number;
  containerHeight?: number;
  onComplete?: () => void;
  onCancel?: () => void;
}

// Aspect ratio presets
const ASPECT_RATIOS = [
  { label: 'Free', value: null },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '1:1', value: 1 },
  { label: '9:16', value: 9 / 16 },
  { label: '4:5', value: 4 / 5 },
  { label: '5:4', value: 5 / 4 },
  { label: '2:3', value: 2 / 3 },
];

const CropTool: React.FC<CropToolProps> = ({
  layerId,
  imageUrl,
  originalWidth,
  originalHeight,
  containerWidth,
  containerHeight,
  onComplete,
  onCancel,
}) => {
  const { state, setProcessing } = useEditor();
  const {
    cropRect,
    setCropRect,
    rotation,
    setRotation,
    aspectRatio,
    setAspectRatio,
    applyCrop,
    loading,
    error,
  } = useCrop(layerId);

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const cropRectRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const stageRef = useRef<any>(null);

  // Canvas dimensions — use container size if provided (fallback to safe defaults)
  const canvasWidth = (containerWidth && containerWidth > 50) ? containerWidth : 800;
  const canvasHeight = (containerHeight && containerHeight > 50) ? containerHeight : 600;

  // Load image
  useEffect(() => {
    if (!imageUrl) return;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    // imageUrl may already be a full URL (from resolveImageUrl) — don't double-prepend
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      img.src = imageUrl;
    } else {
      img.src = `${API_URL}${imageUrl}`;
    }

    img.onerror = () => {
      console.error('CropTool: failed to load image', img.src);
    };
    
    img.onload = () => {
      setImage(img);
      
      // Initialize crop rect to full image
      const scale = Math.min(
        canvasWidth / img.width,
        canvasHeight / img.height
      );
      
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      
      setCropRect({
        x: (canvasWidth - scaledWidth) / 2,
        y: (canvasHeight - scaledHeight) / 2,
        width: scaledWidth,
        height: scaledHeight,
      });
    };
  }, [imageUrl, canvasWidth, canvasHeight]);

  // Attach transformer to crop rectangle
  useEffect(() => {
    if (transformerRef.current && cropRectRef.current) {
      transformerRef.current.nodes([cropRectRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [cropRect]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleApply();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if (e.key === '[') {
        e.preventDefault();
        const n = rotation - 90;
        setRotation(n < -180 ? n + 360 : n);
      } else if (e.key === ']') {
        e.preventDefault();
        const n = rotation + 90;
        setRotation(n > 180 ? n - 360 : n);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cropRect, rotation]);

  const handleTransform = () => {
    const node = cropRectRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Apply aspect ratio constraint if set
    let newWidth = node.width() * scaleX;
    let newHeight = node.height() * scaleY;

    if (aspectRatio) {
      if (scaleX !== 1) {
        newHeight = newWidth / aspectRatio;
      } else if (scaleY !== 1) {
        newWidth = newHeight * aspectRatio;
      }
    }

    // Update crop rect
    setCropRect({
      x: node.x(),
      y: node.y(),
      width: newWidth,
      height: newHeight,
    });

    // Reset scale
    node.scaleX(1);
    node.scaleY(1);
  };

  const handleAspectRatioChange = (ratio: number | null) => {
    setAspectRatio(ratio);
    
    if (ratio && cropRect) {
      // Adjust height to maintain aspect ratio
      const newHeight = cropRect.width / ratio;
      setCropRect({
        ...cropRect,
        height: newHeight,
      });
    }
  };

  const handleApply = async () => {
    if (!cropRect || !image) return;

    setProcessing(true);
    
    // Convert canvas coordinates back to actual image pixel coordinates
    const scale = Math.min(
      canvasWidth / image.naturalWidth,
      canvasHeight / image.naturalHeight
    );
    const offsetX = (canvasWidth - image.naturalWidth * scale) / 2;
    const offsetY = (canvasHeight - image.naturalHeight * scale) / 2;
    
    const imgX = (cropRect.x - offsetX) / scale;
    const imgY = (cropRect.y - offsetY) / scale;
    const imgWidth = cropRect.width / scale;
    const imgHeight = cropRect.height / scale;

    try {
      await applyCrop(
        Math.round(imgX),
        Math.round(imgY),
        Math.round(imgWidth),
        Math.round(imgHeight),
        rotation
      );
      
      if (onComplete) onComplete();
    } catch (err) {
      console.error('Crop failed:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  const handleReset = () => {
    if (!image) return;
    
    const scale = Math.min(
      canvasWidth / image.width,
      canvasHeight / image.height
    );
    
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;
    
    setCropRect({
      x: (canvasWidth - scaledWidth) / 2,
      y: (canvasHeight - scaledHeight) / 2,
      width: scaledWidth,
      height: scaledHeight,
    });
    setRotation(0);
    setAspectRatio(null);
  };

  if (!image) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-400">Loading image...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-y-auto max-h-full bg-gray-800 rounded-lg">
      <div className="flex flex-col gap-3 p-3">
        {/* Aspect Ratio */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Aspect Ratio</label>
          <div className="flex flex-wrap gap-1">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio.label}
                onClick={() => handleAspectRatioChange(ratio.value)}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  aspectRatio === ratio.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {ratio.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rotation */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">
            Rotation: {rotation.toFixed(1)}°
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const n = rotation - 90;
                setRotation(n < -180 ? n + 360 : n);
              }}
              className="px-2 py-0.5 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              title="Rotate 90° left ([)"
            >
              ↺ 90°
            </button>
            <input
              type="range"
              min="-180"
              max="180"
              step="0.1"
              value={rotation}
              onChange={(e) => setRotation(parseFloat(e.target.value))}
              className="flex-1 h-1 accent-blue-500"
            />
            <button
              onClick={() => {
                const n = rotation + 90;
                setRotation(n > 180 ? n - 360 : n);
              }}
              className="px-2 py-0.5 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
              title="Rotate 90° right (])"
            >
              ↻ 90°
            </button>
          </div>
        </div>

        {/* Dimensions */}
        {cropRect && (
          <div className="text-xs text-gray-400">
            {Math.round(cropRect.width)} × {Math.round(cropRect.height)} px
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-2 bg-red-900/50 border border-red-700 rounded text-xs text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="relative bg-gray-900 mx-3 rounded-lg overflow-hidden border border-gray-700">
        <Stage width={canvasWidth} height={canvasHeight} ref={stageRef}>
          <Layer>
            {(() => {
              const scale = Math.min(canvasWidth / image.width, canvasHeight / image.height);
              const scaledW = image.width * scale;
              const scaledH = image.height * scale;
              const cx = canvasWidth / 2;
              const cy = canvasHeight / 2;
              return (
                <KonvaImage
                  image={image}
                  x={cx}
                  y={cy}
                  width={scaledW}
                  height={scaledH}
                  offsetX={scaledW / 2}
                  offsetY={scaledH / 2}
                  rotation={rotation}
                  opacity={0.5}
                />
              );
            })()}
            {cropRect && (
              <>
                <Rect
                  ref={cropRectRef}
                  x={cropRect.x}
                  y={cropRect.y}
                  width={cropRect.width}
                  height={cropRect.height}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dash={[10, 5]}
                  draggable
                  onDragEnd={(e) => {
                    setCropRect({ ...cropRect, x: e.target.x(), y: e.target.y() });
                  }}
                  onTransformEnd={handleTransform}
                />
                <Transformer
                  ref={transformerRef}
                  boundBoxFunc={(oldBox, newBox) =>
                    newBox.width < 50 || newBox.height < 50 ? oldBox : newBox
                  }
                />
              </>
            )}
          </Layer>
        </Stage>
      </div>

      {/* Action Buttons — Reset + Apply on top row, Cancel underneath */}
      <div className="flex flex-col gap-1.5 p-3">
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={loading}
            className="flex-1 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            disabled={loading || !cropRect}
            className="flex-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Applying…' : 'Apply (Enter)'}
          </button>
        </div>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="w-full px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors disabled:opacity-50"
        >
          Cancel (Esc)
        </button>
      </div>
    </div>
  );
};

export default CropTool;