import { useEffect } from "react";

interface KeyboardShortcutsProps {
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  onOpen: () => void;
}

export const useKeyboardShortcuts = ({
  onSave,
  onUndo,
  onRedo,
  onReset,
  onOpen
}: KeyboardShortcutsProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default browser behavior for these shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === "o") {
        e.preventDefault();
        onOpen();
      }
      
      if (e.key === "Escape") {
        onReset();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onSave, onUndo, onRedo, onReset, onOpen]);
};