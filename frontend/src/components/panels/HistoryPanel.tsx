import React, { useState, useEffect } from 'react';
import { Clock, RotateCcw, RotateCw, Trash2, Image, Crop, PaintBucket, Type, Square, ArrowUpDown, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext.js';

interface HistoryAction {
  id: string;
  type: 'crop' | 'brush' | 'text' | 'shape' | 'adjustment' | 'import' | 'export';
  description: string;
  timestamp: Date;
  thumbnailUrl?: string;
}

// Adjustment keys we can filter by
const ADJUSTMENT_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'brightness', label: 'Brightness' },
  { value: 'contrast', label: 'Contrast' },
  { value: 'saturation', label: 'Saturation' },
  { value: 'exposure', label: 'Exposure' },
  { value: 'highlights', label: 'Highlights' },
  { value: 'shadows', label: 'Shadows' },
  { value: 'sharpness', label: 'Sharpness' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'tint', label: 'Tint' },
];

export default function HistoryPanel() {
  const {
    history = [],
    currentHistoryIndex = 0,
    undo,
    redo,
    clearHistory,
  } = useEditor();

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('panel.history.collapsed') === 'true'
  );
  // Persist collapse state
  useEffect(() => {
    localStorage.setItem('panel.history.collapsed', String(collapsed));
  }, [collapsed]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [newestFirst, setNewestFirst] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'crop': return <Crop className="w-4 h-4" />;
      case 'brush': return <PaintBucket className="w-4 h-4" />;
      case 'text': return <Type className="w-4 h-4" />;
      case 'shape': return <Square className="w-4 h-4" />;
      default: return <Image className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (date?: Date) => {
    if (!date) return 'just now';
    const diff = Date.now() - date.getTime();
    const s = Math.floor(diff / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (s < 60) return `${s}s ago`;
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return date.toLocaleDateString();
  };

  const jumpToHistoryPoint = (realIndex: number) => {
    if (realIndex < currentHistoryIndex) {
      for (let i = 0; i < currentHistoryIndex - realIndex; i++) undo();
    } else if (realIndex > currentHistoryIndex) {
      for (let i = 0; i < realIndex - currentHistoryIndex; i++) redo();
    }
  };

  const canUndo = currentHistoryIndex > 0;
  const canRedo = currentHistoryIndex < history.length - 1;

  // Build list of { action, realIndex } with filter applied
  const indexed = history.map((action: HistoryAction, i: number) => ({ action, realIndex: i }));
  const filtered = activeFilter === 'all'
    ? indexed
    : indexed.filter(({ action }) =>
        action.description.toLowerCase().startsWith(activeFilter)
      );
  // Order
  const ordered = newestFirst ? [...filtered].reverse() : filtered;
  // Limit when collapsed
  const visible = isExpanded ? ordered : ordered.slice(0, 5);

  return (
    <div className="bg-gray-800 rounded-lg flex flex-col">
      {/* Header */}
      <div
        className={`flex items-center justify-between cursor-pointer select-none transition-all ${collapsed ? 'px-4 py-1' : 'p-4'}`}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-2">
          {collapsed ? <ChevronRight className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          <h3 className={`text-white font-semibold transition-all ${collapsed ? 'text-sm' : ''}`}>History</h3>
          {!collapsed && <span className="text-gray-400 text-sm sr-only">({currentHistoryIndex + 1}/{history.length})</span>}
        </div>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {!collapsed && (<>
          <div className="relative group">
            <button
              onClick={() => setNewestFirst(p => !p)}
              className="p-1.5 hover:bg-gray-800 rounded-md transition-colors"
            >
              <ArrowUpDown className="w-4 h-4 text-gray-400" />
            </button>
            <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-50">
              <div className="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">
                {newestFirst ? 'Newest to oldest' : 'Oldest to newest'}
              </div>
            </div>
          </div>
          {/* Filter */}
          <div className="relative group">
            <button
              onClick={() => setFilterOpen(p => !p)}
              className={`p-1.5 rounded-md transition-colors ${activeFilter !== 'all' ? 'bg-blue-600 text-white' : 'hover:bg-gray-800 text-gray-400'}`}
            >
            <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-50">
              <div className="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">Filter history</div>
            </div>
              <Filter className="w-4 h-4" />
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-8 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[140px]">
                {ADJUSTMENT_FILTERS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => { setActiveFilter(f.value); setFilterOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                      activeFilter === f.value ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Expand/collapse */}
          <button
            onClick={() => setIsExpanded(p => !p)}
            className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors"
          >
            {isExpanded ? 'Less' : 'More'}
          </button>
          {/* Clear */}
          <div className="relative group">
            <button
              onClick={clearHistory}
              disabled={history.length === 0}
              className="p-1.5 hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4 text-gray-400" />
            </button>
            <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden group-hover:block z-50">
              <div className="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">Clear history</div>
            </div>
          </div>
          </>)}
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 flex flex-col">
      {/* Undo/Redo */}
      <div className="flex gap-2 mb-3">
        <div className="relative group flex-1">
          <button onClick={undo} disabled={!canUndo}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors text-sm">
            <RotateCcw className="w-4 h-4" /> Undo
          </button>
          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50">
            <div className="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">Ctrl+Z</div>
          </div>
        </div>
        <div className="relative group flex-1">
          <button onClick={redo} disabled={!canRedo}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors text-sm">
            <RotateCw className="w-4 h-4" /> Redo
          </button>
          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50">
            <div className="bg-gray-900 border border-gray-700 text-gray-200 text-xs rounded px-2 py-1 whitespace-nowrap shadow-lg">Ctrl+Y</div>
          </div>
        </div>
      </div>

      {/* Active filter badge */}
      {activeFilter !== 'all' && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-blue-400">Filtering: {ADJUSTMENT_FILTERS.find(f => f.value === activeFilter)?.label}</span>
          <button onClick={() => setActiveFilter('all')} className="text-xs text-gray-500 hover:text-gray-300">âœ• clear</button>
        </div>
      )}

      {/* History list */}
      <div className={`${isExpanded ? 'max-h-96' : 'max-h-52'} overflow-y-auto space-y-1.5`}>
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No actions yet</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-sm">No matches for "{ADJUSTMENT_FILTERS.find(f => f.value === activeFilter)?.label}"</div>
        ) : (
          visible.map(({ action, realIndex }, idx) => {
            const isCurrent = realIndex === currentHistoryIndex;
            const isPast = realIndex <= currentHistoryIndex;
            const [line1, line2] = action.description.includes('\n')
              ? action.description.split('\n')
              : [action.description, null];
            return (
              <div
                key={action.id}
                onClick={() => jumpToHistoryPoint(realIndex)}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`p-2.5 rounded-md cursor-pointer transition-all border-l-2 ${
                  isCurrent ? 'bg-gray-800 border-blue-500 ring-1 ring-blue-500' :
                  isPast ? 'bg-gray-800 border-blue-500/40' :
                  'bg-amber-950/30 border-amber-700/40'
                } ${hoveredIndex === idx && !isCurrent && isPast ? 'ring-1 ring-blue-500/40' : ''}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-md shrink-0 ${isPast ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-900/20 text-amber-600/70'}`}>
                    {getActionIcon(action.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isPast ? 'text-white' : 'text-amber-300/70'}`}>{line1}</p>
                    {line2 && <p className={`text-xs mt-0.5 ${isPast ? 'text-gray-400' : 'text-amber-700/80'}`}>{line2}</p>}
                    {!isPast && <span className="text-xs text-amber-500 font-medium mt-0.5 inline-block">Canceled</span>}
                    <p className="text-xs text-gray-600 mt-0.5">{formatTimestamp(action.timestamp)}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                    {isCurrent && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                    {!isCurrent && isPast && realIndex > 0 && hoveredIndex === idx && (
                      <button
                        onClick={(e) => { e.stopPropagation(); jumpToHistoryPoint(realIndex - 1); }}
                        className="p-0.5 hover:bg-gray-700 rounded transition-colors"
                        title="Undo this change"
                      >
                        <RotateCcw className="w-3 h-3 text-gray-500 hover:text-gray-300" />
                      </button>
                    )}
                    {!isPast && (
                      <button
                        onClick={(e) => { e.stopPropagation(); jumpToHistoryPoint(realIndex); }}
                        className="p-0.5 hover:bg-amber-700/30 rounded transition-colors"
                        title="Redo this change"
                      >
                        <RotateCw className="w-3 h-3 text-amber-400" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {history.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500 flex justify-between">
          <span>{filtered.length}{activeFilter !== 'all' ? ` of ${history.length}` : ''} actions</span>
          <span>{history.length - currentHistoryIndex - 1} ahead</span>
        </div>
      )}
        </div>
      )}
    </div>
  );
}

