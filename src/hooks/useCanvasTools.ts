import { useState, useEffect, useRef } from 'react';
import { SelectionManager } from '@/lib/tools/selection-manager';
import { BrushEngine } from '@/lib/tools/brush-engine';
import { TextManager } from '@/lib/tools/text-manager';
import { ShapeRenderer } from '@/lib/tools/shape-renderer';

export const useCanvasTools = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const [activeTool, setActiveTool] = useState<string>('selection');
  const [isDrawing, setIsDrawing] = useState(false);
  
  const selectionManagerRef = useRef(new SelectionManager());
  const brushEngineRef = useRef(new BrushEngine());
  const textManagerRef = useRef(new TextManager());
  const shapeRendererRef = useRef(new ShapeRenderer());

  useEffect(() => {
    if (canvasRef.current) {
      selectionManagerRef.current.init(canvasRef.current);
      brushEngineRef.current.init(canvasRef.current);
      textManagerRef.current.init(canvasRef.current);
      shapeRendererRef.current.init(canvasRef.current);
    }
  }, [canvasRef]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    switch (activeTool) {
      case 'selection':
        selectionManagerRef.current.startSelection(x, y);
        break;
      case 'brush':
        setIsDrawing(true);
        // Brush settings would come from state/context
        brushEngineRef.current.startDrawing(x, y, { size: 10, opacity: 100, color: '#000000' });
        break;
      case 'text':
        textManagerRef.current.addText(x, y, { 
          content: 'Sample Text', 
          fontSize: 24, 
          color: '#000000', 
          fontFamily: 'Arial' 
        });
        break;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    switch (activeTool) {
      case 'brush':
        if (isDrawing) {
          brushEngineRef.current.draw(x, y);
        }
        break;
    }
  };

  const handleMouseUp = () => {
    switch (activeTool) {
      case 'selection':
        selectionManagerRef.current.endSelection();
        break;
      case 'brush':
        setIsDrawing(false);
        brushEngineRef.current.stopDrawing();
        break;
    }
  };

  return {
    activeTool,
    setActiveTool,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  };
}