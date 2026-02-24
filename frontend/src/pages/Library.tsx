/**
 * Library - Lightroom-style grid view for image management
 * Browse projects and images
 */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Cropper from 'react-easy-crop';

// Fix: Added type assertion to handle `import.meta.env`
const API_URL = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:8000';

interface Project {
  id: number;
  name: string;
  description: string | null;
  cover_image: string | null;
  cover_original_width: number | null;
  cover_original_height: number | null;
  cover_crop_x: number | null;
  cover_crop_y: number | null;
  cover_crop_width: number | null;
  cover_crop_height: number | null;
  due_date: string | null;
  is_pinned: boolean;
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
  onFirstFilteredProjectChange: (projectId: number | null) => void;
}

const toStorageUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  const normalized = path.replace(/\\/g, '/');
  const storageIndex = normalized.lastIndexOf('/storage/');

  if (storageIndex !== -1) {
    return encodeURI(`${API_URL}${normalized.substring(storageIndex)}`);
  }

  const trimmed = normalized.replace(/^\/?storage\/?/, '').replace(/^\/?/, '');
  return encodeURI(`${API_URL}/storage/${trimmed}`);
};

const getCoverUrl = (path: string | null) => (path ? toStorageUrl(path) : null);

const getCoverCropStyle = (
  coverImage: string | null,
  coverOriginalWidth: number | null,
  coverOriginalHeight: number | null,
  coverCropX: number | null,
  coverCropY: number | null,
  coverCropWidth: number | null,
  coverCropHeight: number | null
) => {
  if (
    !coverImage ||
    !coverOriginalWidth ||
    !coverOriginalHeight ||
    coverCropX === null ||
    coverCropY === null ||
    !coverCropWidth ||
    !coverCropHeight
  ) {
    return null;
  }

  const w = coverOriginalWidth;
  const h = coverOriginalHeight;
  const cropW = coverCropWidth;
  const cropH = coverCropHeight;
  const cropX = coverCropX;
  const cropY = coverCropY;

  // Scale the image so the crop region fills the container
  const scaleX = w / cropW;
  const scaleY = h / cropH;
  
  // Position - reduce negative offset further to move image more to the right
  const leftPercent = -(cropX / w) * scaleX * 0;
  const topPercent = -(cropY / h) * scaleY * 100;

  return {
    width: `${scaleX * 100}%`,
    height: `${scaleY * 100}%`,
    left: `${leftPercent}%`,
    top: `${topPercent}%`,
    position: 'absolute' as const,
    objectFit: 'cover' as const,
  };
};

