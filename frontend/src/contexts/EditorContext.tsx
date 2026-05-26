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
  name: string;
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
  vibrance: number;
  exposure: number;
  highlights: number;
  shadows: number;
  sharpness: number;
  temperature: number;  // -50 cool → +50 warm
  tint: number;         // -50 green → +50 magenta
  // Color grading wheels (per tonal range)
  shadowHue: number;        // 0–360
  shadowSat: number;        // 0–100
  shadowLum: number;        // -50–50
  midtoneHue: number;
  midtoneSat: number;
  midtoneLum: number;
  highlightHue: number;
  highlightSat: number;
  highlightLum: number;
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
  updateAdjustments: (adjustments: Partial<Adjustments>, options?: { recordHistory?: boolean; before?: Partial<Adjustments>; isReset?: boolean }) => void;
  resetAdjustments: () => void;
  addToHistory: (action: any) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  setProcessing: (processing: boolean) => void;
  /** Restore a previously-saved history stack (e.g. from localStorage). */
  restoreSession: (historyStack: Array<any>, historyIndex: number) => void;
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
  vibrance: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  sharpness: 1.0,
  temperature: 0,
  tint: 0,
  shadowHue: 0, shadowSat: 0, shadowLum: 0,
  midtoneHue: 0, midtoneSat: 0, midtoneLum: 0,
  highlightHue: 0, highlightSat: 0, highlightLum: 0,
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

  const updateAdjustments = (adjustments: Partial<Adjustments>, options?: { recordHistory?: boolean; before?: Partial<Adjustments>; isReset?: boolean }) => {
    const shouldRecord = options?.recordHistory !== false;
    setState(prev => {
      const merged = { ...prev.adjustments, ...adjustments };
      if (!shouldRecord) {
        return { ...prev, adjustments: merged };
      }

      const labelMap: Record<string, string> = {
        brightness: 'Brightness', contrast: 'Contrast', saturation: 'Saturation',
        exposure: 'Exposure', highlights: 'Highlights', shadows: 'Shadows',
        sharpness: 'Sharpness', temperature: 'Temperature', tint: 'Tint',
      };
      const fmt = (key: string, v: number) =>
        key === 'sharpness' ? v.toFixed(1) : (v >= 0 ? `+${Math.round(v)}` : `${Math.round(v)}`);
      const changedKeys = Object.keys(adjustments) as (keyof Adjustments)[];

      let description: string;
      if (options?.isReset && changedKeys.length > 1) {
        description = 'Full Reset';
      } else if (options?.isReset && changedKeys.length === 1) {
        const key = changedKeys[0] as string;
        const beforeVal = options?.before ? ((options.before as any)[key] ?? 0) : ((prev.adjustments as any)[key] ?? 0);
        const afterVal = (merged as any)[key] ?? 0;
        description = `Reset ${labelMap[key] ?? key}\n(${fmt(key, beforeVal)} → ${fmt(key, afterVal)})`;
      } else if (changedKeys.length === 1) {
        const key = changedKeys[0] as string;
        const beforeVal = options?.before ? ((options.before as any)[key] ?? 0) : ((prev.adjustments as any)[key] ?? 0);
        const afterVal = (merged as any)[key] ?? 0;
        const label = labelMap[key] ?? key;
        description = `${label} ${fmt(key, afterVal)}\n(${fmt(key, beforeVal)} → ${fmt(key, afterVal)})`;
      } else {
        description = `Adjusted ${changedKeys.map(k => labelMap[k] ?? k).join(', ')}`;
      }

      const newHistory = prev.historyStack.slice(0, prev.historyIndex + 1);
      newHistory.push(createHistoryEntry({
        type: 'adjustment',
        adjustmentsBefore: { ...prev.adjustments },
        adjustmentsAfter: merged,
        changes: adjustments,
        description,
      }));
      return {
        ...prev,
        adjustments: merged,
        historyStack: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  };

  const resetAdjustments = () => {
    setState(prev => {
      const newHistory = prev.historyStack.slice(0, prev.historyIndex + 1);
      newHistory.push(createHistoryEntry({
        type: 'adjustment',
        adjustmentsBefore: { ...prev.adjustments },
        adjustmentsAfter: { ...defaultAdjustments },
        description: 'Reset adjustments',
      }));
      return {
        ...prev,
        adjustments: { ...defaultAdjustments },
        historyStack: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  };

  const addToHistory = (action: any) => {
    setState(prev => {
      const newHistory = prev.historyStack.slice(0, prev.historyIndex + 1);
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
      if (prev.historyIndex <= 0) return prev;
      const prevEntry = prev.historyStack[prev.historyIndex];
      const newIndex = prev.historyIndex - 1;
      // Restore adjustments if this history entry has them
      if (prevEntry?.type === 'adjustment' && prevEntry.adjustmentsBefore) {
        return { ...prev, adjustments: { ...prevEntry.adjustmentsBefore }, historyIndex: newIndex };
      }
      return { ...prev, historyIndex: newIndex };
    });
  };

  const redo = () => {
    setState(prev => {
      if (prev.historyIndex >= prev.historyStack.length - 1) return prev;
      const newIndex = prev.historyIndex + 1;
      const nextEntry = prev.historyStack[newIndex];
      if (nextEntry?.type === 'adjustment' && nextEntry.adjustmentsAfter) {
        return { ...prev, adjustments: { ...nextEntry.adjustmentsAfter }, historyIndex: newIndex };
      }
      return { ...prev, historyIndex: newIndex };
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

  const restoreSession = (historyStack: Array<any>, historyIndex: number) => {
    // Re-hydrate Date objects that were serialised as strings
    const rehyrdated = historyStack.map(entry => ({
      ...entry,
      timestamp: entry.timestamp instanceof Date ? entry.timestamp : new Date(entry.timestamp),
    }));
    setState(prev => ({ ...prev, historyStack: rehyrdated, historyIndex }));
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
        restoreSession,
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