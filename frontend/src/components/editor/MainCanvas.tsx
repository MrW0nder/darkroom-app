/**
 * MainCanvas - Konva-based canvas for image editing
 * Hybrid Lightroom + Photoshop approach with layers and adjustments
 */
import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import { useEditor } from '../../contexts/EditorContext.js'; // Include .js extension for node16 resolution

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:8000';

const resolveContentUrl = (content: string | null) => {
  if (!content) {
    console.warn('resolveContentUrl called with empty content');
    return '';
  }
  if (content.startsWith('data:')) {
    console.debug('Using data URL for image');
    return content;
  }
  if (content.startsWith('http://') || content.startsWith('https://')) {
    console.debug(`Using absolute HTTP URL: ${content}`);
    return content;
  }
  if (content.startsWith('/storage/')) {
    const url = `${API_URL}${content}`;
    console.debug(`Resolved /storage/ path to: ${url}`);
    return url;
  }
  // Extract filename from path
  const filename = content.split(/[/\\]/).pop();
  if (!filename) {
    console.error(`Could not extract filename from content: ${content}`);
    return '';
  }
  const url = `${API_URL}/storage/originals/${filename}`;
  console.debug(`Resolved absolute path to: ${url}`);
  return url;
};

// Define the Layer type dynamically or adjust it to match the actual `state.layers`
interface Layer {
  id: number;
  content: string | null; // Allow null for content
  visible: boolean;
  z_index: number;
  x: number;
  y: number;
  width?: number | null; // Changed to allow null
  height?: number | null; // Changed to allow null
  opacity?: number | undefined;
  locked: boolean;
}

interface MainCanvasProps {
  width?: number;
  height?: number;
  zoom?: number;
  recenterToken?: number;
  layerAdjustments?: Record<number, any>;
}

