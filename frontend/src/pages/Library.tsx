/**
 * Library - Lightroom-style grid view for image management
 * Browse projects and images
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Fix: Added type assertion to handle `import.meta.env`
const API_URL = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:8000';

interface Project {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  layer_count: number;
}

interface LibraryPageProps {
  onOpenProject: (projectId: number) => void;
  showCreateDialog: boolean;
  onCreateDialogChange: (show: boolean) => void;
  newProjectName: string;
  onNewProjectNameChange: (name: string) => void;
}

const LibraryPage: React.FC<LibraryPageProps> = ({ 
  onOpenProject,
  showCreateDialog,
  onCreateDialogChange,
  newProjectName,
  onNewProjectNameChange
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ show: boolean; projectId: number; projectName: string } | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/projects/`);
      setProjects(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const createNewProject = async () => {
    const projectName = newProjectName.trim() || `Project ${Date.now()}`;
    
    try {
      const response = await axios.post(`${API_URL}/api/projects/`, {
        name: projectName,
        description: newProjectDesc || 'New project',
      });
      onCreateDialogChange(false);
      onNewProjectNameChange('');
      setNewProjectDesc('');
      await fetchProjects();
    } catch (err: any) {
      console.error('Error creating project:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to create project';
      alert(errorMessage);
    }
  };

  const handleOpenProject = (projectId: number) => {
    onOpenProject(projectId);
  };

  const deleteProject = async (projectId: number, projectName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the project
    setDeleteConfirmDialog({ show: true, projectId, projectName });
  };

  const confirmDeleteProject = async () => {
    if (!deleteConfirmDialog) return;

    const { projectId } = deleteConfirmDialog;
    setDeleteConfirmDialog(null);

    try {
      console.log(`Attempting to delete project ${projectId}...`);
      const response = await axios.delete(`${API_URL}/api/projects/${projectId}`);
      console.log('Delete response:', response.data);
      console.log('Refreshing projects list...');
      await fetchProjects();
      console.log('Projects refreshed');
    } catch (err: any) {
      console.error('Error deleting project:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to delete project';
      console.error('Error message:', errorMessage);
      alert(`Error: ${errorMessage}`);
    }
  };

  return (
    <div className="bg-gray-950 text-gray-100">
      {/* Delete Confirmation Dialog */}
      {deleteConfirmDialog?.show && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setDeleteConfirmDialog(null)}
        >
          <div 
            className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4">Delete Project</h2>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete <span className="font-semibold">"{deleteConfirmDialog.projectName}"</span>? This action cannot be undone and all associated images will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteProject}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white font-medium transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setDeleteConfirmDialog(null)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-white font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Dialog */}
      {showCreateDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            onCreateDialogChange(false);
            onNewProjectNameChange('');
            setNewProjectDesc('');
          }}
        >
          <div 
            className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4">Create New Project</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => {
                    onNewProjectNameChange(e.target.value);
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-600"
                  placeholder="My Photo Project"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description (optional)</label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => {
                    setNewProjectDesc(e.target.value);
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-600 resize-none"
                  placeholder="Project description..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={createNewProject}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    onCreateDialogChange(false);
                    onNewProjectNameChange('');
                    setNewProjectDesc('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-white font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="p-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading projects...</div>
          </div>
        ) : error ? (
          <div className="bg-red-900 bg-opacity-20 border border-red-800 rounded-lg p-4 text-red-400">
            {error}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-500 mb-4">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No projects yet</h3>
              <p className="text-gray-600 mb-6">Create your first project to get started</p>
              <button
                onClick={() => onCreateDialogChange(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors inline-flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Project
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-gray-900 rounded-lg border border-gray-800 hover:border-blue-600 transition-all group overflow-hidden relative"
              >
                <div 
                  onClick={() => handleOpenProject(project.id)}
                  className="cursor-pointer"
                >
                  <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-700 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-white mb-1 truncate">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-gray-500 mb-2 truncate">
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{project.layer_count} layers</span>
                      <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                {/* Delete Button */}
                <button
                  onClick={(e) => deleteProject(project.id, project.name, e)}
                  className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="Delete project"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default LibraryPage;