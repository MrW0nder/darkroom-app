import { useEffect, useCallback } from 'react';

export type Tool = 'move' | 'crop' | 'brush' | 'text' | 'shapes';

interface KeyboardShortcuts {
  onSave?: () => void;
  onExport?: () => void;
  onNewProject?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onSelectTool?: (tool: Tool) => void;
  onDuplicateLayer?: () => void;
  onDeleteLayer?: () => void;
  onMoveLayerUp?: () => void;
  onMoveLayerDown?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onZoomReset?: () => void;
  onZoomFit?: () => void;
  onShowHelp?: () => void;
}

const useKeyboard = (shortcuts: KeyboardShortcuts) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey } = event;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? metaKey : ctrlKey;

      // Prevent shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Editor Commands
      if (cmdKey && key.toLowerCase() === 's') {
        event.preventDefault();
        shortcuts.onSave?.();
        return;
      }

      if (cmdKey && key.toLowerCase() === 'e') {
        event.preventDefault();
        shortcuts.onExport?.();
        return;
      }

      if (cmdKey && key.toLowerCase() === 'n') {
        event.preventDefault();
        shortcuts.onNewProject?.();
        return;
      }

      // Undo/Redo
      if (cmdKey && !shiftKey && key.toLowerCase() === 'z') {
        event.preventDefault();
        shortcuts.onUndo?.();
        return;
      }

      if ((cmdKey && shiftKey && key.toLowerCase() === 'z') || (cmdKey && key.toLowerCase() === 'y')) {
        event.preventDefault();
        shortcuts.onRedo?.();
        return;
      }

      // Tool Selection (without modifiers)
      if (!cmdKey && !shiftKey && !metaKey) {
        switch (key.toLowerCase()) {
          case 'v':
            event.preventDefault();
            shortcuts.onSelectTool?.('move');
            return;
          case 'c':
            event.preventDefault();
            shortcuts.onSelectTool?.('crop');
            return;
          case 'b':
            event.preventDefault();
            shortcuts.onSelectTool?.('brush');
            return;
          case 't':
            event.preventDefault();
            shortcuts.onSelectTool?.('text');
            return;
          case 's':
            event.preventDefault();
            shortcuts.onSelectTool?.('shapes');
            return;
          case '?':
            event.preventDefault();
            shortcuts.onShowHelp?.();
            return;
        }
      }

      // Layer Commands
      if (cmdKey && key.toLowerCase() === 'j') {
        event.preventDefault();
        shortcuts.onDuplicateLayer?.();
        return;
      }

      if (key === 'Delete' || key === 'Backspace') {
        // Only delete layer if not typing
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          event.preventDefault();
          shortcuts.onDeleteLayer?.();
          return;
        }
      }

      if (cmdKey && key === '[') {
        event.preventDefault();
        shortcuts.onMoveLayerDown?.();
        return;
      }

      if (cmdKey && key === ']') {
        event.preventDefault();
        shortcuts.onMoveLayerUp?.();
        return;
      }

      // Zoom Commands
      if (!cmdKey && (key === '+' || key === '=')) {
        event.preventDefault();
        shortcuts.onZoomIn?.();
        return;
      }

      if (!cmdKey && key === '-') {
        event.preventDefault();
        shortcuts.onZoomOut?.();
        return;
      }

      if (!cmdKey && key === '0') {
        event.preventDefault();
        shortcuts.onZoomReset?.();
        return;
      }

      if (cmdKey && key === '0') {
        event.preventDefault();
        shortcuts.onZoomFit?.();
        return;
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return null;
};

export default useKeyboard;
