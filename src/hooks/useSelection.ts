import { useState, useCallback } from 'react';

export const useSelection = () => {
  const [selectionType, setSelectionType] = useState<string>('none');

  const handleSelectionChange = useCallback((type: string) => {
    setSelectionType(type);
  }, []);

  return {
    selectionType,
    handleSelectionChange
  };
};