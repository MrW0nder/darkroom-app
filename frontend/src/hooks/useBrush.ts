import { useState, useCallback } from 'react';

interface Stroke {
  points: number[];
  color: string;
  size: number;
  opacity: number;
  isEraser: boolean;
}

export const useBrush = (layerId: number) => {
  const [brushSize, setBrushSize] = useState(5);
  const [opacity, setOpacity] = useState(1);
  const [color, setColor] = useState('#000000');
  const [isEraser, setIsEraser] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [history, setHistory] = useState<Stroke[][]>([[]]);
  const [historyStep, setHistoryStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const startDrawing = useCallback((x: number, y: number) => {
    const newStroke: Stroke = {
      points: [x, y],
      color: isEraser ? '#FFFFFF' : color,
      size: brushSize,
      opacity: isEraser ? 1 : opacity,
      isEraser,
    };
    setCurrentStroke(newStroke);
  }, [brushSize, opacity, color, isEraser]);

  const continueDrawing = useCallback((x: number, y: number) => {
    if (!currentStroke) return;
    
    setCurrentStroke({
      ...currentStroke,
      points: [...currentStroke.points, x, y],
    });
  }, [currentStroke]);

  const stopDrawing = useCallback(() => {
    if (!currentStroke || currentStroke.points.length < 4) {
      setCurrentStroke(null);
      return;
    }

    const newStrokes = [...strokes, currentStroke];
    setStrokes(newStrokes);
    setCurrentStroke(null);

    // Update history
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(newStrokes);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  }, [currentStroke, strokes, history, historyStep]);

  const undo = useCallback(() => {
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      setStrokes(history[newStep]);
    }
  }, [historyStep, history]);

  const redo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1;
      setHistoryStep(newStep);
      setStrokes(history[newStep]);
    }
  }, [historyStep, history]);

  const canUndo = historyStep > 0;
  const canRedo = historyStep < history.length - 1;

  const clear = useCallback(() => {
    setStrokes([]);
    setCurrentStroke(null);
    setHistory([[]]);
    setHistoryStep(0);
  }, []);

  const applyPreset = useCallback((preset: 'hard' | 'soft' | 'airbrush') => {
    switch (preset) {
      case 'hard':
        setBrushSize(5);
        setOpacity(1);
        break;
      case 'soft':
        setBrushSize(20);
        setOpacity(0.6);
        break;
      case 'airbrush':
        setBrushSize(40);
        setOpacity(0.3);
        break;
    }
  }, []);

  const saveStrokes = useCallback(async () => {
    if (strokes.length === 0) {
      alert('No strokes to save');
      return false;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/api/brush/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          layer_id: layerId,
          strokes: strokes.map(stroke => ({
            points: stroke.points,
            color: stroke.color,
            size: stroke.size,
            opacity: stroke.opacity,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save strokes');
      }

      const result = await response.json();
      console.log('Brush strokes saved:', result);
      return true;
    } catch (error) {
      console.error('Error saving brush strokes:', error);
      alert(error instanceof Error ? error.message : 'Failed to save brush strokes');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [layerId, strokes]);

  return {
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
  };
};