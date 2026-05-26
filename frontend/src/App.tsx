/**
 * App - Main application component with simple routing
 * Switch between Library and Editor views
 */
import { useState, useEffect } from 'react';
import LibraryPage from './pages/Library';
import EditorPage from './pages/Editor';
import MenuBar from './components/ui/MenuBar';

type View = 'library' | 'editor';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('library');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [lastOpenedProjectId, setLastOpenedProjectId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [firstFilteredProjectId, setFirstFilteredProjectId] = useState<number | null>(null);
  const [currentProjectTitle, setCurrentProjectTitle] = useState<string>('');

  // Fetch project title when selectedProjectId changes
  useEffect(() => {
    if (selectedProjectId) {
      const API_URL = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:8000';
      fetch(`${API_URL}/api/projects/${selectedProjectId}`)
        .then(res => res.json())
        .then(project => setCurrentProjectTitle(project.name || ''))
        .catch(err => console.error('Failed to fetch project title:', err));
    } else {
      setCurrentProjectTitle('');
    }
  }, [selectedProjectId]);

  // Read projectId from URL query parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectIdParam = params.get('projectId');
    if (projectIdParam) {
      const projectId = parseInt(projectIdParam, 10);
      if (!isNaN(projectId)) {
        console.log('Opening project from URL:', projectId);
        setSelectedProjectId(projectId);
        setLastOpenedProjectId(projectId);
        setCurrentView('editor');
      }
    }
  }, []);

  const openProject = (projectId: number) => {
    setSelectedProjectId(projectId);
    setLastOpenedProjectId(projectId);
    setCurrentView('editor');
  };

  const closeProject = () => {
    setCurrentView('library');
  };

  const openEditor = () => {
    // If there's a last opened project, open it
    if (lastOpenedProjectId) {
      setSelectedProjectId(lastOpenedProjectId);
      setCurrentView('editor');
    } 
    // Otherwise, open the first filtered project from library
    else if (firstFilteredProjectId) {
      setSelectedProjectId(firstFilteredProjectId);
      setLastOpenedProjectId(firstFilteredProjectId);
      setCurrentView('editor');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <MenuBar
        currentView={currentView}
        projectTitle={currentProjectTitle || undefined}
        onGoToLibrary={closeProject}
        onGoToEditor={openEditor}
        onNewProject={() => { closeProject(); setShowCreateDialog(true); }}
      />

      {/* View Content */}
      <div className="flex-1 bg-gray-950 overflow-hidden">
        {currentView === 'library' ? (
          <>
            <LibraryPage 
              onOpenProject={openProject}
              showCreateDialog={showCreateDialog}
              onCreateDialogChange={setShowCreateDialog}
              newProjectName={newProjectName}
              onNewProjectNameChange={setNewProjectName}
              onFirstFilteredProjectChange={setFirstFilteredProjectId}
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