import React, { useState, useRef, useEffect } from 'react';

interface NavigatorPanelProps {
  imageUrl: string;
  viewportBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  onViewportChange: (bounds: any) => void;
}

const NavigatorPanel: React.FC<NavigatorPanelProps> = ({
  imageUrl,
  viewportBounds,
  onViewportChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canvasRef.current && imageUrl) {
      drawNavigator();
    }
  }, [imageUrl, viewportBounds]);

  const drawNavigator = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw thumbnail
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;

      ctx.drawImage(img, x, y, w, h);

      // Draw viewport rectangle
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        x + viewportBounds.x * scale,
        y + viewportBounds.y * scale,
        viewportBounds.width * scale,
        viewportBounds.height * scale
      );

      // Semi-transparent overlay outside viewport
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, y);
      ctx.fillRect(0, y, x, h);
      ctx.fillRect(x + w, y, canvas.width - (x + w), h);
      ctx.fillRect(0, y + h, canvas.width, canvas.height - (y + h));
    };
    img.src = imageUrl;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    updateViewport(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      updateViewport(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateViewport = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert canvas coordinates to image coordinates
    const scale = canvas.width / rect.width;
    const imageX = x * scale;
    const imageY = y * scale;

    onViewportChange({
      x: imageX,
      y: imageY,
      width: viewportBounds.width,
      height: viewportBounds.height
    });
  };

  const handleZoomIn = () => {
    const newWidth = viewportBounds.width * 0.8;
    const newHeight = viewportBounds.height * 0.8;
    onViewportChange({
      ...viewportBounds,
      width: newWidth,
      height: newHeight
    });
  };

  const handleZoomOut = () => {
    const newWidth = viewportBounds.width * 1.2;
    const newHeight = viewportBounds.height * 1.2;
    onViewportChange({
      ...viewportBounds,
      width: newWidth,
      height: newHeight
    });
  };

  const handleFitToView = () => {
    onViewportChange({
      x: 0,
      y: 0,
      width: 100,
      height: 100
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4" ref={containerRef}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Navigator</h3>
        <div className="flex space-x-1">
          <button
            onClick={handleZoomIn}
            className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
            title="Zoom In"
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
            title="Zoom Out"
          >
            −
          </button>
          <button
            onClick={handleFitToView}
            className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-white text-xs"
            title="Fit to View"
          >
            ⊡
          </button>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={200}
        height={200}
        className="w-full border border-gray-700 rounded cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      <div className="mt-3 text-gray-400 text-xs space-y-1">
        <div>Zoom: {((100 / viewportBounds.width) * 100).toFixed(0)}%</div>
        <div className="text-gray-500">
          Click or drag to navigate
        </div>
      </div>
    </div>
  );
};

export default NavigatorPanel;