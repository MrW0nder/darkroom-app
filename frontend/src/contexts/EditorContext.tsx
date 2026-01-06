/**
 * EditorContext - Global state management for hybrid Lightroom + Photoshop editor
 * Manages projects, layers, adjustments, and editing state
 */
import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  historyStack: any[];
  historyIndex: number;
  isProcessing: boolean;
}

interface EditorContextType {
  state: EditorState;
  setCurrentProject: (project: Project | null) => void;
  setLayers: (layers: Layer[]) => void;
  setSelectedLayerId: (id: number | null) => void;
  updateAdjustments: (adjustments: Partial<Adjustments>) => void;
  resetAdjustments: () => void;
  addToHistory: (action: any) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  setProcessing: (processing: boolean) => void;
}

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
    historyIndex: -1,
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

  const updateAdjustments = (adjustments: Partial<Adjustments>) => {
    setState(prev => ({
      ...prev,
      adjustments: { ...prev.adjustments, ...adjustments },
    }));
  };

  const resetAdjustments = () => {
    setState(prev => ({ ...prev, adjustments: { ...defaultAdjustments } }));
  };

  const addToHistory = (action: any) => {
    setState(prev => {
      const newHistory = prev.historyStack.slice(0, prev.historyIndex + 1);
      newHistory.push(action);
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
      return prev;
    });
  };

  const redo = () => {
    setState(prev => {
      if (prev.historyIndex < prev.historyStack.length - 1) {
        return { ...prev, historyIndex: prev.historyIndex + 1 };
      }
      return prev;
    });
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
        setCurrentProject,
        setLayers,
        setSelectedLayerId,
        updateAdjustments,
        resetAdjustments,
        addToHistory,
        undo,
        redo,
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
