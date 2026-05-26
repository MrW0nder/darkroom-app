/**
 * MenuBar — native-style top menu bar (File / Edit / Image / View / Help)
 *
 * Editor-specific actions are dispatched as custom DOM events so the
 * MenuBar doesn't need to reach down into the Editor context.
 * EditorInner listens for those events via useEffect.
 *
 * App-level actions (new project, navigate) come in as callbacks.
 */
import React, { useEffect, useRef, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Separator = { type: 'separator' };
type MenuItem = {
  type?: 'item';
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onClick: () => void;
};
type MenuEntry = Separator | MenuItem;

interface MenuDef {
  label: string;
  items: MenuEntry[];
}

export interface MenuBarProps {
  currentView: 'library' | 'editor';
  projectTitle?: string;
  onGoToLibrary: () => void;
  onGoToEditor: () => void;
  onNewProject: () => void;
}

// Helper: dispatch a string event on window
const fire = (name: string) => window.dispatchEvent(new CustomEvent(name));

// ─── Sub-menu Dropdown ────────────────────────────────────────────────────────

interface DropdownProps {
  menu: MenuDef;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  alignRight?: boolean;
}

const Dropdown: React.FC<DropdownProps> = ({ menu, isOpen, onToggle, onClose, alignRight }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={`px-3 py-1 text-sm rounded transition-colors select-none ${
          isOpen
            ? 'bg-gray-700 text-white'
            : 'text-gray-300 hover:text-white hover:bg-gray-750'
        }`}
        style={{ backgroundColor: isOpen ? undefined : 'transparent' }}
        onMouseEnter={(e) => { if (!isOpen) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.07)'; }}
        onMouseLeave={(e) => { if (!isOpen) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
      >
        {menu.label}
      </button>

      {isOpen && (
        <div className={`absolute top-full mt-0.5 min-w-52 bg-gray-850 border border-gray-700 rounded-lg shadow-2xl z-[200] py-1 overflow-hidden ${alignRight ? 'right-0' : 'left-0'}`}
          style={{ backgroundColor: '#1a1f2e' }}>
          {menu.items.map((entry, i) => {
            if ('type' in entry && entry.type === 'separator') {
              return <div key={i} className="my-1 border-t border-gray-700/60" />;
            }
            const item = entry as MenuItem;
            return (
              <button
                key={i}
                disabled={item.disabled}
                onClick={() => { item.onClick(); onClose(); }}
                className={`w-full flex items-center justify-between px-4 py-1.5 text-sm transition-colors text-left ${
                  item.disabled
                    ? 'text-gray-600 cursor-default'
                    : 'text-gray-200 hover:bg-blue-600 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className={`ml-8 text-xs ${item.disabled ? 'text-gray-700' : 'text-gray-500 group-hover:text-gray-300'}`}>
                    {item.shortcut}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── About Dialog ─────────────────────────────────────────────────────────────

const AboutDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div
    className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60"
    onClick={onClose}
  >
    <div
      className="bg-gray-900 border border-gray-700 rounded-xl p-8 shadow-2xl max-w-sm w-full text-center"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
        Darkroom
      </div>
      <p className="text-gray-400 text-sm mb-1">Professional photo editing, fully offline.</p>
      <p className="text-gray-600 text-xs mb-6">Version 0.1.0</p>
      <button
        onClick={onClose}
        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
      >
        Close
      </button>
    </div>
  </div>
);

// ─── MenuBar ──────────────────────────────────────────────────────────────────

export const MenuBar: React.FC<MenuBarProps> = ({
  currentView,
  projectTitle,
  onGoToLibrary,
  onGoToEditor,
  onNewProject,
}) => {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const inEditor = currentView === 'editor';

  // Close all menus on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenMenu(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const toggle = (name: string) =>
    setOpenMenu((prev) => (prev === name ? null : name));
  const close = () => setOpenMenu(null);

  const menus: MenuDef[] = [
    {
      label: 'Image',
      items: [
        { label: 'Flip Horizontal', disabled: !inEditor, onClick: () => fire('menu:flip-h') },
        { label: 'Flip Vertical',   disabled: !inEditor, onClick: () => fire('menu:flip-v') },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Keyboard Shortcuts', shortcut: '?', onClick: () => fire('menu:show-shortcuts') },
        { type: 'separator' },
        { label: 'About Darkroom', onClick: () => setShowAbout(true) },
      ],
    },
  ];

  return (
    <>
      <header className="h-10 bg-gray-900 border-b border-gray-800 flex items-center px-2 z-50 relative select-none flex-shrink-0">
        {/* Left — logo + project title */}
        <div className="flex items-center gap-2">
          {/* Logo mark */}
          <span className="px-2 mr-1 text-sm font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Darkroom
          </span>
          {projectTitle && (
            <span className="text-xs text-gray-400 font-medium truncate max-w-48">
              {projectTitle}
            </span>
          )}
        </div>

        {/* Center — Library / Editor nav */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
          <button
            onClick={onGoToLibrary}
            className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${
              currentView === 'library'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Library
          </button>
          <button
            onClick={onGoToEditor}
            className={`px-4 py-1 rounded-full text-xs font-medium transition-all ${
              currentView === 'editor'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Editor
          </button>
        </div>

        {/* Right — menus + View button */}
        <div className="ml-auto flex items-center gap-0.5">
          {/* View — direct action (opens fullscreen preview), editor only */}
          {inEditor && (
            <button
              onClick={() => fire('menu:view')}
              className="px-3 py-1 text-sm rounded transition-colors select-none text-gray-300 hover:text-white"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              View
            </button>
          )}
          {menus.map((menu) => (
            <Dropdown
              key={menu.label}
              menu={menu}
              isOpen={openMenu === menu.label}
              onToggle={() => toggle(menu.label)}
              onClose={close}
              alignRight
            />
          ))}
        </div>
      </header>

      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
    </>
  );
};

export default MenuBar;
