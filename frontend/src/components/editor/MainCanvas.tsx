/**
 * MainCanvas - Konva-based canvas for image editing
 * Hybrid Lightroom + Photoshop approach with layers and adjustments
 */
import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import { useEditor } from '../../contexts/EditorContext.js';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:8000';

function resolveContentUrl(content: string | null) {
  if (!content) return '';
  if (content.startsWith('data:')) return content;
  if (content.startsWith('http://') || content.startsWith('https://')) return content;
  if (content.startsWith('/storage/')) return `${API_URL}${content}`;
  const filename = content.split(/[/\\]/).pop();
  if (!filename) return '';
  return `${API_URL}/storage/originals/${filename}`;
}

interface Layer {
  id: number;
  content: string | null;
  visible: boolean;
  z_index: number;
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  opacity?: number;
  locked: boolean;
}

interface MainCanvasProps {
  width?: number;
  height?: number;
  zoom?: number;
  recenterToken?: number;
  layerAdjustments?: Record<number, any>;
  isSidebarCollapsed?: boolean;
}

// --- MainCanvas: always keep crosshairs at true canvas center ---
const MainCanvas: React.FC<MainCanvasProps> = ({ zoom = 100, recenterToken = 0, layerAdjustments = {}, isSidebarCollapsed }) => {
  const { state } = useEditor();
  const [images, setImages] = useState<Map<number, HTMLImageElement>>(new Map());
  const [processedImages, setProcessedImages] = useState<Map<number, HTMLCanvasElement>>(new Map());
  // Offset from true canvas center (crosshairs) for each layer
  const [layerOffsets, setLayerOffsets] = useState<Map<number, { dx: number; dy: number }>>(new Map());
  const [canvasZoom, setCanvasZoom] = useState(zoom);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);

  // Layout constants
  const TOOLBAR_WIDTH = 64;
  const SIDEBAR_WIDTH = 320;
  const sidebarActualWidth = (typeof isSidebarCollapsed === 'boolean' && isSidebarCollapsed) ? 0 : SIDEBAR_WIDTH;
  // The visible area (viewport) is always centered in the canvas
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const stageWidth = containerSize.width * 3;
  const stageHeight = containerSize.height * 3;
  const visibleWidth = containerSize.width - sidebarActualWidth;
  const visibleHeight = containerSize.height;
  const visibleLeft = (stageWidth - visibleWidth) / 2;
  const visibleTop = (stageHeight - visibleHeight) / 2;
  // The true canvas center (crosshairs) is always at (stageWidth/2, stageHeight/2)
  const canvasCenterX = stageWidth / 2;
  const canvasCenterY = stageHeight / 2;
  const scale = Math.max(0.25, Math.min(4, canvasZoom / 100));

  // --- Layer/image selection ---
  const selectedLayer = state.layers.find((layer) => layer.id === state.selectedLayerId) || null;
  const primaryLayer = selectedLayer
    ? (selectedLayer.visible === false ? null : selectedLayer)
    : (state.layers.find((layer) => layer.visible) || state.layers[0] || null);
  const primaryImage = primaryLayer ? images.get(primaryLayer.id) : null;

  // --- Image fitting: always center under crosshairs ---
  let displayWidth = stageWidth, displayHeight = stageHeight, imgWidth = 0, imgHeight = 0;
  if (primaryLayer && primaryImage) {
    imgWidth = primaryImage.width;
    imgHeight = primaryImage.height;
    const imgAspect = imgWidth / imgHeight;
    const areaAspect = visibleWidth / visibleHeight;
    let fitWidth = visibleWidth, fitHeight = visibleHeight;
    if (imgAspect > areaAspect) {
      displayWidth = fitWidth;
      displayHeight = displayWidth / imgAspect;
    } else {
      displayHeight = fitHeight;
      displayWidth = displayHeight * imgAspect;
    }
  }

  // --- Drag offset from canvas center ---
  let dx = 0, dy = 0;
  if (primaryLayer && layerOffsets.has(primaryLayer.id)) {
    const offset = layerOffsets.get(primaryLayer.id)!;
    dx = offset.dx;
    dy = offset.dy;
  }
  // Image top-left: always relative to true canvas center
  const imageX = canvasCenterX + dx - displayWidth / 2;
  const imageY = canvasCenterY + dy - displayHeight / 2;

  // --- Responsive resize observer ---
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({ width: rect.width, height: rect.height });
    }
  }, [isSidebarCollapsed, primaryLayer]);

  // --- Reset offsets on recenter ---
  useEffect(() => {
    setLayerOffsets(new Map());
    setCanvasZoom(zoom);
  }, [recenterToken, zoom]);

  // --- Load image for primary layer ---
  useEffect(() => {
    const loadImages = async () => {
      const newImages = new Map<number, HTMLImageElement>();
      if (primaryLayer && primaryLayer.content !== null) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = resolveContentUrl(primaryLayer.content);
        await new Promise<void>((resolve) => {
          img.onload = () => { newImages.set(primaryLayer.id, img); resolve(); };
          img.onerror = () => resolve();
          setTimeout(resolve, 10000);
        });
      }
      setImages(newImages);
    };
    loadImages();
  }, [primaryLayer]);

  // --- Process images (adjustments) ---
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const processed = new Map<number, HTMLCanvasElement>();
      images.forEach((img, layerId) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0);
        processed.set(layerId, canvas);
      });
      setProcessedImages(processed);
    }, 16);
    return () => clearTimeout(timeoutId);
  }, [images]);

  // --- Zoom handler: always zoom around canvas center ---
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    if (!primaryLayer) return;
    // Always zoom around true canvas center (crosshairs)
    let newZoom = canvasZoom * (e.evt.deltaY > 0 ? 0.9 : 1.1);
    newZoom = Math.max(25, Math.min(400, newZoom));
    setCanvasZoom(newZoom);
    // No offset change: image stays centered under crosshairs
  };

  // --- Drag handler: move image relative to canvas center ---
  const handleDragMove = (event: any) => {
    if (!primaryLayer) return;
    const scale = event.target.getStage().scaleX();
    let dragX = event.target.x() / scale;
    let dragY = event.target.y() / scale;
    if (!isFinite(dragX)) dragX = 0;
    if (!isFinite(dragY)) dragY = 0;
    let newCenterX = dragX + displayWidth / 2;
    let newCenterY = dragY + displayHeight / 2;
    let dx = newCenterX - canvasCenterX;
    let dy = newCenterY - canvasCenterY;
    setLayerOffsets((prev) => {
      const next = new Map(prev);
      next.set(primaryLayer.id, { dx, dy });
      return next;
    });
  };

}

