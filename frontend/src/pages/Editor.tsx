/**
 * Editor - Main editing interface
 * Hybrid Lightroom + Photoshop layout
 */
import React, { useState } from 'react';
import { EditorProvider } from '../contexts/EditorContext';
import MainCanvas from '../components/editor/MainCanvas';
import AdjustmentsPanel from '../components/panels/AdjustmentsPanel';

const EditorPage: React.FC = () => {
  const [canvasSize] = useState({ width: 800, height: 600 });

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
            </div>
          </div>
        </header>

        {/* Main Layout */}
        <div className="flex h-[calc(100vh-57px)]">
          {/* Left Sidebar - Tools */}
          <aside className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 space-y-4">
            <button className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded flex items-center justify-center transition-colors" title="Move Tool">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
            <button className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded flex items-center justify-center transition-colors" title="Crop Tool">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16V4h12M20 8v12H8" />
              </svg>
            </button>
            <button className="w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded flex items-center justify-center transition-colors" title="Brush Tool">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            </button>
          </aside>

          {/* Center - Canvas Area */}
          <main className="flex-1 flex flex-col bg-gray-950">
            <div className="flex-1 flex items-center justify-center p-8">
              <MainCanvas width={canvasSize.width} height={canvasSize.height} />
            </div>
            
            {/* Bottom Bar - Image Info */}
            <div className="bg-gray-900 border-t border-gray-800 px-6 py-2 flex items-center justify-between text-sm text-gray-400">
              <span>No project loaded</span>
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
      </div>
    </EditorProvider>
  );
};

export default EditorPage;