const MainCanvas: React.FC<MainCanvasProps> = ({ width = 800, height = 600, zoom = 100, recenterToken = 0, layerAdjustments = {} }) => {
  const { state } = useEditor();
  const [images, setImages] = useState<Map<number, HTMLImageElement>>(new Map());
  const [processedImages, setProcessedImages] = useState<Map<number, HTMLCanvasElement>>(new Map());
  const [layerPositions, setLayerPositions] = useState<Map<number, { x: number; y: number }>>(new Map());
  const [screenAnchor, setScreenAnchor] = useState<{ x: number; y: number } | null>(null);
  const stageRef = useRef<any>(null);
  // Stage is always container-sized; images are scaled to fit within it
  const stageWidth = width;
  const stageHeight = height;
  const scale = Math.max(0.25, Math.min(4, zoom / 100));
  const selectedLayer = state.layers.find((layer) => layer.id === state.selectedLayerId) || null;
  const primaryLayer = selectedLayer
    ? (selectedLayer.visible === false ? null : selectedLayer)
    : (state.layers.find((layer) => layer.visible) || state.layers[0] || null);
  const primaryImage = primaryLayer ? images.get(primaryLayer.id) : null;

  let imageCenterX = stageWidth / 2;
  let imageCenterY = stageHeight / 2;

  if (primaryLayer && primaryImage) {
    const imgWidth = primaryImage.width;
    const imgHeight = primaryImage.height;
    const imgAspect = imgWidth / imgHeight;
    const stageAspect = stageWidth / stageHeight;
    let displayWidth = stageWidth;
    let displayHeight = stageHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (imgAspect > stageAspect) {
      displayHeight = stageWidth / imgAspect;
      offsetY = (stageHeight - displayHeight) / 2;
    } else {
      displayWidth = stageHeight * imgAspect;
      offsetX = (stageWidth - displayWidth) / 2;
    }

    const storedPosition = layerPositions.get(primaryLayer.id);
    const posX = storedPosition?.x ?? offsetX;
    const posY = storedPosition?.y ?? offsetY;
    imageCenterX = posX + displayWidth / 2;
    imageCenterY = posY + displayHeight / 2;
  }

  const anchorX = screenAnchor?.x ?? stageWidth / 2;
  const anchorY = screenAnchor?.y ?? stageHeight / 2;
  const stageOffsetX = anchorX - imageCenterX * scale;
  const stageOffsetY = anchorY - imageCenterY * scale;

  useEffect(() => {
    if (!screenAnchor) {
      setScreenAnchor({ x: stageWidth / 2, y: stageHeight / 2 });
    }
  }, [screenAnchor, stageWidth, stageHeight]);

  useEffect(() => {
    setLayerPositions(new Map());
    setScreenAnchor({ x: stageWidth / 2, y: stageHeight / 2 });
  }, [recenterToken, stageWidth, stageHeight]);

  // Load image for the primary layer
  useEffect(() => {
    const loadImages = async () => {
      const newImages = new Map<number, HTMLImageElement>();

      if (primaryLayer && primaryLayer.content !== null) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';

        // Handle both file paths and data URLs
        const imageUrl = resolveContentUrl(primaryLayer.content);
        console.log(`Loading image from URL: ${imageUrl}`);
        img.src = imageUrl;

        await new Promise<void>((resolve) => {
          let loaded = false;
          
          img.onload = () => {
            console.log(`Successfully loaded image for layer ${primaryLayer.id}: ${img.width}x${img.height}`);
            loaded = true;
            newImages.set(primaryLayer.id, img);
            resolve();
          };
          
          img.onerror = () => {
            console.error(`Failed to load image for layer ${primaryLayer.id} from URL: ${imageUrl}`);
            resolve();
          };

          // Timeout failsafe (10 seconds)
          setTimeout(() => {
            if (!loaded) {
              console.warn(`Image load timeout for layer ${primaryLayer.id}`);
              resolve();
            }
          }, 10000);
        });
      }

      setImages(newImages);
    };

    loadImages();
  }, [primaryLayer]);

  // Apply adjustments to images using canvas
  useEffect(() => {
    // Use shorter debounce for faster response
    const timeoutId = setTimeout(() => {
      const processImages = () => {
        const processed = new Map<number, HTMLCanvasElement>();

        images.forEach((img, layerId) => {
          // Get adjustments for this specific layer, or use defaults
          const adjustments = layerAdjustments[layerId] || {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            exposure: 0,
            highlights: 0,
            shadows: 0,
            sharpness: 1.0,
          };
          // Create canvas at potentially reduced size for faster processing
          const maxDimension = 2048; // Process at max 2048px for performance
          const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
          const processWidth = Math.floor(img.width * scale);
          const processHeight = Math.floor(img.height * scale);
          
          const canvas = document.createElement('canvas');
          canvas.width = processWidth;
          canvas.height = processHeight;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          
          if (ctx) {
            // Build CSS filter string from adjustments
            const filters: string[] = [];
            
            // Exposure: range is -3 to 3 (EV stops), scale to percentage
            // Each stop doubles or halves brightness (exponential scale)
            const exposureFactor = Math.pow(2, adjustments.exposure) * 100;
            
            // Brightness: linear adjustment, range -100 to 100
            const brightnessFactor = 100 + adjustments.brightness;
            
            // Combine both - exposure is applied first (exponential), then brightness (linear)
            const totalBrightness = (exposureFactor * brightnessFactor) / 100;
            filters.push(`brightness(${totalBrightness}%)`);
            
            // Contrast: default is 0, range typically -100 to 100, CSS expects 0% to 200%
            const contrast = 100 + adjustments.contrast;
            filters.push(`contrast(${contrast}%)`);
            
            // Saturation: default is 0, range typically -100 to 100, CSS expects 0% to 200%
            const saturation = 100 + adjustments.saturation;
            filters.push(`saturate(${saturation}%)`);
            
            // Apply basic filters first
            ctx.filter = filters.join(' ');
            ctx.drawImage(img, 0, 0, processWidth, processHeight);
            ctx.filter = 'none';
            
            // Only apply expensive pixel operations if values are significant
            const needsHighlightsShadows = Math.abs(adjustments.highlights) > 5 || Math.abs(adjustments.shadows) > 5;
            const needsSharpening = Math.abs(adjustments.sharpness - 1.0) > 0.1 && adjustments.sharpness !== 0;
            
            if (needsHighlightsShadows) {
              const imageData = ctx.getImageData(0, 0, processWidth, processHeight);
              const data = imageData.data;
              
              // Process in chunks for better performance
              const chunkSize = 4096;
              for (let start = 0; start < data.length; start += chunkSize) {
                const end = Math.min(start + chunkSize, data.length);
                for (let i = start; i < end; i += 4) {
                  const r = data[i];
                  const g = data[i + 1];
                  const b = data[i + 2];
                  
                  // Calculate luminance (faster approximation)
                  const luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                  
                  // Apply highlights (affects bright areas)
                  if (adjustments.highlights !== 0 && luminance > 0.5) {
                    const factor = 1 + (adjustments.highlights / 100) * (luminance - 0.5) * 2;
                    data[i] = Math.min(255, Math.max(0, r * factor));
                    data[i + 1] = Math.min(255, Math.max(0, g * factor));
                    data[i + 2] = Math.min(255, Math.max(0, b * factor));
                  }
                  
                  // Apply shadows (affects dark areas)
                  if (adjustments.shadows !== 0 && luminance < 0.5) {
                    const factor = 1 + (adjustments.shadows / 100) * (0.5 - luminance) * 2;
                    data[i] = Math.min(255, Math.max(0, r * factor));
                    data[i + 1] = Math.min(255, Math.max(0, g * factor));
                    data[i + 2] = Math.min(255, Math.max(0, b * factor));
                  }
                }
              }
              
              ctx.putImageData(imageData, 0, 0);
            }
            
            // Skip sharpening for now as it's too expensive - can be added as a final export step
            
            processed.set(layerId, canvas);
          }
        });

        setProcessedImages(processed);
      };

      if (images.size > 0) {
        processImages();
      }
    }, 16); // 16ms = ~60fps response time

    return () => clearTimeout(timeoutId);
  }, [images, layerAdjustments]);

  return (
    <div
      className="relative flex items-center justify-center w-full h-full"
      style={{ width: '100%', height: '100%' }}
    >
        <Stage
          width={stageWidth}
          height={stageHeight}
          ref={stageRef}
          scaleX={scale}
          scaleY={scale}
          x={stageOffsetX}
          y={stageOffsetY}
        >
        <Layer>
          {primaryLayer && primaryImage && (() => {
            const img = processedImages.get(primaryLayer.id) || primaryImage;
            if (!img) return null;

            // Use actual image dimensions from the loaded image, not stored layer dimensions
            const imgWidth = img.width;
            const imgHeight = img.height;
            
            // Calculate fit-to-stage scaling maintaining aspect ratio
            const imgAspect = imgWidth / imgHeight;
            const stageAspect = stageWidth / stageHeight;
            let displayWidth = stageWidth;
            let displayHeight = stageHeight;
            let offsetX = 0;
            let offsetY = 0;

            if (imgAspect > stageAspect) {
              // Image wider, fit to width
              displayHeight = stageWidth / imgAspect;
              offsetY = (stageHeight - displayHeight) / 2;
            } else {
              // Image taller, fit to height
              displayWidth = stageHeight * imgAspect;
              offsetX = (stageWidth - displayWidth) / 2;
            }

            const storedPosition = layerPositions.get(primaryLayer.id);
            const posX = storedPosition?.x ?? offsetX;
            const posY = storedPosition?.y ?? offsetY;

            return (
              <KonvaImage
                key={primaryLayer.id}
                image={img}
                x={posX}
                y={posY}
                width={displayWidth}
                height={displayHeight}
                opacity={primaryLayer.opacity ?? 1}
                draggable={!primaryLayer.locked}
                onDragEnd={(event) => {
                  const { x, y } = event.target.position();
                  setLayerPositions((prev) => {
                    const next = new Map(prev);
                    next.set(primaryLayer.id, { x, y });
                    return next;
                  });

                  const centerX = x + displayWidth / 2;
                  const centerY = y + displayHeight / 2;
                  const screenX = stageOffsetX + centerX * scale;
                  const screenY = stageOffsetY + centerY * scale;
                  setScreenAnchor({ x: screenX, y: screenY });
                }}
                onClick={() => {}}
              />
            );
          })()}
        </Layer>
        </Stage>

      {state.layers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-sm">Import an image to get started</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainCanvas;