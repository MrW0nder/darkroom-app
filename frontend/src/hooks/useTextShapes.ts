import { useState } from 'react';

type ShapeType = 'rectangle' | 'ellipse' | 'line' | 'arrow';

interface TextState {
  text: string;
  font: string;
  fontSize: number;
  color: string;
  position: { x: number; y: number };
  bold: boolean;
  italic: boolean;
}

interface ShapeState {
  type: ShapeType;
  position: { x: number; y: number };
  size: { width: number; height: number };
  fillColor: string | null;
  strokeColor: string;
  strokeWidth: number;
  rotation: number;
}

const useTextShapes = (layerId: number) => {
  // Text state
  const [text, setText] = useState('');
  const [font, setFont] = useState('Arial');
  const [fontSize, setFontSize] = useState(24);
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);

  // Shape state
  const [shapeType, setShapeType] = useState<ShapeType>('rectangle');
  const [shapePosition, setShapePosition] = useState({ x: 100, y: 100 });
  const [shapeSize, setShapeSize] = useState({ width: 200, height: 150 });
  const [fillColor, setFillColor] = useState<string | null>('#FF0000');
  const [strokeColor, setStrokeColor] = useState('#FFFFFF');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [rotation, setRotation] = useState(0);

  // Loading and error state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addText = async (): Promise<boolean> => {
    if (!text.trim()) {
      setError('Please enter some text');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/text/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layer_id: layerId,
          text: text,
          font: font,
          font_size: fontSize,
          color: textColor,
          x: textPosition.x,
          y: textPosition.y,
          bold: bold,
          italic: italic,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add text');
      }

      const data = await response.json();
      console.log('Text added successfully:', data);
      
      // Reset text state
      setText('');
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add text';
      setError(message);
      console.error('Error adding text:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const addShape = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/shapes/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layer_id: layerId,
          shape_type: shapeType,
          x: shapePosition.x,
          y: shapePosition.y,
          width: shapeSize.width,
          height: shapeSize.height,
          fill_color: fillColor,
          stroke_color: strokeColor,
          stroke_width: strokeWidth,
          rotation: rotation,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add shape');
      }

      const data = await response.json();
      console.log('Shape added successfully:', data);
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add shape';
      setError(message);
      console.error('Error adding shape:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
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
  };
};

export default useTextShapes;
