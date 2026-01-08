/**
 * CropTool - Interactive crop tool with rotation and aspect ratios
 * Hybrid Lightroom + Photoshop approach with professional controls
 */
import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Transformer, Image as KonvaImage } from 'react-konva';
import { useEditor } from '../../contexts/EditorContext';
import { useCrop } from '../../hooks/useCrop';

interface CropToolProps {
  layerId: number;
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
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

  // Canvas dimensions
  const canvasWidth = 800;
  const canvasHeight = 600;

  // Load image
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl.startsWith('data:') 
      ? imageUrl 
      : `http://127.0.0.1:8000${imageUrl}`;
    
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
    
    // Convert canvas coordinates to image coordinates
    const scale = Math.min(
      canvasWidth / originalWidth,
      canvasHeight / originalHeight
    );
    
    const imgX = (cropRect.x - (canvasWidth - originalWidth * scale) / 2) / scale;
    const imgY = (cropRect.y - (canvasHeight - originalHeight * scale) / 2) / scale;
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
    <div className="flex flex-col gap-4 p-4 bg-gray-800 rounded-lg">
      {/* Controls */}
      <div className="flex flex-col gap-3">
        {/* Aspect Ratio */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Aspect Ratio
          </label>
          <div className="flex flex-wrap gap-2">
            {ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio.label}
                onClick={() => handleAspectRatioChange(ratio.value)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
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
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Rotation: {rotation.toFixed(1)}°
          </label>
          <input
            type="range"
            min="-180"
            max="180"
            step="0.1"
            value={rotation}
            onChange={(e) => setRotation(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Dimensions */}
        {cropRect && (
          <div className="text-sm text-gray-400">
            Crop: {Math.round(cropRect.width)} × {Math.round(cropRect.height)} px
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded text-sm text-red-300">
            {error}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700">
        <Stage width={canvasWidth} height={canvasHeight} ref={stageRef}>
          <Layer>
            {/* Background image */}
            <KonvaImage
              image={image}
              x={(canvasWidth - image.width * Math.min(canvasWidth / image.width, canvasHeight / image.height)) / 2}
              y={(canvasHeight - image.height * Math.min(canvasWidth / image.width, canvasHeight / image.height)) / 2}
              width={image.width * Math.min(canvasWidth / image.width, canvasHeight / image.height)}
              height={image.height * Math.min(canvasWidth / image.width, canvasHeight / image.height)}
              opacity={0.5}
            />
            
            {/* Crop rectangle */}
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
                    setCropRect({
                      ...cropRect,
                      x: e.target.x(),
                      y: e.target.y(),
                    });
                  }}
                  onTransformEnd={handleTransform}
                />
                <Transformer
                  ref={transformerRef}
                  boundBoxFunc={(oldBox, newBox) => {
                    // Limit minimum size
                    if (newBox.width < 50 || newBox.height < 50) {
                      return oldBox;
                    }
                    return newBox;
                  }}
                />
              </>
            )}
          </Layer>
        </Stage>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between gap-3">
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
          disabled={loading}
        >
          Reset
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
            disabled={loading}
          >
            Cancel (Esc)
          </button>
          <button
            onClick={handleApply}
            disabled={loading || !cropRect}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Applying...' : 'Apply Crop (Enter)'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CropTool;
