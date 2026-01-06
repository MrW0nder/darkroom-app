/**
 * useAdjustments - Custom hook for applying image adjustments via API
 * Includes debouncing for real-time preview
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useEditor } from '../contexts/EditorContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface ApplyAdjustmentsParams {
  layerId: number;
}

export const useAdjustments = () => {
  const { state, setProcessing } = useEditor();
  const [error, setError] = useState<string | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const applyAdjustments = useCallback(async ({ layerId }: ApplyAdjustmentsParams) => {
    try {
      setProcessing(true);
      setError(null);

      const response = await axios.post(`${API_URL}/api/adjustments/apply`, {
        layer_id: layerId,
        ...state.adjustments,
      });

      setProcessing(false);
      return response.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to apply adjustments';
      setError(errorMessage);
      setProcessing(false);
      throw new Error(errorMessage);
    }
  }, [state.adjustments, setProcessing]);

  // Debounced version for real-time preview
  const applyAdjustmentsDebounced = useCallback(
    ({ layerId }: ApplyAdjustmentsParams) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      const timer = setTimeout(() => {
        applyAdjustments({ layerId });
      }, 500); // 500ms debounce

      setDebounceTimer(timer);
    },
    [applyAdjustments, debounceTimer]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    applyAdjustments,
    applyAdjustmentsDebounced,
    isProcessing: state.isProcessing,
    error,
  };
};

export default useAdjustments;
