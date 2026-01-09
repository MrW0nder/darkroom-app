import React, { useState } from 'react';
import { Clock, RotateCcw, RotateCw, Trash2, Image, Crop, PaintBucket, Type, Square } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

interface HistoryAction {
  id: string;
  type: 'crop' | 'brush' | 'text' | 'shape' | 'adjustment' | 'import' | 'export';
  description: string;
  timestamp: Date;
  thumbnailUrl?: string;
}

export default function HistoryPanel() {
  const { history, currentHistoryIndex, undo, redo, clearHistory } = useEditor();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'crop':
        return <Crop className="w-4 h-4" />;
      case 'brush':
        return <PaintBucket className="w-4 h-4" />;
      case 'text':
        return <Type className="w-4 h-4" />;
      case 'shape':
        return <Square className="w-4 h-4" />;
      case 'adjustment':
        return <Image className="w-4 h-4" />;
      case 'import':
      case 'export':
        return <Image className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const jumpToHistoryPoint = (index: number) => {
    if (index < currentHistoryIndex) {
      // Undo to that point
      const stepsToUndo = currentHistoryIndex - index;
      for (let i = 0; i < stepsToUndo; i++) {
        undo();
      }
    } else if (index > currentHistoryIndex) {
      // Redo to that point
      const stepsToRedo = index - currentHistoryIndex;
      for (let i = 0; i < stepsToRedo; i++) {
        redo();
      }
    }
  };

  const canUndo = currentHistoryIndex > 0;
  const canRedo = currentHistoryIndex < history.length - 1;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <h3 className="text-white font-semibold">History</h3>
          <span className="text-gray-400 text-sm">
            ({currentHistoryIndex + 1}/{history.length})
          </span>
        </div>
        <button
          onClick={clearHistory}
          disabled={history.length === 0}
          className="p-1.5 hover:bg-gray-800 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Clear History"
        >
          <Trash2 className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Undo/Redo Controls */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-sm">Undo</span>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <RotateCw className="w-4 h-4" />
          <span className="text-sm">Redo</span>
        </button>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No actions yet</p>
            <p className="text-xs mt-1">Your editing history will appear here</p>
          </div>
        ) : (
          history.map((action, index) => (
            <div
              key={action.id}
              onClick={() => jumpToHistoryPoint(index)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`
                p-3 rounded-md cursor-pointer transition-all
                ${
                  index <= currentHistoryIndex
                    ? 'bg-gray-800 border-l-2 border-blue-500'
                    : 'bg-gray-800/50 border-l-2 border-gray-700 opacity-60'
                }
                ${hoveredIndex === index ? 'ring-2 ring-blue-500/50' : ''}
                ${index === currentHistoryIndex ? 'ring-2 ring-blue-500' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={`
                  p-2 rounded-md 
                  ${index <= currentHistoryIndex ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-500'}
                `}
                >
                  {getActionIcon(action.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      index <= currentHistoryIndex ? 'text-white' : 'text-gray-400'
                    }`}
                  >
                    {action.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatTimestamp(action.timestamp)}
                  </p>
                </div>

                {/* Current Indicator */}
                {index === currentHistoryIndex && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                )}
              </div>

              {/* Thumbnail Preview on Hover */}
              {hoveredIndex === index && action.thumbnailUrl && (
                <div className="mt-2 rounded-md overflow-hidden border border-gray-700">
                  <img
                    src={action.thumbnailUrl}
                    alt="Preview"
                    className="w-full h-20 object-cover"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Stats Footer */}
      {history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-500 flex justify-between">
          <span>{history.length} actions total</span>
          <span>{history.length - currentHistoryIndex - 1} actions ahead</span>
        </div>
      )}
    </div>
  );
}