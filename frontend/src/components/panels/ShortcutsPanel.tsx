import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  shortcuts: Shortcut[];
}

const ShortcutsPanel: React.FC<ShortcutsPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdKey = isMac ? '⌘' : 'Ctrl';

  const categories: ShortcutCategory[] = [
    {
      title: 'Editor Commands',
      shortcuts: [
        { keys: [cmdKey, 'S'], description: 'Save project' },
        { keys: [cmdKey, 'E'], description: 'Export image' },
        { keys: [cmdKey, 'N'], description: 'New project' },
        { keys: [cmdKey, 'Z'], description: 'Undo' },
        { keys: [cmdKey, 'Y'], description: 'Redo' },
        { keys: [cmdKey, 'Shift', 'Z'], description: 'Redo (alternate)' },
      ],
    },
    {
      title: 'Tools',
      shortcuts: [
        { keys: ['V'], description: 'Move / Select tool' },
        { keys: ['C'], description: 'Crop tool' },
        { keys: ['B'], description: 'Brush tool' },
        { keys: ['T'], description: 'Text tool' },
        { keys: ['S'], description: 'Shapes tool' },
      ],
    },
    {
      title: 'Layers',
      shortcuts: [
        { keys: [cmdKey, 'J'], description: 'Duplicate layer' },
        { keys: ['Delete'], description: 'Delete layer' },
        { keys: [cmdKey, '['], description: 'Move layer down' },
        { keys: [cmdKey, ']'], description: 'Move layer up' },
      ],
    },
    {
      title: 'View',
      shortcuts: [
        { keys: ['+'], description: 'Zoom in' },
        { keys: ['-'], description: 'Zoom out' },
        { keys: ['0'], description: 'Zoom to 100%' },
        { keys: [cmdKey, '0'], description: 'Fit to screen' },
      ],
    },
    {
      title: 'Help',
      shortcuts: [
        { keys: ['?'], description: 'Show this help panel' },
      ],
    },
  ];

  const KeyBadge: React.FC<{ keyName: string }> = ({ keyName }) => (
    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-mono font-semibold text-gray-200 bg-gray-700 border border-gray-600 rounded shadow-sm min-w-[28px]">
      {keyName}
    </span>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Keyboard className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {categories.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <h3 className="text-lg font-semibold text-blue-400 mb-4">
                  {category.title}
                </h3>
                <div className="space-y-3">
                  {category.shortcuts.map((shortcut, shortcutIndex) => (
                    <div
                      key={shortcutIndex}
                      className="flex items-center justify-between py-2 px-4 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors"
                    >
                      <span className="text-gray-300">{shortcut.description}</span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            {keyIndex > 0 && (
                              <span className="text-gray-500 mx-1">+</span>
                            )}
                            <KeyBadge keyName={key} />
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 bg-gray-850">
          <p className="text-sm text-gray-400 text-center">
            Press <KeyBadge keyName="?" /> anytime to show this help panel
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShortcutsPanel;