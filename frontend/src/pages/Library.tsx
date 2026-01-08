/**
 * Library - Lightroom-style grid view for image management
 * Browse projects and images
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

interface Project {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  layer_count: number;
}

const LibraryPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const name = prompt('Enter project name:');
    if (!name) return;

    try {
      await axios.post(`${API_URL}/api/projects/`, {
        name,
        description: 'New project',
      });
      fetchProjects();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to create project');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Darkroom Library
            </h1>
            <p className="text-sm text-gray-500 mt-1">Manage your projects and images</p>
          </div>
          <button
            onClick={createNewProject}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors"
          >
            + New Project
          </button>
        </div>
      </header>

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
                onClick={createNewProject}
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
                className="bg-gray-900 rounded-lg border border-gray-800 hover:border-blue-600 transition-all cursor-pointer group overflow-hidden"
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
                    <span>{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default LibraryPage;