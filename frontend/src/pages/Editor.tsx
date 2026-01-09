/**
 * Editor - Main editing interface
 * Hybrid Lightroom + Photoshop layout with full tool integration
 */
import React, { useState } from 'react';
import { EditorProvider } from '../contexts/EditorContext';
import MainCanvas from '../components/editor/MainCanvas';
import AdjustmentsPanel from '../components/panels/AdjustmentsPanel';
import CropTool from '../components/tools/CropTool';
import BrushTool from '../components/tools/BrushTool';
import TextShapesTool from '../components/tools/TextShapesTool';
import ShortcutsPanel from '../components/panels/ShortcutsPanel';
import useKeyboard, { Tool } from '../hooks/useKeyboard';
import { Move, Crop, Paintbrush, Type, Square, HelpCircle } from 'lucide-react';

const EditorPage: React.FC = () => {
  const [canvasSize] = useState({ width: 800, height: 600 });
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<number | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Sample layer data for testing (replace with actual layer state)
  const testImageUrl = '/uploads/sample.jpg';
  const testLayerId = 1;

  // Keyboard shortcuts integration
  useKeyboard({
    onSave: () => console.log('Save project'),
    onExport: () => console.log('Export image'),
    onNewProject: () => console.log('New project'),
    onUndo: () => console.log('Undo'),
    onRedo: () => console.log('Redo'),
    onSelectTool: (tool: Tool) => setActiveTool(tool),
    onDuplicateLayer: () => console.log('Duplicate layer'),
    onDeleteLayer: () => console.log('Delete layer'),
    onMoveLayerUp: () => console.log('Move layer up'),
    onMoveLayerDown: () => console.log('Move layer down'),
    onZoomIn: () => console.log('Zoom in'),
    onZoomOut: () => console.log('Zoom out'),
    onZoomReset: () => console.log('Zoom reset'),
    onZoomFit: () => console.log('Zoom fit'),
    onShowHelp: () => setShowShortcuts(true),
  });

  const handleToolComplete = () => {
    setActiveTool(null);
    // Refresh layers or canvas here
  };

  const handleToolCancel = () => {
    setActiveTool(null);
  };

  return (
    <EditorProvider>
      <div className="min-h-screen bg-gray-950 text-gray-100">
        {/* Top Bar */}
        <header className="bg-gray-900 border-b border-gray-800 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Darkroom
              </h1>
              <span className="text-sm text-gray-500">Hybrid Editor</span>
            </div>
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors">
                File
              </button>
              <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors">
                Edit
              </button>
              <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors">
                View
              </button>
              <button
                onClick={() => setShowShortcuts(true)}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
                title="Keyboard Shortcuts (Press ?)"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <div className="flex h-[calc(100vh-57px)]">
          {/* Left Sidebar - Tools */}
          <aside className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 space-y-4">
            <button
              onClick={() => setActiveTool('move')}
              className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                activeTool === 'move'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title="Move Tool (V)"
            >
              <Move className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTool('crop')}
              className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                activeTool === 'crop'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title="Crop Tool (C)"
            >
              <Crop className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTool('brush')}
              className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                activeTool === 'brush'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title="Brush Tool (B)"
            >
              <Paintbrush className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTool('text')}
              className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                activeTool === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title="Text Tool (T)"
            >
              <Type className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActiveTool('shapes')}
              className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                activeTool === 'shapes'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
              title="Shapes Tool (S)"
            >
              <Square className="w-5 h-5" />
            </button>
          </aside>

          {/* Center - Canvas Area */}
          <main className="flex-1 flex flex-col bg-gray-950">
            <div className="flex-1 flex items-center justify-center p-8">
              {activeTool === 'crop' && testLayerId ? (
                <CropTool
                  layerId={testLayerId}
                  imageUrl={testImageUrl}
                  originalWidth={800}
                  originalHeight={600}
                  onComplete={handleToolComplete}
                  onCancel={handleToolCancel}
                />
              ) : activeTool === 'brush' && testLayerId ? (
                <BrushTool
                  layerId={testLayerId}
                  imageUrl={testImageUrl}
                  originalWidth={800}
                  originalHeight={600}
                  onComplete={handleToolComplete}
                  onCancel={handleToolCancel}
                />
              ) : (activeTool === 'text' || activeTool === 'shapes') && testLayerId ? (
                <TextShapesTool
                  layerId={testLayerId}
                  imageUrl={testImageUrl}
                  originalWidth={800}
                  originalHeight={600}
                  onComplete={handleToolComplete}
                  onCancel={handleToolCancel}
                />
              ) : (
                <MainCanvas width={canvasSize.width} height={canvasSize.height} />
              )}
            </div>
            
            {/* Bottom Bar - Image Info */}
            <div className="bg-gray-900 border-t border-gray-800 px-6 py-2 flex items-center justify-between text-sm text-gray-400">
              <span>
                {activeTool
                  ? `Active Tool: ${activeTool.charAt(0).toUpperCase() + activeTool.slice(1)}`
                  : 'No project loaded'}
              </span>
              <span>100% Zoom</span>
            </div>
          </main>

          {/* Right Sidebar - Adjustments & Layers */}
          <aside className="w-80 bg-gray-900 border-l border-gray-800 overflow-y-auto">
            <div className="p-4 space-y-4">
              {/* Adjustments Section */}
              <AdjustmentsPanel />

              {/* Layers Section */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Layers</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-gray-700 rounded text-sm text-gray-300">
                    No layers yet
                  </div>
                </div>
              </div>

              {/* History Section */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">History</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-gray-700 rounded text-sm text-gray-300">
                    No history yet
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
        
        {/* Keyboard Shortcuts Panel */}
        <ShortcutsPanel isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      </div>
    </EditorProvider>
  );
};

export default EditorPage;