




import React from 'react';
import OpenSeadragonViewer from './OpenSeadragonViewer';

const MainCanvas = () => {
  const imageUrl = 'https://openseadragon.github.io/example-images/duomo/duomo.dzi';
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#222' }}>
      <OpenSeadragonViewer imageUrl={imageUrl} width={800} height={600} />
    </div>
  );
};

export default MainCanvas;
import React, { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import { useEditor } from '../../contexts/EditorContext.js';

// Utility: fit and center image in viewport
function getFitAndCenter(imgWidth, imgHeight, viewportWidth, viewportHeight) {
  const imgAspect = imgWidth / imgHeight;
  const viewportAspect = viewportWidth / viewportHeight;
  let zoom, displayWidth, displayHeight;
  if (imgAspect > viewportAspect) {
    zoom = viewportWidth / imgWidth;
    displayWidth = viewportWidth;
    displayHeight = viewportWidth / imgAspect;
  } else {
    zoom = viewportHeight / imgHeight;
    displayHeight = viewportHeight;
    displayWidth = viewportHeight * imgAspect;
  }
  const offsetX = (viewportWidth - displayWidth) / 2;
  const offsetY = (viewportHeight - displayHeight) / 2;
  return { zoom, offsetX, offsetY, displayWidth, displayHeight };
}

const SIDEBAR_WIDTH = 320;

const MainCanvas = ({ recenterToken = 0, layerAdjustments = {}, isSidebarCollapsed }) => {

  const { state } = useEditor();
  const [images, setImages] = useState(new Map());
  const [processedImages, setProcessedImages] = useState(new Map());
  const [layerOffsets, setLayerOffsets] = useState(new Map());
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [smoothOffset, setSmoothOffset] = useState(null);
  const [targetOffset, setTargetOffset] = useState(null);
  const animFrame = useRef(null);
  const containerRef = useRef(null);
  const stageRef = useRef(null);
  const dragState = useRef(null);
  const lastCenteredLayerId = useRef(null);
  // Always up-to-date offset for drag start
  const latestOffsetRef = useRef({ dx: 0, dy: 0 });

  // Get primary layer and image
  const selectedLayer = state.layers.find(l => l.id === state.selectedLayerId) || null;
  const primaryLayer = selectedLayer ? (selectedLayer.visible === false ? null : selectedLayer) : (state.layers.find(l => l.visible) || state.layers[0] || null);
  const primaryImage = primaryLayer ? images.get(primaryLayer.id) : null;

  // Viewport size (always full container)
  const viewportWidth = containerSize.width;
  const viewportHeight = containerSize.height;

  // --- Zoom state ---
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    if (primaryImage) {
      // Fit image to viewport on load
      const fit = getFitAndCenter(primaryImage.width, primaryImage.height, viewportWidth, viewportHeight);
      setZoom(fit.zoom);
      // Center offset
      setLayerOffsets(prev => {
        const next = new Map(prev);
        if (primaryLayer) next.set(primaryLayer.id, { dx: 0, dy: 0 });
        return next;
      });
    }
  }, [primaryImage, viewportWidth, viewportHeight]);

  // Drag offset (relative to visible area)
  const safeDxDy = obj => (!obj || typeof obj.dx !== 'number' || typeof obj.dy !== 'number') ? { dx: 0, dy: 0 } : obj;
  let dx = 0, dy = 0;
  if (smoothOffset) {
    const safe = safeDxDy(smoothOffset);
    dx = safe.dx;
    dy = safe.dy;
  } else if (primaryLayer && layerOffsets.has(primaryLayer.id)) {
    const offset = safeDxDy(layerOffsets.get(primaryLayer.id));
    dx = offset.dx;
    dy = offset.dy;
  }
  // Always keep latestOffsetRef up to date
  latestOffsetRef.current = { dx, dy };

  // Calculate zoomed image position and size
  let zoomedWidth = primaryImage ? primaryImage.width * zoom : 0;
  let zoomedHeight = primaryImage ? primaryImage.height * zoom : 0;
  let zoomedOffsetX = (viewportWidth - zoomedWidth) / 2 + dx;
  let zoomedOffsetY = (viewportHeight - zoomedHeight) / 2 + dy;

  // Fit/center logic
  let displayWidth = 0, displayHeight = 0, fitOffsetX = 0, fitOffsetY = 0;
  if (primaryLayer && primaryImage) {
    displayWidth = primaryImage.width * zoom;
    displayHeight = primaryImage.height * zoom;
    fitOffsetX = (viewportWidth - displayWidth) / 2;
    fitOffsetY = (viewportHeight - displayHeight) / 2;
  }
  const scale = zoom;
  const imageX = fitOffsetX + dx;
  const imageY = fitOffsetY + dy;

  // Responsive resize observer for container
  useEffect(() => {
    if (!containerRef.current) return;
    const element = containerRef.current;
    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width > 10 && rect.height > 10) {
        setContainerSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    // ...existing code...
    const observer = new window.ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, [containerRef]);

  // Disable drag animation: update offset directly during drag
  useEffect(() => {
    if (targetOffset && typeof targetOffset.dx === 'number' && typeof targetOffset.dy === 'number') {
      setSmoothOffset(targetOffset);
    } else {
      setSmoothOffset(null);
    }
  }, [targetOffset]);

  // Center and reset zoom when recenterToken changes
  useEffect(() => {
    if (recenterToken !== undefined && recenterToken !== null && primaryLayer) {
      // Reset all drag-related state and refs
      dragState.current = null;
      setTargetOffset({ dx: 0, dy: 0 });
      setSmoothOffset({ dx: 0, dy: 0 });
      if (latestOffsetRef) latestOffsetRef.current = { dx: 0, dy: 0 };
      setLayerOffsets(prev => {
        const next = new Map(prev);
        next.set(primaryLayer.id, { dx: 0, dy: 0 });
        return next;
      });
      // Force a re-render by updating a dummy state
      setContainerSize(size => ({ ...size }));
      lastCenteredLayerId.current = primaryLayer.id;
    }
  }, [recenterToken, primaryLayer]);

  // Center when switching to a new image (layer)
  useEffect(() => {
    if (primaryLayer && lastCenteredLayerId.current !== primaryLayer.id) {
      setLayerOffsets(prev => {
        const next = new Map(prev);
        next.set(primaryLayer.id, { dx: 0, dy: 0 });
        return next;
      });
      lastCenteredLayerId.current = primaryLayer.id;
    }
  }, [primaryLayer]);

  // Utility: resolve image URL for local/backend/data URLs
  function resolveImageUrl(content) {
    if (!content) return '';
    if (content.startsWith('data:')) return content;
    if (content.startsWith('http://') || content.startsWith('https://')) return content;
    if (content.startsWith('/storage/')) {
      const API_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL) || 'http://127.0.0.1:8000';
      return `${API_URL}${content}`;
    }
    if (content.startsWith('/uploads/')) {
      const API_URL = (import.meta && import.meta.env && import.meta.env.VITE_API_URL) || 'http://127.0.0.1:8000';
      return `${API_URL}${content}`;
    }
    return content;
  }

  // Load image for the primary layer whenever the layer or its content changes
  useEffect(() => {
    const loadImages = async () => {
      const newImages = new Map();
      if (primaryLayer && primaryLayer.content) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.src = resolveImageUrl(primaryLayer.content);
        await new Promise(resolve => {
          let loaded = false;
          img.onload = () => { loaded = true; newImages.set(primaryLayer.id, img); resolve(undefined); };
          img.onerror = () => { resolve(undefined); };
          setTimeout(() => { if (!loaded) resolve(undefined); }, 10000);
        });
      }
      setImages(newImages);
    };
    loadImages();
  }, [primaryLayer, primaryLayer && primaryLayer.content]);

  // --- Handlers ---
  // Scroll zoom handler
  const handleWheel = e => {
    e.evt.preventDefault();
    if (!primaryImage) return;
    const stage = stageRef.current;
    const pointer = stage ? stage.getPointerPosition() : { x: viewportWidth / 2, y: viewportHeight / 2 };
    const oldZoom = zoom;
    const zoomFactor = e.evt.deltaY < 0 ? 1.05 : 1 / 1.05;
    const newZoom = Math.max(0.05, Math.min(oldZoom * zoomFactor, 10));
    // OpenSeadragon logic: keep mouse pixel fixed
    // Calculate image position before zoom
    const displayWidthOld = primaryImage.width * oldZoom;
    const displayHeightOld = primaryImage.height * oldZoom;
    const fitOffsetXOld = (viewportWidth - displayWidthOld) / 2;
    const fitOffsetYOld = (viewportHeight - displayHeightOld) / 2;
    const imageXOld = fitOffsetXOld + dx;
    const imageYOld = fitOffsetYOld + dy;
    // Mouse position relative to image
    const relX = (pointer.x - imageXOld) / oldZoom;
    const relY = (pointer.y - imageYOld) / oldZoom;
    // Calculate new fit offset for new zoom
    const displayWidthNew = primaryImage.width * newZoom;
    const displayHeightNew = primaryImage.height * newZoom;
    const fitOffsetXNew = (viewportWidth - displayWidthNew) / 2;
    const fitOffsetYNew = (viewportHeight - displayHeightNew) / 2;
    // Calculate new dx/dy so mouse stays at same pixel
    const newDx = (imageXOld - fitOffsetXNew) + relX * (newZoom - oldZoom);
    const newDy = (imageYOld - fitOffsetYNew) + relY * (newZoom - oldZoom);
    setZoom(newZoom);
    setLayerOffsets(prev => {
      const next = new Map(prev);
      if (primaryLayer) {
        next.set(primaryLayer.id, { dx: newDx, dy: newDy });
      }
      return next;
    });
  };

  // --- Render ---
  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minWidth: 200, minHeight: 150, overflow: 'visible', position: 'relative', background: '#222' }}>
      {/* Debug overlay for container/canvas size and image state */}
      <div style={{position: 'absolute', top: 8, left: 8, zIndex: 100, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: 6, borderRadius: 4, fontSize: 12}}>
        <div>Container: {containerSize.width} x {containerSize.height}</div>
        <div>Viewport: {viewportWidth} x {viewportHeight}</div>
        <div>Image: {primaryImage ? `${primaryImage.width} x ${primaryImage.height}` : 'none'}</div>
        <div>Layer: {primaryLayer ? primaryLayer.id : 'none'}</div>
        <div>Layer content: {primaryLayer && primaryLayer.content ? primaryLayer.content : '(empty)'}</div>
      </div>
      {(!primaryImage || viewportWidth < 10 || viewportHeight < 10) ? (
        <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', color: '#fff', background: 'rgba(0,0,0,0.7)', padding: 16, borderRadius: 8, zIndex: 50}}>
          {(!primaryImage) ? 'No image loaded for selected layer.' : 'Canvas size is zero.'}
        </div>
      ) : (
        <Stage
          width={viewportWidth}
          height={viewportHeight}
          ref={stageRef}
          scaleX={1}
          scaleY={1}
          x={0}
          y={0}
          style={{ overflow: 'visible', pointerEvents: 'auto' }}
          onWheel={handleWheel}
          onDblClick={() => {
            if (!primaryLayer || !primaryImage) return;
            setLayerOffsets(prev => {
              const next = new Map(prev);
              next.set(primaryLayer.id, { dx: 0, dy: 0 });
              return next;
            });
          }}
        >
          <Layer>
            <KonvaImage
              key={primaryLayer.id}
              image={primaryImage}
              x={imageX}
              y={imageY}
              width={displayWidth}
              height={displayHeight}
              opacity={primaryLayer?.opacity ?? 1}
              draggable={true}
              dragBoundFunc={undefined}
              onDragStart={event => {
                const pointer = event.target.getStage().getPointerPosition();
                if (!pointer) return;
                const mouseX = pointer.x;
                const mouseY = pointer.y;
                // Use always-up-to-date offset
                const { dx: currentDx, dy: currentDy } = latestOffsetRef.current;
                dragState.current = {
                  startMouse: { x: mouseX, y: mouseY },
                  startOffset: { dx: currentDx, dy: currentDy }
                };
                // Force sync all offset sources
                setTargetOffset({ dx: currentDx, dy: currentDy });
                setSmoothOffset({ dx: currentDx, dy: currentDy });
                setLayerOffsets(prev => {
                  const next = new Map(prev);
                  if (primaryLayer) next.set(primaryLayer.id, { dx: currentDx, dy: currentDy });
                  return next;
                });
                latestOffsetRef.current = { dx: currentDx, dy: currentDy };
              }}
              onDragMove={event => {
                const pointer = event.target.getStage().getPointerPosition();
                if (!pointer || !dragState.current) return;
                const mouseX = pointer.x;
                const mouseY = pointer.y;
                const deltaX = mouseX - dragState.current.startMouse.x;
                const deltaY = mouseY - dragState.current.startMouse.y;
                let newDx = dragState.current.startOffset.dx + deltaX;
                let newDy = dragState.current.startOffset.dy + deltaY;
                // Clamp: at least 40px visible
                const minDx = -displayWidth + 40;
                const maxDx = viewportWidth - displayWidth;
                newDx = Math.max(minDx, Math.min(newDx, maxDx));
                const minDy = -displayHeight + 40;
                const maxDy = viewportHeight - displayHeight;
                newDy = Math.max(minDy, Math.min(newDy, maxDy));
                setTargetOffset({ dx: newDx, dy: newDy });
                setSmoothOffset({ dx: newDx, dy: newDy });
                // Update latestOffsetRef immediately
                latestOffsetRef.current = { dx: newDx, dy: newDy };
              }}
              onDragEnd={event => {
                dragState.current = null;
                setSmoothOffset(null);
                setTargetOffset(null);
                if (targetOffset && typeof targetOffset.dx === 'number' && typeof targetOffset.dy === 'number') {
                  // Force sync all offset sources on drag end
                  setLayerOffsets(prev => {
                    const next = new Map(prev);
                    next.set(primaryLayer.id, { dx: targetOffset.dx, dy: targetOffset.dy });
                    return next;
                  });
                  latestOffsetRef.current = { dx: targetOffset.dx, dy: targetOffset.dy };
                  setTargetOffset({ dx: targetOffset.dx, dy: targetOffset.dy });
                  setSmoothOffset({ dx: targetOffset.dx, dy: targetOffset.dy });
                }
              }}
            />
          </Layer>
        </Stage>
      )}
    </div>
  );
};

export default MainCanvas;
