import React, { useState } from 'react';
import { Type, Square, Circle, Minus, ArrowRight } from 'lucide-react';
import { Stage, Layer, Rect, Circle as KonvaCircle, Line, Text as KonvaText } from 'react-konva';
import useTextShapes from '../../hooks/useTextShapes';

interface TextShapesToolProps {
  layerId: number;
  imageUrl: string;
  originalWidth: number;
  originalHeight: number;
  onComplete: () => void;
  onCancel: () => void;
}

type ToolMode = 'text' | 'shapes';
type ShapeType = 'rectangle' | 'ellipse' | 'line' | 'arrow';

const TextShapesTool: React.FC<TextShapesToolProps> = ({
  layerId,
  imageUrl,
  originalWidth,
  originalHeight,
  onComplete,
  onCancel,
}) => {
  const [mode, setMode] = useState<ToolMode>('text');
  
  const {
    // Text state
    text,
    setText,
    font,
    setFont,
    fontSize,
    setFontSize,
    textColor,
    setTextColor,
    textPosition,
    setTextPosition,
    bold,
    setBold,
    italic,
    setItalic,
    
    // Shape state
    shapeType,
    setShapeType,
    shapePosition,
    setShapePosition,
    shapeSize,
    setShapeSize,
    fillColor,
    setFillColor,
    strokeColor,
    setStrokeColor,
    strokeWidth,
    setStrokeWidth,
    rotation,
    setRotation,
    
    // Actions
    addText,
    addShape,
    isLoading,
    error,
  } = useTextShapes(layerId);

  const fonts = [
    'Arial',
    'Times New Roman',
    'Courier New',
    'Comic Sans MS',
    'Impact',
  ];

  const shapes: { type: ShapeType; icon: React.ReactNode; label: string }[] = [
    { type: 'rectangle', icon: <Square className="w-5 h-5" />, label: 'Rectangle' },
    { type: 'ellipse', icon: <Circle className="w-5 h-5" />, label: 'Ellipse' },
    { type: 'line', icon: <Minus className="w-5 h-5" />, label: 'Line' },
    { type: 'arrow', icon: <ArrowRight className="w-5 h-5" />, label: 'Arrow' },
  ];

  const colorPresets = [
    '#FFFFFF', // White
    '#000000', // Black
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
  ];

  const handleAddText = async () => {
    const success = await addText();
    if (success) {
      onComplete();
    }
  };

  const handleAddShape = async () => {
    const success = await addShape();
    if (success) {
      onComplete();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Mode Switcher */}
      <div className="flex gap-2 p-4 border-b border-gray-700">
        <button
          onClick={() => setMode('text')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            mode === 'text'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Type className="w-5 h-5" />
          Text
        </button>
        <button
          onClick={() => setMode('shapes')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            mode === 'shapes'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Square className="w-5 h-5" />
          Shapes
        </button>
      </div>

      {/* Canvas Preview */}
      <div className="flex-1 flex items-center justify-center bg-gray-800 p-4">
        <div className="relative bg-gray-700 rounded-lg overflow-hidden">
          <Stage width={Math.min(originalWidth, 800)} height={Math.min(originalHeight, 600)}>
            <Layer>
              {/* Background image would go here */}
              
              {/* Text preview */}
              {mode === 'text' && text && (
                <KonvaText
                  x={textPosition.x}
                  y={textPosition.y}
                  text={text}
                  fontSize={fontSize}
                  fontFamily={font}
                  fill={textColor}
                  fontStyle={`${bold ? 'bold' : ''} ${italic ? 'italic' : ''}`.trim()}
                />
              )}
              
              {/* Shape preview */}
              {mode === 'shapes' && (
                <>
                  {shapeType === 'rectangle' && (
                    <Rect
                      x={shapePosition.x}
                      y={shapePosition.y}
                      width={shapeSize.width}
                      height={shapeSize.height}
                      fill={fillColor || 'transparent'}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      rotation={rotation}
                    />
                  )}
                  {shapeType === 'ellipse' && (
                    <KonvaCircle
                      x={shapePosition.x + shapeSize.width / 2}
                      y={shapePosition.y + shapeSize.height / 2}
                      radiusX={shapeSize.width / 2}
                      radiusY={shapeSize.height / 2}
                      fill={fillColor || 'transparent'}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      rotation={rotation}
                    />
                  )}
                  {(shapeType === 'line' || shapeType === 'arrow') && (
                    <Line
                      points={[
                        shapePosition.x,
                        shapePosition.y,
                        shapePosition.x + shapeSize.width,
                        shapePosition.y + shapeSize.height,
                      ]}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      lineCap="round"
                      lineJoin="round"
                    />
                  )}
                </>
              )}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-gray-700 bg-gray-900 max-h-96 overflow-y-auto">
        {mode === 'text' ? (
          <div className="space-y-4">
            <h3 className="text-white font-semibold mb-4">Text Settings</h3>
            
            {/* Text Input */}
            <div>
              <label className="block text-gray-300 text-sm mb-2">Text</label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text..."
                className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Font Selection */}
            <div>
              <label className="block text-gray-300 text-sm mb-2">Font</label>
              <select
                value={font}
                onChange={(e) => setFont(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:outline-none"
              >
                {fonts.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-gray-300 text-sm mb-2">
                Font Size: {fontSize}px
              </label>
              <input
                type="range"
                min="8"
                max="120"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Color */}
            <div>
              <label className="block text-gray-300 text-sm mb-2">Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-12 h-12 rounded cursor-pointer"
                />
                <div className="flex gap-1 flex-wrap">
                  {colorPresets.map((color) => (
                    <button
                      key={color}
                      onClick={() => setTextColor(color)}
                      className="w-8 h-8 rounded border-2 border-gray-600 hover:border-blue-500 transition-colors"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Style Toggles */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bold}
                  onChange={(e) => setBold(e.target.checked)}
                  className="w-4 h-4"
                />
                Bold
              </label>
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={italic}
                  onChange={(e) => setItalic(e.target.checked)}
                  className="w-4 h-4"
                />
                Italic
              </label>
            </div>

            {/* Position */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">X Position</label>
                <input
                  type="number"
                  value={textPosition.x}
                  onChange={(e) => setTextPosition({ ...textPosition, x: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Y Position</label>
                <input
                  type="number"
                  value={textPosition.y}
                  onChange={(e) => setTextPosition({ ...textPosition, y: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-white font-semibold mb-4">Shape Settings</h3>
            
            {/* Shape Type */}
            <div>
              <label className="block text-gray-300 text-sm mb-2">Shape Type</label>
              <div className="grid grid-cols-4 gap-2">
                {shapes.map((shape) => (
                  <button
                    key={shape.type}
                    onClick={() => setShapeType(shape.type)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-colors ${
                      shapeType === shape.type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {shape.icon}
                    <span className="text-xs">{shape.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fill Color */}
            <div>
              <label className="block text-gray-300 text-sm mb-2">Fill Color</label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={fillColor || '#FFFFFF'}
                  onChange={(e) => setFillColor(e.target.value)}
                  className="w-12 h-12 rounded cursor-pointer"
                />
                <button
                  onClick={() => setFillColor(null)}
                  className="px-3 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 text-sm"
                >
                  No Fill
                </button>
              </div>
            </div>

            {/* Stroke Color */}
            <div>
              <label className="block text-gray-300 text-sm mb-2">Stroke Color</label>
              <input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="w-12 h-12 rounded cursor-pointer"
              />
            </div>

            {/* Stroke Width */}
            <div>
              <label className="block text-gray-300 text-sm mb-2">
                Stroke Width: {strokeWidth}px
              </label>
              <input
                type="range"
                min="1"
                max="20"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Position and Size */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 text-sm mb-2">X</label>
                <input
                  type="number"
                  value={shapePosition.x}
                  onChange={(e) => setShapePosition({ ...shapePosition, x: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Y</label>
                <input
                  type="number"
                  value={shapePosition.y}
                  onChange={(e) => setShapePosition({ ...shapePosition, y: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Width</label>
                <input
                  type="number"
                  value={shapeSize.width}
                  onChange={(e) => setShapeSize({ ...shapeSize, width: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
                />
              </div>
              <div>
                <label className="block text-gray-300 text-sm mb-2">Height</label>
                <input
                  type="number"
                  value={shapeSize.height}
                  onChange={(e) => setShapeSize({ ...shapeSize, height: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700"
                />
              </div>
            </div>

            {/* Rotation */}
            <div>
              <label className="block text-gray-300 text-sm mb-2">
                Rotation: {rotation.toFixed(1)}°
              </label>
              <input
                type="range"
                min="0"
                max="360"
                step="0.1"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={mode === 'text' ? handleAddText : handleAddShape}
            disabled={isLoading || (mode === 'text' && !text)}
            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? 'Processing...' : mode === 'text' ? 'Add Text' : 'Add Shape'}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextShapesTool;