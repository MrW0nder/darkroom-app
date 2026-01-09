import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { Paintbrush, Eraser, Undo2, Redo2, Trash2, Save } from 'lucide-react';
import { useBrush } from '../../hooks/useBrush';

interface BrushToolProps {
  layerId: number;
  imageUrl: string;
  width: number;
  height: number;
  onComplete: () => void;
  onCancel: () => void;
}

export const BrushTool: React.FC<BrushToolProps> = ({
  layerId,
  imageUrl,
  width,
  height,
  onComplete,
  onCancel,
}) => {
  const {
    brushSize,
    setBrushSize,
    opacity,
    setOpacity,
    color,
    setColor,
    isEraser,
    setIsEraser,
    strokes,
    currentStroke,
    startDrawing,
    continueDrawing,
    stopDrawing,
    undo,
    redo,
    canUndo,
    canRedo,
    clear,
    applyPreset,
    saveStrokes,
    isLoading,
  } = useBrush(layerId);

  const [isDrawing, setIsDrawing] = useState(false);
  const stageRef = useRef<any>(null);

  // Color presets
  const colorPresets = [
    '#000000', // Black
    '#FFFFFF', // White
    '#FF0000', // Red
    '#0000FF', // Blue
    '#00FF00', // Green
    '#FFFF00', // Yellow
    '#FF8800', // Orange
    '#8800FF', // Purple
  ];

  const handleMouseDown = (e: any) => {
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    startDrawing(pos.x, pos.y);
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing) return;
    const pos = e.target.getStage().getPointerPosition();
    continueDrawing(pos.x, pos.y);
  };

  const handleMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      stopDrawing();
    }
  };

  const handleSave = async () => {
    const success = await saveStrokes();
    if (success) {
      onComplete();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h3 className="text-white font-semibold">Brush Tool</h3>
          
          {/* Brush/Eraser Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setIsEraser(false)}
              className={`p-2 rounded ${!isEraser ? 'bg-blue-600' : 'bg-gray-700'} text-white hover:bg-blue-700 transition-colors`}
              title="Brush"
            >
              <Paintbrush className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsEraser(true)}
              className={`p-2 rounded ${isEraser ? 'bg-blue-600' : 'bg-gray-700'} text-white hover:bg-blue-700 transition-colors`}
              title="Eraser"
            >
              <Eraser className="w-5 h-5" />
            </button>
          </div>

          {/* Undo/Redo */}
          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-2 rounded bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-2 rounded bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-5 h-5" />
            </button>
          </div>

          {/* Clear */}
          <button
            onClick={clear}
            className="p-2 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
            title="Clear All"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || strokes.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Controls Panel */}
        <div className="w-64 bg-gray-800 p-4 space-y-6 overflow-y-auto border-r border-gray-700">
          {/* Brush Size */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Brush Size: {brushSize}px
            </label>
            <input
              type="range"
              min="1"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Opacity */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Opacity: {Math.round(opacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={opacity * 100}
              onChange={(e) => setOpacity(Number(e.target.value) / 100)}
              className="w-full"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Color
            </label>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-12 rounded cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-2 py-1 bg-gray-700 text-white rounded border border-gray-600"
                placeholder="#000000"
              />
            </div>
            
            {/* Color Presets */}
            <div className="grid grid-cols-4 gap-2">
              {colorPresets.map((presetColor) => (
                <button
                  key={presetColor}
                  onClick={() => setColor(presetColor)}
                  className={`w-full h-10 rounded border-2 ${
                    color === presetColor ? 'border-blue-500' : 'border-gray-600'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  title={presetColor}
                />
              ))}
            </div>
          </div>

          {/* Brush Presets */}
          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Brush Presets
            </label>
            <div className="space-y-2">
              <button
                onClick={() => applyPreset('hard')}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-left"
              >
                Hard Brush
              </button>
              <button
                onClick={() => applyPreset('soft')}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-left"
              >
                Soft Brush
              </button>
              <button
                onClick={() => applyPreset('airbrush')}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-left"
              >
                Airbrush
              </button>
            </div>
          </div>

          {/* Info */}
          <div className="text-gray-400 text-xs">
            <p>Strokes: {strokes.length}</p>
            <p>Mode: {isEraser ? 'Eraser' : 'Brush'}</p>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex items-center justify-center bg-gray-950 p-4">
          <div className="relative" style={{ cursor: 'crosshair' }}>
            <Stage
              ref={stageRef}
              width={width}
              height={height}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="border border-gray-700 bg-white"
            >
              <Layer>
                {/* Background Image */}
                {/* Render all completed strokes */}
                {strokes.map((stroke, i) => (
                  <Line
                    key={i}
                    points={stroke.points}
                    stroke={stroke.color}
                    strokeWidth={stroke.size}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={
                      stroke.isEraser ? 'destination-out' : 'source-over'
                    }
                    opacity={stroke.opacity}
                  />
                ))}
                
                {/* Current stroke being drawn */}
                {currentStroke && currentStroke.points.length > 0 && (
                  <Line
                    points={currentStroke.points}
                    stroke={currentStroke.color}
                    strokeWidth={currentStroke.size}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={
                      currentStroke.isEraser ? 'destination-out' : 'source-over'
                    }
                    opacity={currentStroke.opacity}
                  />
                )}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrushTool;