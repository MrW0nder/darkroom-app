/**
 * MainCanvas - Konva-based canvas for image editing
 * Hybrid Lightroom + Photoshop approach with layers and adjustments
 */
import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import { useEditor } from '../../contexts/EditorContext';

interface MainCanvasProps {
  width?: number;
  height?: number;
}

const MainCanvas: React.FC<MainCanvasProps> = ({ width = 800, height = 600 }) => {
  const { state } = useEditor();
  const [images, setImages] = useState<Map<number, HTMLImageElement>>(new Map());
  const stageRef = useRef<any>(null);

  // Load images for all visible layers
  useEffect(() => {
    const loadImages = async () => {
      const newImages = new Map<number, HTMLImageElement>();

      for (const layer of state.layers) {
        if (layer.visible && layer.content) {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          
          // Handle both file paths and data URLs
          img.src = layer.content.startsWith('data:') 
            ? layer.content 
            : `http://127.0.0.1:8000${layer.content}`;
          
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = () => {
              console.error(`Failed to load image for layer ${layer.id}`);
              resolve(null);
            };
          });

          if (img.complete) {
            newImages.set(layer.id, img);
          }
        }
      }

      setImages(newImages);
    };

    loadImages();
  }, [state.layers]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700">
      <Stage width={width} height={height} ref={stageRef}>
        <Layer>
          {state.layers
            .filter(layer => layer.visible)
            .sort((a, b) => a.z_index - b.z_index)
            .map(layer => {
              const img = images.get(layer.id);
              if (!img) return null;

              return (
                <KonvaImage
                  key={layer.id}
                  image={img}
                  x={layer.x}
                  y={layer.y}
                  width={layer.width || img.width}
                  height={layer.height || img.height}
                  opacity={layer.opacity}
                  draggable={!layer.locked}
                  onClick={() => {
                    // Handle layer selection
                    console.log(`Selected layer ${layer.id}`);
                  }}
                />
              );
            })}
        </Layer>
      </Stage>
      
      {state.layers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <p className="text-lg">No layers to display</p>
            <p className="text-sm mt-2">Import an image to get started</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainCanvas;
