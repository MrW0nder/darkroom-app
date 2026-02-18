/**
 * EditorContext - Global state management for hybrid Lightroom + Photoshop editor
 * Manages projects, layers, adjustments, and editing state
 */
import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react'; // Added type-only import for ReactNode

interface Layer {
  id: number;
  project_id: number;
  type: string;
  content: string | null;
  z_index: number;
  locked: boolean;
  opacity: number;
  visible: boolean;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  blend_mode: string | null;
}

interface Project {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  layer_count: number;
}

interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  exposure: number;
  highlights: number;
  shadows: number;
  sharpness: number;
}

interface EditorState {
  currentProject: Project | null;
  layers: Layer[];
  selectedLayerId: number | null;
  adjustments: Adjustments;
  historyStack: Array<any>;
  historyIndex: number; // Tracks the current position in the history stack
  isProcessing: boolean;
}

interface EditorContextType {
  state: EditorState;
  history: Array<any>; // Added history for direct use in HistoryPanel
  currentHistoryIndex: number; // Added currentHistoryIndex for direct use in HistoryPanel
  setCurrentProject: (project: Project | null) => void;
  setLayers: (layers: Layer[]) => void;
  setSelectedLayerId: (id: number | null) => void;
  updateAdjustments: (adjustments: Partial<Adjustments>, options?: { recordHistory?: boolean }) => void;
  resetAdjustments: () => void;
  addToHistory: (action: any) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  setProcessing: (processing: boolean) => void;
}

const createHistoryEntry = (action: any) => {
  const timestamp = new Date();
  const id = `${timestamp.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  const description = action?.description
    || (action?.type === 'adjustment' ? 'Adjustment changed' : 'Action performed');

  return {
    id,
    timestamp,
    description,
    ...action,
  };
};

const EditorContext = createContext<EditorContextType | undefined>(undefined);

const defaultAdjustments: Adjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  sharpness: 1.0,
};

export const EditorProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<EditorState>({
    currentProject: null,
    layers: [],
    selectedLayerId: null,
    adjustments: { ...defaultAdjustments },
    historyStack: [],
    historyIndex: -1, // Starts at -1 to indicate no actions in history yet
    isProcessing: false,
  });

  const setCurrentProject = (project: Project | null) => {
    setState(prev => ({ ...prev, currentProject: project }));
  };

  const setLayers = (layers: Layer[]) => {
    setState(prev => ({ ...prev, layers }));
  };

  const setSelectedLayerId = (id: number | null) => {
    setState(prev => ({ ...prev, selectedLayerId: id }));
  };

  const updateAdjustments = (adjustments: Partial<Adjustments>, options?: { recordHistory?: boolean }) => {
    setState(prev => ({
      ...prev,
      adjustments: { ...prev.adjustments, ...adjustments },
    }));
    if (options?.recordHistory !== false) {
      addToHistory({
        type: 'adjustment',
        changes: adjustments,
        description: `Adjusted ${Object.keys(adjustments).join(', ')}`,
      });
    }
  };

  const resetAdjustments = () => {
    setState(prev => ({ ...prev, adjustments: { ...defaultAdjustments } }));
    addToHistory({ type: 'adjustment', description: 'Reset adjustments' });
  };

  const addToHistory = (action: any) => {
    setState(prev => {
      const newHistory = prev.historyStack.slice(0, prev.historyIndex + 1); // Clear redo stack
      newHistory.push(createHistoryEntry(action));
      return {
        ...prev,
        historyStack: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  };

  const undo = () => {
    setState(prev => {
      if (prev.historyIndex > 0) {
        return { ...prev, historyIndex: prev.historyIndex - 1 };
      }
      return prev; // No action if undo is unavailable
    });
  };

  const redo = () => {
    setState(prev => {
      if (prev.historyIndex < prev.historyStack.length - 1) {
        return { ...prev, historyIndex: prev.historyIndex + 1 };
      }
      return prev; // No action if redo is unavailable
    });
  };

  const clearHistory = () => {
    setState(prev => ({
      ...prev,
      historyStack: [],
      historyIndex: -1, // Reset history index
    }));
  };

  const canUndo = () => state.historyIndex > 0;
  const canRedo = () => state.historyIndex < state.historyStack.length - 1;

  const setProcessing = (processing: boolean) => {
    setState(prev => ({ ...prev, isProcessing: processing }));
  };

  return (
    <EditorContext.Provider
      value={{
        state,
        history: state.historyStack, // Expose history for direct use
        currentHistoryIndex: state.historyIndex, // Expose current history index for direct use
        setCurrentProject,
        setLayers,
        setSelectedLayerId,
        updateAdjustments,
        resetAdjustments,
        addToHistory,
        undo,
        redo,
        clearHistory,
        canUndo,
        canRedo,
        setProcessing,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
};