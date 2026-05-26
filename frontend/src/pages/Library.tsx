/**
 * Library - Lightroom-style grid view for image management
 * Browse projects and images
 */
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import ExportPage from '../components/panels/ExportPage.js';

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

type GridSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'list';

const SIZE_CONFIG: Record<GridSize, {
  gridCols: string; gap: string; pad: string;
  title: string; desc: string; statsH: string; meta: string;
  svg: string; btn: string; icon: string; pinTop: string;
}> = {
  xs:   { gridCols: 'grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10', gap: 'gap-2',   pad: 'p-1',       title: 'text-[10px]', desc: 'text-[9px] mb-0',   statsH: 'h-4',    meta: 'text-[9px]',  svg: 'w-5 h-5',   btn: 'p-0.5', icon: 'w-2.5 h-2.5', pinTop: 'top-6 p-0.5' },
  sm:   { gridCols: 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7',  gap: 'gap-3',   pad: 'p-1.5',     title: 'text-xs',     desc: 'text-[10px] mb-0.5', statsH: 'h-6',  meta: 'text-[10px]', svg: 'w-7 h-7',   btn: 'p-1',   icon: 'w-3 h-3',    pinTop: 'top-8 p-1' },
  md:   { gridCols: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',  gap: 'gap-4',   pad: 'p-2.5',     title: 'text-sm',     desc: 'text-xs mb-1',       statsH: 'h-8',  meta: 'text-[10px]', svg: 'w-10 h-10', btn: 'p-1',   icon: 'w-3.5 h-3.5', pinTop: 'top-9 p-1' },
  lg:   { gridCols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',  gap: 'gap-5',   pad: 'p-3',       title: 'text-base',   desc: 'text-sm mb-1.5',     statsH: 'h-10', meta: 'text-xs',     svg: 'w-12 h-12', btn: 'p-2',   icon: 'w-4 h-4',    pinTop: 'top-12 p-2' },
  xl:   { gridCols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3',  gap: 'gap-6',   pad: 'p-4',       title: 'text-lg',     desc: 'text-sm mb-2',       statsH: 'h-14', meta: 'text-xs',     svg: 'w-16 h-16', btn: 'p-2',   icon: 'w-4 h-4',    pinTop: 'top-14 p-2' },
  list: { gridCols: 'grid-cols-1',                                               gap: 'gap-1.5', pad: 'px-3 py-2', title: 'text-sm',     desc: 'text-xs',            statsH: 'h-auto', meta: 'text-xs',   svg: 'w-8 h-8',   btn: 'p-1',   icon: 'w-3.5 h-3.5', pinTop: 'top-9 p-1' },
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
  const [filterBy, setFilterBy] = useState<'all' | 'pinned' | 'recent' | 'due-soon'>(
    () => (localStorage.getItem('library.filterBy') as 'all' | 'pinned' | 'recent' | 'due-soon') || 'all'
  );
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [gridSizeDropdownOpen, setGridSizeDropdownOpen] = useState(false);
  const gridSizeDropdownRef = useRef<HTMLDivElement>(null);
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreviewUrl, setEditPhotoPreviewUrl] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isNewCropModalOpen, setIsNewCropModalOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [pendingCoverCrop, setPendingCoverCrop] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [newPendingCoverCrop, setNewPendingCoverCrop] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [gridSize, setGridSize] = useState<GridSize>(
    () => (localStorage.getItem('library.gridSize') as GridSize) || 'md'
  );
  const [exportProjectId, setExportProjectId] = useState<number | null>(null);
  const [newProjectTooltip, setNewProjectTooltip] = useState(false);
  const newProjectTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filterTooltip, setFilterTooltip] = useState(false);
  const filterTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [gridSizeTooltip, setGridSizeTooltip] = useState(false);
  const gridSizeTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cropTooltip, setCropTooltip] = useState(false);
  const cropTooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const newPhotoInputRef = useRef<HTMLInputElement>(null);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreviewUrl, setNewPhotoPreviewUrl] = useState<string | null>(null);
  const [cropImgNat, setCropImgNat] = useState<{ w: number; h: number } | null>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const cropContainerDims = useRef({ w: 372, h: 256 });
  const cropDragState = useRef<{ startMouseX: number; startMouseY: number; startBoxLeft: number; startBoxTop: number } | null>(null);
  const cropZoomRef = useRef(1);
  const cropStateRef = useRef({ crop: { x: 0.5, y: 0.5 }, imgNat: null as { w: number; h: number } | null });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    localStorage.setItem('library.filterBy', filterBy);
  }, [filterBy]);

  useEffect(() => {
    localStorage.setItem('library.gridSize', gridSize);
  }, [gridSize]);

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

  // Initialise custom crop editor when either crop modal opens
  useEffect(() => {
    const isOpen = isCropModalOpen || isNewCropModalOpen;
    const previewUrl = isCropModalOpen ? editPhotoPreviewUrl : newPhotoPreviewUrl;
    if (!isOpen || !previewUrl) return;
    setCrop({ x: 0.5, y: 0.5 });
    setZoom(1);
    cropZoomRef.current = 1;
    cropStateRef.current = { crop: { x: 0.5, y: 0.5 }, imgNat: null };
    setCropImgNat(null);
    const img = new Image();
    img.onload = () => {
      if (cropContainerRef.current) {
        cropContainerDims.current = {
          w: cropContainerRef.current.clientWidth,
          h: cropContainerRef.current.clientHeight,
        };
      }
      const { w: cw, h: ch } = cropContainerDims.current;
      const sc = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
      const rW = img.naturalWidth * sc; const rH = img.naturalHeight * sc;
      const iL = (cw - rW) / 2; const iT = (ch - rH) / 2;
      const bP = Math.min(rW, rH);
      const bL = iL + (rW - bP) / 2; const bT = iT + (rH - bP) / 2;
      setCropImgNat({ w: img.naturalWidth, h: img.naturalHeight });
      cropStateRef.current.imgNat = { w: img.naturalWidth, h: img.naturalHeight };
      setCroppedAreaPixels({ x: Math.round((bL - iL) / sc), y: Math.round((bT - iT) / sc), width: Math.round(bP / sc), height: Math.round(bP / sc) });
    };
    img.src = previewUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCropModalOpen, isNewCropModalOpen, editPhotoPreviewUrl, newPhotoPreviewUrl]);

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

  const applyNewCrop = () => {
    if (!croppedAreaPixels) return;
    setNewPendingCoverCrop(croppedAreaPixels);
    setIsNewCropModalOpen(false);
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
      const newProjectId = response.data.id;

      // Upload cover photo if one was selected
      if (newPhotoFile && newProjectId) {
        const formData = new FormData();
        formData.append('file', newPhotoFile);
        await axios.post(`${API_URL}/api/import?project_id=${newProjectId}&set_cover=true`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        // Apply pending crop if user cropped the photo
        if (newPendingCoverCrop) {
          await axios.put(`${API_URL}/api/projects/${newProjectId}/cover-crop`, {
            cover_crop_x: Math.round(newPendingCoverCrop.x),
            cover_crop_y: Math.round(newPendingCoverCrop.y),
            cover_crop_width: Math.round(newPendingCoverCrop.width),
            cover_crop_height: Math.round(newPendingCoverCrop.height),
          });
        }
      }

      onCreateDialogChange(false);
      onNewProjectNameChange('');
      setNewProjectDesc('');
      setNewProjectDueDate('');
      setNewPhotoFile(null);
      setNewPhotoPreviewUrl(null);
      setNewPendingCoverCrop(null);
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
            setNewPhotoFile(null);
            setNewPhotoPreviewUrl(null);
            setNewPendingCoverCrop(null);
            setIsNewCropModalOpen(false);
          }}
        >
          <div 
            className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4">Create New Project</h2>

            {/* Cover photo picker */}
            <div className="flex flex-col items-center mb-6">
              <div
                className="h-24 w-24 rounded-xl bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center cursor-pointer group/img relative"
                onClick={() => {
                  if (newPhotoPreviewUrl) { setIsNewCropModalOpen(true); }
                  else { newPhotoInputRef.current?.click(); }
                }}
              >
                {newPhotoPreviewUrl ? (
                  <img src={newPhotoPreviewUrl} alt="Cover preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-gray-500">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs">Add photo</span>
                  </div>
                )}
                {newPhotoPreviewUrl && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
              </div>
              {newPhotoPreviewUrl && (
                <div className="mt-2 flex gap-3">
                  <button
                    onClick={() => setIsNewCropModalOpen(true)}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    Edit crop
                  </button>
                  <span className="text-gray-700">·</span>
                  <button
                    onClick={() => { setNewPhotoFile(null); setNewPhotoPreviewUrl(null); setNewPendingCoverCrop(null); }}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}
              <input
                ref={newPhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setNewPhotoFile(file);
                  setNewPhotoPreviewUrl(file ? URL.createObjectURL(file) : null);
                  setNewPendingCoverCrop(null);
                  e.target.value = '';
                }}
              />
            </div>

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
                    setNewPhotoFile(null);
                    setNewPhotoPreviewUrl(null);
                    setNewPendingCoverCrop(null);
                    setIsNewCropModalOpen(false);
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
                  className={`p-2 bg-gray-800 border rounded-lg text-white hover:border-blue-600 transition-colors cursor-pointer ${filterBy !== 'all' ? 'border-blue-600 text-blue-400' : 'border-gray-700'}`}
                  onMouseEnter={() => {
                    filterTooltipTimer.current = setTimeout(() => setFilterTooltip(true), 2000);
                  }}
                  onMouseLeave={() => {
                    if (filterTooltipTimer.current) clearTimeout(filterTooltipTimer.current);
                    setFilterTooltip(false);
                  }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 8h12M9 12h6M11 16h2" />
                  </svg>
                </button>
                {filterTooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none">
                    Filter
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
                  </div>
                )}
                
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

              {/* Right side controls */}
              <div className="flex items-center gap-2">
                {/* New Project Button */}
                <div className="relative">
                  <button
                    onClick={() => onCreateDialogChange(true)}
                    className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-white hover:border-blue-600 transition-colors cursor-pointer"
                    onMouseEnter={() => {
                      newProjectTooltipTimer.current = setTimeout(() => setNewProjectTooltip(true), 2000);
                    }}
                    onMouseLeave={() => {
                      if (newProjectTooltipTimer.current) clearTimeout(newProjectTooltipTimer.current);
                      setNewProjectTooltip(false);
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  {newProjectTooltip && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none">
                      New Project
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
                    </div>
                  )}
                </div>

                {/* Grid Size Dropdown */}
                <div className="relative" ref={gridSizeDropdownRef}>
                <button
                  onClick={() => setGridSizeDropdownOpen(!gridSizeDropdownOpen)}
                  className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-white hover:border-blue-600 transition-colors cursor-pointer"
                  onMouseEnter={() => {
                    gridSizeTooltipTimer.current = setTimeout(() => setGridSizeTooltip(true), 2000);
                  }}
                  onMouseLeave={() => {
                    if (gridSizeTooltipTimer.current) clearTimeout(gridSizeTooltipTimer.current);
                    setGridSizeTooltip(false);
                  }}
                >
                  {gridSize === 'xs' ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="2" y="2" width="4" height="4"/><rect x="8" y="2" width="4" height="4"/><rect x="14" y="2" width="4" height="4"/><rect x="20" y="2" width="4" height="4"/>
                      <rect x="2" y="8" width="4" height="4"/><rect x="8" y="8" width="4" height="4"/><rect x="14" y="8" width="4" height="4"/><rect x="20" y="8" width="4" height="4"/>
                      <rect x="2" y="14" width="4" height="4"/><rect x="8" y="14" width="4" height="4"/><rect x="14" y="14" width="4" height="4"/><rect x="20" y="14" width="4" height="4"/>
                    </svg>
                  ) : gridSize === 'sm' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4v4H4V6zm6 0h4v4h-4V6zm6 0h4v4h-4V6zM4 12h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 18h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
                    </svg>
                  ) : gridSize === 'md' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h6v6H4V5zm10 0h6v6h-6V5zM4 15h6v6H4v-6zm10 0h6v6h-6v-6z" />
                    </svg>
                  ) : gridSize === 'lg' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h8v8H3V5zm10 0h8v8h-8V5zM3 15h8v6H3v-6zm10 0h8v6h-8v-6z" />
                    </svg>
                  ) : gridSize === 'xl' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v10H4V4zm0 12h16v5H4v-5z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h2v2H4V6zm4 1h12M4 12h2v2H4v-2zm4 1h12M4 18h2v2H4v-2zm4 1h12" />
                    </svg>
                  )}
                </button>

                {gridSizeTooltip && !gridSizeDropdownOpen && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-xs font-medium whitespace-nowrap shadow-lg pointer-events-none">
                    Grid Size
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-700" />
                  </div>
                )}
                {gridSizeDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-20 p-1 w-36">
                    {([
                      { size: 'xs',   label: 'Extra Small', icon: (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <rect x="2" y="2" width="4" height="4"/><rect x="8" y="2" width="4" height="4"/><rect x="14" y="2" width="4" height="4"/><rect x="20" y="2" width="4" height="4"/>
                          <rect x="2" y="8" width="4" height="4"/><rect x="8" y="8" width="4" height="4"/><rect x="14" y="8" width="4" height="4"/><rect x="20" y="8" width="4" height="4"/>
                          <rect x="2" y="14" width="4" height="4"/><rect x="8" y="14" width="4" height="4"/><rect x="14" y="14" width="4" height="4"/><rect x="20" y="14" width="4" height="4"/>
                        </svg>
                      )},
                      { size: 'sm',   label: 'Small', icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h4v4H4V6zm6 0h4v4h-4V6zm6 0h4v4h-4V6zM4 12h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 18h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
                        </svg>
                      )},
                      { size: 'md',   label: 'Medium', icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5h6v6H4V5zm10 0h6v6h-6V5zM4 15h6v6H4v-6zm10 0h6v6h-6v-6z" />
                        </svg>
                      )},
                      { size: 'lg',   label: 'Large', icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h8v8H3V5zm10 0h8v8h-8V5zM3 15h8v6H3v-6zm10 0h8v6h-8v-6z" />
                        </svg>
                      )},
                      { size: 'xl',   label: 'Extra Large', icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h16v10H4V4zm0 12h16v5H4v-5z" />
                        </svg>
                      )},
                      { size: 'list', label: 'List', icon: (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h2v2H4V6zm4 1h12M4 12h2v2H4v-2zm4 1h12M4 18h2v2H4v-2zm4 1h12" />
                        </svg>
                      )},
                    ] as { size: GridSize; label: string; icon: React.ReactNode }[]).map(({ size, label, icon }) => (
                      <button
                        key={size}
                        onClick={() => { setGridSize(size); setGridSizeDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded text-sm transition-colors ${gridSize === size ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              </div>
            </div>

            {/* Projects Grid */}
            {filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No projects match this filter</p>
              </div>
            ) : (
            <div className={`grid ${SIZE_CONFIG[gridSize].gap} ${SIZE_CONFIG[gridSize].gridCols}`}>
              {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-gray-900 rounded-lg border border-gray-800 hover:border-blue-600 transition-all group overflow-hidden relative"
              >
                <div 
                  onClick={() => handleOpenProject(project.id)}
                  className={`cursor-pointer${gridSize === 'list' ? ' flex items-stretch' : ''}`}
                >
                  <div className={gridSize === 'list'
                    ? 'w-28 h-18 flex-shrink-0 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden relative'
                    : 'aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center overflow-hidden relative'
                  }>
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
                      <svg className={`text-gray-700 group-hover:text-gray-600 transition-colors ${SIZE_CONFIG[gridSize].svg}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    {/* Export Button — bottom-left of image */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExportProjectId(project.id);
                      }}
                      className={`absolute bottom-2 left-2 bg-blue-600 hover:bg-blue-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 ${SIZE_CONFIG[gridSize].btn}`}
                      title="Export project photos"
                    >
                      <svg className={`${SIZE_CONFIG[gridSize].icon} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                  <div className={`${gridSize === 'list' ? 'flex-1 min-w-0 flex flex-col justify-center ' : ''}${SIZE_CONFIG[gridSize].pad}`}>
                    <h3 className={`font-semibold text-white mb-1 truncate ${SIZE_CONFIG[gridSize].title}`}>
                      {project.name}
                    </h3>
                    {project.description && gridSize !== 'xs' && (
                      <p className={`text-gray-500 truncate ${SIZE_CONFIG[gridSize].desc}`}>
                        {project.description}
                      </p>
                    )}
                    {gridSize !== 'xs' && (
                    <div className={`flex items-center justify-between ${gridSize === 'list' ? 'mt-1 gap-4' : ''}`}>
                      <div className={`flex flex-col justify-end ${SIZE_CONFIG[gridSize].statsH}`}>
                        <span className={`text-gray-600 ${SIZE_CONFIG[gridSize].meta}`}>{project.layer_count} images</span>
                      </div>
                      <div className={`flex flex-col items-end justify-end ${SIZE_CONFIG[gridSize].statsH}`}>
                        {project.due_date && (
                          <p className={`font-semibold text-blue-400 ${SIZE_CONFIG[gridSize].meta}`}>
                            Due: {new Date(project.due_date).toLocaleDateString()}
                          </p>
                        )}
                        <span className={`text-gray-600 ${SIZE_CONFIG[gridSize].meta}`}>Created: {new Date(project.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    )}
                  </div>
                </div>
                
                {/* Edit Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDialog(project);
                  }}
                  className={`absolute top-2 left-2 bg-blue-600 hover:bg-blue-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 ${SIZE_CONFIG[gridSize].btn}`}
                  title="Edit project"
                >
                  <svg className={`${SIZE_CONFIG[gridSize].icon} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>

                {/* Pin Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePinProject(project.id, e);
                  }}
                  className={`absolute left-2 bg-blue-600 hover:bg-blue-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 ${SIZE_CONFIG[gridSize].pinTop}`}
                  title={project.is_pinned ? "Unpin project" : "Pin project"}
                >
                  <svg className={`${SIZE_CONFIG[gridSize].icon} text-white`} fill={project.is_pinned ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 19V5z" />
                  </svg>
                </button>
                
                {/* Delete Button */}
                <button
                  onClick={(e) => deleteProject(project.id, project.name, e)}
                  className={`absolute top-2 right-2 bg-red-600 hover:bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 ${SIZE_CONFIG[gridSize].btn}`}
                  title="Delete project"
                >
                  <svg className={`${SIZE_CONFIG[gridSize].icon} text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      {exportProjectId !== null && (
        <ExportPage
          projectId={exportProjectId}
          onClose={() => setExportProjectId(null)}
        />
      )}

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
                {/* Image — click to crop if photo exists, or open file picker if not */}
                <div
                  className="h-24 w-24 rounded-xl bg-gray-800 border border-gray-700 overflow-hidden flex items-center justify-center relative cursor-pointer group/img"
                  onClick={() => {
                    if (editPhotoPreviewUrl) {
                      setIsCropModalOpen(true);
                    } else {
                      photoInputRef.current?.click();
                    }
                  }}
                >
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
                  {/* Hover overlay */}
                  {editPhotoPreviewUrl && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                      <svg className="w-6 h-6 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
              <input
                ref={photoInputRef}
                id="project-photo-input"
                type="file"
                accept="image/*"
                onChange={(e) => onPhotoFileChange(e.target.files?.[0] || null)}
                className="hidden"
              />
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

      {isNewCropModalOpen && newPhotoPreviewUrl && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex items-center justify-center"
          onClick={() => setIsNewCropModalOpen(false)}
        >
          <div
            className="bg-gray-900 rounded-lg border border-gray-800 p-6 w-[420px] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center mb-4">
              <button
                onClick={() => setIsNewCropModalOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors mr-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-lg font-semibold text-white">Crop Photo</h3>
              <button
                type="button"
                onClick={() => { setIsNewCropModalOpen(false); newPhotoInputRef.current?.click(); }}
                className="ml-auto p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                title="Upload different photo"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>
            </div>
            <div
              ref={cropContainerRef}
              className="relative h-64 w-full bg-gray-950 rounded-lg overflow-hidden border border-gray-800 select-none"
              onWheel={(e) => {
                e.preventDefault();
                const imgNat = cropStateRef.current.imgNat;
                if (!imgNat) return;
                const newZoom = Math.min(5, Math.max(1, cropZoomRef.current - e.deltaY * 0.001));
                cropZoomRef.current = newZoom;
                setZoom(newZoom);
                const { w: cw, h: ch } = cropContainerDims.current;
                const sc = Math.min(cw / imgNat.w, ch / imgNat.h);
                const rW = imgNat.w * sc; const rH = imgNat.h * sc;
                const iL = (cw - rW) / 2; const iT = (ch - rH) / 2;
                const bP = Math.min(rW, rH) / newZoom;
                const cx = cropStateRef.current.crop.x;
                const cy = cropStateRef.current.crop.y;
                const bCX = iL + cx * rW; const bCY = iT + cy * rH;
                const bL = Math.max(iL, Math.min(iL + rW - bP, bCX - bP / 2));
                const bT = Math.max(iT, Math.min(iT + rH - bP, bCY - bP / 2));
                setCroppedAreaPixels({ x: Math.round((bL - iL) / sc), y: Math.round((bT - iT) / sc), width: Math.round(bP / sc), height: Math.round(bP / sc) });
              }}
            >
              <img
                src={newPhotoPreviewUrl}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                draggable={false}
              />
              {cropImgNat && (() => {
                const { w: cw, h: ch } = cropContainerDims.current;
                const sc = Math.min(cw / cropImgNat.w, ch / cropImgNat.h);
                const rW = cropImgNat.w * sc; const rH = cropImgNat.h * sc;
                const iL = (cw - rW) / 2; const iT = (ch - rH) / 2;
                const bP = Math.min(rW, rH) / zoom;
                const bCX = iL + crop.x * rW; const bCY = iT + crop.y * rH;
                const bL = Math.max(iL, Math.min(iL + rW - bP, bCX - bP / 2));
                const bT = Math.max(iT, Math.min(iT + rH - bP, bCY - bP / 2));
                return (
                  <div
                    className="absolute cursor-move border-2 border-white"
                    style={{ left: bL, top: bT, width: bP, height: bP, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      cropDragState.current = { startMouseX: e.clientX, startMouseY: e.clientY, startBoxLeft: bL, startBoxTop: bT };
                    }}
                    onPointerMove={(e) => {
                      if (!cropDragState.current || !cropImgNat) return;
                      const { w: ncw, h: nch } = cropContainerDims.current;
                      const ns = Math.min(ncw / cropImgNat.w, nch / cropImgNat.h);
                      const nRW = cropImgNat.w * ns; const nRH = cropImgNat.h * ns;
                      const nIL = (ncw - nRW) / 2; const nIT = (nch - nRH) / 2;
                      const nBP = Math.min(nRW, nRH) / zoom;
                      const dx = e.clientX - cropDragState.current.startMouseX;
                      const dy = e.clientY - cropDragState.current.startMouseY;
                      const nl = Math.max(nIL, Math.min(nIL + nRW - nBP, cropDragState.current.startBoxLeft + dx));
                      const nt = Math.max(nIT, Math.min(nIT + nRH - nBP, cropDragState.current.startBoxTop + dy));
                      const newCrop = { x: (nl + nBP / 2 - nIL) / nRW, y: (nt + nBP / 2 - nIT) / nRH };
                      setCrop(newCrop);
                      cropStateRef.current.crop = newCrop;
                      setCroppedAreaPixels({ x: Math.round((nl - nIL) / ns), y: Math.round((nt - nIT) / ns), width: Math.round(nBP / ns), height: Math.round(nBP / ns) });
                    }}
                    onPointerUp={() => { cropDragState.current = null; }}
                  >
                    {[33.33, 66.67].map((pct) => (
                      <React.Fragment key={pct}>
                        <div className="absolute left-0 right-0 border-t border-white/30" style={{ top: `${pct}%` }} />
                        <div className="absolute top-0 bottom-0 border-l border-white/30" style={{ left: `${pct}%` }} />
                      </React.Fragment>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="mt-4">
              <label className="block text-xs text-gray-400 mb-2">Zoom</label>
              <input
                type="range"
                min={1}
                max={5}
                step={0.01}
                value={zoom}
                onChange={(e) => {
                  const newZoom = Number(e.target.value);
                  setZoom(newZoom);
                  cropZoomRef.current = newZoom;
                  if (cropImgNat) {
                    const { w: cw, h: ch } = cropContainerDims.current;
                    const sc = Math.min(cw / cropImgNat.w, ch / cropImgNat.h);
                    const rW = cropImgNat.w * sc; const rH = cropImgNat.h * sc;
                    const iL = (cw - rW) / 2; const iT = (ch - rH) / 2;
                    const bP = Math.min(rW, rH) / newZoom;
                    const bCX = iL + crop.x * rW; const bCY = iT + crop.y * rH;
                    const bL = Math.max(iL, Math.min(iL + rW - bP, bCX - bP / 2));
                    const bT = Math.max(iT, Math.min(iT + rH - bP, bCY - bP / 2));
                    setCroppedAreaPixels({ x: Math.round((bL - iL) / sc), y: Math.round((bT - iT) / sc), width: Math.round(bP / sc), height: Math.round(bP / sc) });
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-full"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={applyNewCrop}
                className="flex-1 px-4 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition-colors"
              >
                Save
              </button>
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
            <div className="flex items-center mb-4">
              <button
                onClick={() => setIsCropModalOpen(false)}
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors mr-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="text-lg font-semibold text-white">Crop Photo</h3>
              <button
                type="button"
                onClick={() => { setIsCropModalOpen(false); photoInputRef.current?.click(); }}
                className="ml-auto p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                title="Upload new photo"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>
            </div>
            <div
              ref={cropContainerRef}
              className="relative h-64 w-full bg-gray-950 rounded-lg overflow-hidden border border-gray-800 select-none"
              onWheel={(e) => {
                e.preventDefault();
                const imgNat = cropStateRef.current.imgNat;
                if (!imgNat) return;
                const newZoom = Math.min(5, Math.max(1, cropZoomRef.current - e.deltaY * 0.001));
                cropZoomRef.current = newZoom;
                setZoom(newZoom);
                const { w: cw, h: ch } = cropContainerDims.current;
                const sc = Math.min(cw / imgNat.w, ch / imgNat.h);
                const rW = imgNat.w * sc; const rH = imgNat.h * sc;
                const iL = (cw - rW) / 2; const iT = (ch - rH) / 2;
                const bP = Math.min(rW, rH) / newZoom;
                const cx = cropStateRef.current.crop.x;
                const cy = cropStateRef.current.crop.y;
                const bCX = iL + cx * rW; const bCY = iT + cy * rH;
                const bL = Math.max(iL, Math.min(iL + rW - bP, bCX - bP / 2));
                const bT = Math.max(iT, Math.min(iT + rH - bP, bCY - bP / 2));
                setCroppedAreaPixels({ x: Math.round((bL - iL) / sc), y: Math.round((bT - iT) / sc), width: Math.round(bP / sc), height: Math.round(bP / sc) });
              }}
            >
              <img
                src={editPhotoPreviewUrl}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                draggable={false}
              />
              {/* Delete icon — top right */}
              <button
                onClick={deleteProjectCover}
                className="absolute top-2 right-2 z-10 p-1.5 bg-red-600 hover:bg-red-500 rounded text-white opacity-30 hover:opacity-100 transition-opacity"
                title="Delete photo"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              {cropImgNat && (() => {
                const { w: cw, h: ch } = cropContainerDims.current;
                const sc = Math.min(cw / cropImgNat.w, ch / cropImgNat.h);
                const rW = cropImgNat.w * sc; const rH = cropImgNat.h * sc;
                const iL = (cw - rW) / 2; const iT = (ch - rH) / 2;
                const bP = Math.min(rW, rH) / zoom;
                const bCX = iL + crop.x * rW; const bCY = iT + crop.y * rH;
                const bL = Math.max(iL, Math.min(iL + rW - bP, bCX - bP / 2));
                const bT = Math.max(iT, Math.min(iT + rH - bP, bCY - bP / 2));
                return (
                  <div
                    className="absolute cursor-move border-2 border-white"
                    style={{ left: bL, top: bT, width: bP, height: bP, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      cropDragState.current = { startMouseX: e.clientX, startMouseY: e.clientY, startBoxLeft: bL, startBoxTop: bT };
                    }}
                    onPointerMove={(e) => {
                      if (!cropDragState.current || !cropImgNat) return;
                      const { w: ncw, h: nch } = cropContainerDims.current;
                      const ns = Math.min(ncw / cropImgNat.w, nch / cropImgNat.h);
                      const nRW = cropImgNat.w * ns; const nRH = cropImgNat.h * ns;
                      const nIL = (ncw - nRW) / 2; const nIT = (nch - nRH) / 2;
                      const nBP = Math.min(nRW, nRH) / zoom;
                      const dx = e.clientX - cropDragState.current.startMouseX;
                      const dy = e.clientY - cropDragState.current.startMouseY;
                      const nl = Math.max(nIL, Math.min(nIL + nRW - nBP, cropDragState.current.startBoxLeft + dx));
                      const nt = Math.max(nIT, Math.min(nIT + nRH - nBP, cropDragState.current.startBoxTop + dy));
                      const newCrop = { x: (nl + nBP / 2 - nIL) / nRW, y: (nt + nBP / 2 - nIT) / nRH };
                      setCrop(newCrop);
                      cropStateRef.current.crop = newCrop;
                      setCroppedAreaPixels({ x: Math.round((nl - nIL) / ns), y: Math.round((nt - nIT) / ns), width: Math.round(nBP / ns), height: Math.round(nBP / ns) });
                    }}
                    onPointerUp={() => { cropDragState.current = null; }}
                  >
                    {[33.33, 66.67].map((pct) => (
                      <React.Fragment key={pct}>
                        <div className="absolute left-0 right-0 border-t border-white/30" style={{ top: `${pct}%` }} />
                        <div className="absolute top-0 bottom-0 border-l border-white/30" style={{ left: `${pct}%` }} />
                      </React.Fragment>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="mt-4">
              <label className="block text-xs text-gray-400 mb-2">Zoom</label>
              <input
                type="range"
                min={1}
                max={5}
                step={0.01}
                value={zoom}
                onChange={(e) => {
                  const newZoom = Number(e.target.value);
                  setZoom(newZoom);
                  cropZoomRef.current = newZoom;
                  if (cropImgNat) {
                    const { w: cw, h: ch } = cropContainerDims.current;
                    const sc = Math.min(cw / cropImgNat.w, ch / cropImgNat.h);
                    const rW = cropImgNat.w * sc; const rH = cropImgNat.h * sc;
                    const iL = (cw - rW) / 2; const iT = (ch - rH) / 2;
                    const bP = Math.min(rW, rH) / newZoom;
                    const bCX = iL + crop.x * rW; const bCY = iT + crop.y * rH;
                    const bL = Math.max(iL, Math.min(iL + rW - bP, bCX - bP / 2));
                    const bT = Math.max(iT, Math.min(iT + rH - bP, bCY - bP / 2));
                    setCroppedAreaPixels({ x: Math.round((bL - iL) / sc), y: Math.round((bT - iT) / sc), width: Math.round(bP / sc), height: Math.round(bP / sc) });
                  }
                }}
                onPointerDown={(e) => e.stopPropagation()}
                className="w-full"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={applyCrop}
                className="flex-1 px-4 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryPage;