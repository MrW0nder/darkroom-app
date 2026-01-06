/**
 * App - Main application component with simple routing
 * Switch between Library and Editor views
 */
import React, { useState } from 'react';
import LibraryPage from './pages/Library';
import EditorPage from './pages/Editor';

type View = 'library' | 'editor';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('library');

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Simple Navigation */}
      <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 rounded-full border border-gray-800 shadow-lg">
        <div className="flex items-center space-x-2 p-2">
          <button
            onClick={() => setCurrentView('library')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              currentView === 'library'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Library
          </button>
          <button
            onClick={() => setCurrentView('editor')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              currentView === 'editor'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Editor
          </button>
        </div>
      </nav>

      {/* View Content */}
      <div className="pt-20">
        {currentView === 'library' ? <LibraryPage /> : <EditorPage />}
      </div>
    </div>
  );
}