const LibraryPage: React.FC<LibraryPageProps> = ({ 
  onOpenProject,
  showCreateDialog,
  onCreateDialogChange,
  newProjectName,
  onNewProjectNameChange,
  onFirstFilteredProjectChange
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectDueDate, setNewProjectDueDate] = useState('');
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ show: boolean; projectId: number; projectName: string } | null>(null);
  const [editDialog, setEditDialog] = useState<{ show: boolean; projectId: number; name: string; description: string; due_date: string; cover_image: string | null; cover_original_width: number | null; cover_original_height: number | null; cover_crop_x: number | null; cover_crop_y: number | null; cover_crop_width: number | null; cover_crop_height: number | null } | null>(null);
  const [filterBy, setFilterBy] = useState<'all' | 'pinned' | 'recent' | 'due-soon'>('all');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [gridSizeDropdownOpen, setGridSizeDropdownOpen] = useState(false);
  const gridSizeDropdownRef = useRef<HTMLDivElement>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreviewUrl, setEditPhotoPreviewUrl] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [pendingCoverCrop, setPendingCoverCrop] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [gridSize, setGridSize] = useState<'small' | 'medium' | 'large'>('medium');

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (!editPhotoFile) {
      setEditPhotoPreviewUrl(getCoverUrl(editDialog?.cover_image || null));
      return;
    }

    const objectUrl = URL.createObjectURL(editPhotoFile);
    setEditPhotoPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [editPhotoFile, editDialog?.cover_image]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setFilterDropdownOpen(false);
      }
      if (gridSizeDropdownRef.current && !gridSizeDropdownRef.current.contains(event.target as Node)) {
        setGridSizeDropdownOpen(false);
      }
    };

    if (filterDropdownOpen || gridSizeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [filterDropdownOpen, gridSizeDropdownOpen]);

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

  const openEditDialog = (project: Project) => {
    setEditDialog({
      show: true,
      projectId: project.id,
      name: project.name,
      description: project.description || '',
      due_date: project.due_date ? project.due_date.split('T')[0] : '',
      cover_image: project.cover_image,
      cover_original_width: project.cover_original_width,
      cover_original_height: project.cover_original_height,
      cover_crop_x: project.cover_crop_x,
      cover_crop_y: project.cover_crop_y,
      cover_crop_width: project.cover_crop_width,
      cover_crop_height: project.cover_crop_height,
    });
    setEditPhotoFile(null);
    setEditPhotoPreviewUrl(getCoverUrl(project.cover_image));
    setPendingCoverCrop(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const updateProject = async () => {
    if (!editDialog) return;
    try {
      if (editPhotoFile) {
        await uploadProjectPhoto();
      }
      await axios.put(`${API_URL}/api/projects/${editDialog.projectId}`, {
        name: editDialog.name,
        description: editDialog.description || null,
        due_date: editDialog.due_date ? new Date(editDialog.due_date).toISOString() : null,
      });
      setEditDialog(null);
      setEditPhotoFile(null);
      setEditPhotoPreviewUrl(null);
      setPendingCoverCrop(null);
      await fetchProjects();
    } catch (err: any) {
      console.error('Error updating project:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to update project';
      alert(errorMessage);
    }
  };

  const onPhotoFileChange = (file: File | null) => {
    setEditPhotoFile(file);
    setPendingCoverCrop(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const onCropComplete = (_: { x: number; y: number }, croppedPixels: { x: number; y: number; width: number; height: number }) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const applyCrop = async () => {
    if (!editPhotoPreviewUrl || !croppedAreaPixels) return;
    if (editPhotoFile) {
      setPendingCoverCrop(croppedAreaPixels);
      setIsCropModalOpen(false);
      return;
    }

    if (!editDialog) return;

    try {
      await axios.put(`${API_URL}/api/projects/${editDialog.projectId}/cover-crop`, {
        cover_crop_x: Math.round(croppedAreaPixels.x),
        cover_crop_y: Math.round(croppedAreaPixels.y),
        cover_crop_width: Math.round(croppedAreaPixels.width),
        cover_crop_height: Math.round(croppedAreaPixels.height),
      });
      setEditDialog((prev) => (prev ? { ...prev, ...{
        cover_crop_x: Math.round(croppedAreaPixels.x),
        cover_crop_y: Math.round(croppedAreaPixels.y),
        cover_crop_width: Math.round(croppedAreaPixels.width),
        cover_crop_height: Math.round(croppedAreaPixels.height),
      }} : prev));
      await fetchProjects();
      setIsCropModalOpen(false);
    } catch (error: any) {
      console.error('Error saving crop:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to save crop';
      alert(errorMessage);
    }
  };

  const deleteProjectCover = async () => {
    if (!editDialog) return;
    try {
      await axios.delete(`${API_URL}/api/projects/${editDialog.projectId}/cover`);
      setEditDialog((prev) => (prev ? {
        ...prev,
        cover_image: null,
        cover_original_width: null,
        cover_original_height: null,
        cover_crop_x: null,
        cover_crop_y: null,
        cover_crop_width: null,
        cover_crop_height: null,
      } : prev));
      setEditPhotoFile(null);
      setEditPhotoPreviewUrl(null);
      setPendingCoverCrop(null);
      setIsCropModalOpen(false);
      await fetchProjects();
    } catch (err: any) {
      console.error('Error deleting cover:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to delete cover';
      alert(errorMessage);
    }
  };

  const uploadProjectPhoto = async () => {
    if (!editDialog || !editPhotoFile) return;

    const formData = new FormData();
    formData.append('file', editPhotoFile);

    try {
      setIsUploadingPhoto(true);
      const response = await axios.post(`${API_URL}/api/import?project_id=${editDialog.projectId}&set_cover=true`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setEditPhotoFile(null);
      const newCoverPath = response?.data?.cover_image || response?.data?.filepath || response?.data?.content || null;
      const newCoverWidth = response?.data?.width ?? null;
      const newCoverHeight = response?.data?.height ?? null;
      if (newCoverPath) {
        setEditDialog((prev) => (prev ? {
          ...prev,
          cover_image: newCoverPath,
          cover_original_width: newCoverWidth,
          cover_original_height: newCoverHeight,
          cover_crop_x: newCoverWidth !== null ? 0 : prev.cover_crop_x,
          cover_crop_y: newCoverHeight !== null ? 0 : prev.cover_crop_y,
          cover_crop_width: newCoverWidth ?? prev.cover_crop_width,
          cover_crop_height: newCoverHeight ?? prev.cover_crop_height,
        } : prev));
        setEditPhotoPreviewUrl(getCoverUrl(newCoverPath));
      }
      if (pendingCoverCrop) {
        await axios.put(`${API_URL}/api/projects/${editDialog.projectId}/cover-crop`, {
          cover_crop_x: Math.round(pendingCoverCrop.x),
          cover_crop_y: Math.round(pendingCoverCrop.y),
          cover_crop_width: Math.round(pendingCoverCrop.width),
          cover_crop_height: Math.round(pendingCoverCrop.height),
        });
        setEditDialog((prev) => (prev ? { ...prev, ...{
          cover_crop_x: Math.round(pendingCoverCrop.x),
          cover_crop_y: Math.round(pendingCoverCrop.y),
          cover_crop_width: Math.round(pendingCoverCrop.width),
          cover_crop_height: Math.round(pendingCoverCrop.height),
        }} : prev));
        setPendingCoverCrop(null);
      }
      await fetchProjects();
    } catch (err: any) {
      console.error('Error uploading photo:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to upload photo';
      alert(errorMessage);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const createNewProject = async () => {
    const projectName = newProjectName.trim() || `Project ${Date.now()}`;
    
    try {
      const response = await axios.post(`${API_URL}/api/projects/`, {
        name: projectName,
        description: newProjectDesc || 'New project',
        due_date: newProjectDueDate ? new Date(newProjectDueDate).toISOString() : null,
      });
      onCreateDialogChange(false);
      onNewProjectNameChange('');
      setNewProjectDesc('');
      setNewProjectDueDate('');
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

  const togglePinProject = async (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await axios.post(`${API_URL}/api/projects/${projectId}/pin`);
      await fetchProjects();
    } catch (err: any) {
      console.error('Error toggling pin:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to toggle pin';
      alert(`Error: ${errorMessage}`);
    }
  };

  const getFilteredProjects = () => {
    switch (filterBy) {
      case 'pinned':
        return projects.filter(p => p.is_pinned);
      case 'recent':
        return [...projects].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case 'due-soon':
        return projects
          .filter(p => p.due_date)
          .sort((a, b) => {
            const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
            const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
            return dateA - dateB;
          });
      case 'all':
      default:
        return projects;
    }
  };

  const filteredProjects = getFilteredProjects();
  
  // Notify parent of first filtered project whenever it changes
  useEffect(() => {
    onFirstFilteredProjectChange(filteredProjects[0]?.id || null);
  }, [filteredProjects, onFirstFilteredProjectChange]);
  
  const editCoverStyle = editDialog
    ? getCoverCropStyle(
        editDialog.cover_image,
        editDialog.cover_original_width,
        editDialog.cover_original_height,
        editDialog.cover_crop_x,
        editDialog.cover_crop_y,
        editDialog.cover_crop_width,
        editDialog.cover_crop_height
      )
    : null;

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
            setNewProjectDueDate('');
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
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Due Date (optional)</label>
                <input
                  type="date"
                  value={newProjectDueDate}
                  onChange={(e) => {
                    setNewProjectDueDate(e.target.value);
                  }}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-600"
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
                    setNewProjectDueDate('');
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
          <>
            {/* Filter and Size Controls */}
            <div className="mb-6 flex items-center justify-between">
              {/* Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-medium hover:border-blue-600 transition-colors cursor-pointer"
                >
                  {filterBy === 'all' ? 'All Projects' : filterBy === 'pinned' ? 'Pinned' : filterBy === 'recent' ? 'Recently Created' : 'Due date'}
                </button>
                
                {filterDropdownOpen && (
                  <div ref={filterDropdownRef} className="absolute top-full left-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20">
                    <button
                      onClick={() => {
                        setFilterBy('all');
                        setFilterDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white text-sm first:rounded-t-lg"
                    >
                      All Projects
                    </button>
                    <button
                      onClick={() => {
                        setFilterBy('pinned');
                        setFilterDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white text-sm border-t border-gray-700"
                    >
                      Pinned
                    </button>
                    <button
                      onClick={() => {
                        setFilterBy('recent');
                        setFilterDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white text-sm border-t border-gray-700"
                    >
                      Recently Created
                    </button>
                    <button
                      onClick={() => {
                        setFilterBy('due-soon');
                        setFilterDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white text-sm border-t border-gray-700 last:rounded-b-lg"
                    >
                      Due date
                    </button>
                  </div>
                )}
              </div>

              {/* Grid Size Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setGridSizeDropdownOpen(!gridSizeDropdownOpen)}
                  className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-white hover:border-blue-600 transition-colors cursor-pointer"
                  title="Grid size"
                >
                  {gridSize === 'small' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4v4H4V6zm6 0h4v4h-4V6zm6 0h4v4h-4V6zM4 12h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 18h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
                    </svg>
                  ) : gridSize === 'medium' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h6v6H4V5zm10 0h6v6h-6V5zM4 15h6v6H4v-6zm10 0h6v6h-6v-6z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16v6H4V5zm0 10h16v6H4v-6z" />
                    </svg>
                  )}
                </button>
                
                {gridSizeDropdownOpen && (
                  <div ref={gridSizeDropdownRef} className="absolute top-full right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20 p-1">
                    <button
                      onClick={() => {
                        setGridSize('small');
                        setGridSizeDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-center p-2 rounded transition-colors ${gridSize === 'small' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                      title="Small grid"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4v4H4V6zm6 0h4v4h-4V6zm6 0h4v4h-4V6zM4 12h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 18h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setGridSize('medium');
                        setGridSizeDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-center p-2 rounded transition-colors ${gridSize === 'medium' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                      title="Medium grid"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h6v6H4V5zm10 0h6v6h-6V5zM4 15h6v6H4v-6zm10 0h6v6h-6v-6z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setGridSize('large');
                        setGridSizeDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-center p-2 rounded transition-colors ${gridSize === 'large' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                      title="Large grid"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h16v6H4V5zm0 10h16v6H4v-6z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Projects Grid */}
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No projects match this filter</p>
              </div>
            ) : (
            <div className={`grid gap-6 ${
              gridSize === 'small' 
                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' 
                : gridSize === 'medium'
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3'
            }`}>
              {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-gray-900 rounded-lg border border-gray-800 hover:border-blue-600 transition-all group overflow-hidden relative"
              >
                <div 
                  onClick={() => handleOpenProject(project.id)}
                  className="cursor-pointer"
                >
                  <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden relative">
                    {project.cover_image ? (
                      (() => {
                        const coverStyle = getCoverCropStyle(
                          project.cover_image,
                          project.cover_original_width,
                          project.cover_original_height,
                          project.cover_crop_x,
                          project.cover_crop_y,
                          project.cover_crop_width,
                          project.cover_crop_height
                        );
                        return coverStyle ? (
                          <img
                            src={getCoverUrl(project.cover_image) || ''}
                            alt={`${project.name} cover`}
                            style={coverStyle}
                          />
                        ) : (
                          <img
                            src={getCoverUrl(project.cover_image) || ''}
                            alt={`${project.name} cover`}
                            className="h-full w-full object-cover"
                          />
                        );
                      })()
                    ) : (
                      <svg className={`text-gray-700 group-hover:text-gray-600 transition-colors ${
                        gridSize === 'small' ? 'w-8 h-8' : gridSize === 'medium' ? 'w-12 h-12' : 'w-16 h-16'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  <div className={gridSize === 'small' ? 'p-2' : gridSize === 'medium' ? 'p-3' : 'p-4'}>
                    <h3 className={`font-semibold text-white mb-1 truncate ${
                      gridSize === 'small' ? 'text-sm' : gridSize === 'medium' ? 'text-base' : 'text-lg'
                    }`}>
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className={`text-gray-500 truncate ${
                        gridSize === 'small' ? 'text-xs mb-1' : gridSize === 'medium' ? 'text-sm mb-1.5' : 'text-sm mb-2'
                      }`}>
                        {project.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className={`flex flex-col justify-end ${
                        gridSize === 'small' ? 'h-8' : gridSize === 'medium' ? 'h-10' : 'h-14'
                      }`}>
                        <span className={`text-gray-600 ${
                          gridSize === 'small' ? 'text-[10px]' : 'text-xs'
                        }`}>{project.layer_count} images</span>
                      </div>
                      <div className={`flex flex-col items-end justify-end ${
                        gridSize === 'small' ? 'h-8' : gridSize === 'medium' ? 'h-10' : 'h-14'
                      }`}>
                        {project.due_date && (
                          <p className={`font-semibold text-blue-400 ${
                            gridSize === 'small' ? 'text-[10px]' : gridSize === 'medium' ? 'text-xs' : 'text-sm'
                          }`}>
                            Due: {new Date(project.due_date).toLocaleDateString()}
                          </p>
                        )}
                        <span className={`text-gray-600 ${
                          gridSize === 'small' ? 'text-[10px]' : 'text-xs'
                        }`}>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Edit Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(project);
                  }}
                  className={`absolute top-2 left-2 bg-blue-600 hover:bg-blue-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                    gridSize === 'small' ? 'p-1' : 'p-2'
                  }`}
                  title="Edit project"
                >
                  <svg className={gridSize === 'small' ? 'w-3 h-3 text-white' : 'w-4 h-4 text-white'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                {/* Pin Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePinProject(project.id, e);
                  }}
                  className={`absolute left-2 bg-blue-600 hover:bg-blue-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                    gridSize === 'small' ? 'top-8 p-1' : 'top-14 p-2'
                  }`}
                  title={project.is_pinned ? "Unpin project" : "Pin project"}
                >
                  <svg className={gridSize === 'small' ? 'w-3 h-3 text-white' : 'w-4 h-4 text-white'} fill={project.is_pinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 19V5z" />
                  </svg>
                </button>
                
                {/* Delete Button */}
                <button
                  onClick={(e) => deleteProject(project.id, project.name, e)}
                  className={`absolute top-2 right-2 bg-red-600 hover:bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
                    gridSize === 'small' ? 'p-1' : 'p-2'
                  }`}
                  title="Delete project"
                >
                  <svg className={gridSize === 'small' ? 'w-3 h-3 text-white' : 'w-4 h-4 text-white'} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Edit Project Dialog */}
      {editDialog && editDialog.show && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          onClick={() => {
            setEditDialog(null);
            setEditPhotoFile(null);
            setEditPhotoPreviewUrl(null);
            setPendingCoverCrop(null);
            setIsCropModalOpen(false);
          }}
        >
          <div
            className="bg-gray-900 rounded-lg border border-gray-800 p-6 w-96 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold text-white mb-4">Edit Project</h2>
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <label htmlFor="project-photo-input" className="block cursor-pointer">
                  <div className="h-24 w-24 rounded-xl bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center relative">
                    {editPhotoPreviewUrl ? (
                      editCoverStyle ? (
                        <img
                          src={editPhotoPreviewUrl}
                          alt="Project photo preview"
                          style={editCoverStyle}
                        />
                      ) : (
                        <img
                          src={editPhotoPreviewUrl}
                          alt="Project photo preview"
                          className="h-full w-full object-cover"
                        />
                      )
                    ) : (
                      <span className="text-gray-500 text-xs">Add photo</span>
                    )}
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCropModalOpen(true)}
                  disabled={!editPhotoPreviewUrl}
                  className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-white hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Crop photo"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 3v3m0 0h3m-3 0l4 4m9-4v3m0 0h-3m3 0l-4 4M3 6h3m0 0v3m0-3l4 4m9 9h-3m0 0v-3m0 3l-4-4" />
                  </svg>
                </button>
              </div>
              <input
                id="project-photo-input"
                type="file"
                accept="image/*"
                onChange={(e) => onPhotoFileChange(e.target.files?.[0] || null)}
                className="hidden"
              />
              <span className="mt-2 text-xs text-gray-500">Click photo to choose</span>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Project Name</label>
                <input
                  type="text"
                  value={editDialog.name}
                  onChange={(e) => setEditDialog({ ...editDialog, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-600"
                  placeholder="Project name..."
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description (optional)</label>
                <textarea
                  value={editDialog.description}
                  onChange={(e) => setEditDialog({ ...editDialog, description: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-600 resize-none"
                  placeholder="Project description..."
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Due Date (optional)</label>
                <input
                  type="date"
                  value={editDialog.due_date}
                  onChange={(e) => setEditDialog({ ...editDialog, due_date: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <button
                  onClick={uploadProjectPhoto}
                  disabled={!editPhotoFile || isUploadingPhoto}
                  className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploadingPhoto ? 'Uploading...' : 'Add Photo to Project'}
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={updateProject}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditDialog(null);
                    setEditPhotoFile(null);
                    setEditPhotoPreviewUrl(null);
                    setPendingCoverCrop(null);
                    setIsCropModalOpen(false);
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

      {isCropModalOpen && editPhotoPreviewUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center"
          onClick={() => setIsCropModalOpen(false)}
        >
          <div
            className="bg-gray-900 rounded-lg border border-gray-800 p-6 w-[420px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Crop Photo</h3>
            <div className="relative h-64 w-full bg-gray-950 rounded-lg overflow-hidden border border-gray-800">
              <Cropper
                image={editPhotoPreviewUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="mt-4">
              <label className="block text-xs text-gray-400 mb-2">Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={applyCrop}
                className="flex-1 px-4 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition-colors"
              >
                Crop
              </button>
              <button
                onClick={deleteProjectCover}
                className="flex-1 px-4 py-1 bg-red-600 hover:bg-red-500 rounded text-white font-medium transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setIsCropModalOpen(false)}
                className="flex-1 px-4 py-1 bg-gray-800 hover:bg-gray-700 rounded text-white font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryPage;