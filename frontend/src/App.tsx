/**
 * App - Main application component with simple routing
 * Switch between Library and Editor views
 */
import { useState, useEffect } from 'react';
import LibraryPage from './pages/Library';
import EditorPage from './pages/Editor';

type View = 'library' | 'editor';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('library');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // Read projectId from URL query parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectIdParam = params.get('projectId');
    if (projectIdParam) {
      const projectId = parseInt(projectIdParam, 10);
      if (!isNaN(projectId)) {
        console.log('Opening project from URL:', projectId);
        setSelectedProjectId(projectId);
        setCurrentView('editor');
      }
    }
  }, []);

  const openProject = (projectId: number) => {
    setSelectedProjectId(projectId);
    setCurrentView('editor');
  };

  const closeProject = () => {
    setSelectedProjectId(null);
    setCurrentView('library');
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Global Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 z-50 relative">
        <div className="flex items-center justify-between">
          {/* Left - Title (Library only) */}
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Darkroom{currentView === 'library' ? ' Library' : ''}
            </h1>
          </div>

          {/* Center - Navigation (absolutely centered) */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
            <button
              onClick={() => closeProject()}
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
              disabled={!selectedProjectId}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                currentView === 'editor' && selectedProjectId
                  ? 'bg-blue-600 text-white'
                  : selectedProjectId
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-gray-600 cursor-not-allowed'
              }`}
            >
              Editor
            </button>
          </div>

          {/* Right - Actions based on view */}
          {currentView === 'editor' && selectedProjectId ? (
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Project #{selectedProjectId}
              </span>
              <div className="flex items-center space-x-2 border-l border-gray-700 pl-4">
                <button className="px-3 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors">
                  File
                </button>
                <button className="px-3 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors">
                  Edit
                </button>
                <button className="px-3 py-1 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors">
                  View
                </button>
              </div>
            </div>
          ) : currentView === 'library' ? (
            <button
              onClick={() => setShowCreateDialog(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
            >
              <span>+</span>
              <span>New Project</span>
            </button>
          ) : (
            <div />
          )}
        </div>
      </header>

      {/* View Content */}
      <div className="min-h-[calc(100vh-57px)] bg-gray-950">
        {currentView === 'library' ? (
          <>
            <LibraryPage 
              onOpenProject={openProject}
              showCreateDialog={showCreateDialog}
              onCreateDialogChange={setShowCreateDialog}
              newProjectName={newProjectName}
              onNewProjectNameChange={setNewProjectName}
            />
          </>
        ) : selectedProjectId ? (
          <EditorPage 
            projectId={selectedProjectId} 
            onClose={closeProject}
            currentView={currentView}
            onViewChange={setCurrentView}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-gray-400 text-lg mb-4">No project selected</p>
              <button
                onClick={() => setCurrentView('library')}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Go to Library
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}