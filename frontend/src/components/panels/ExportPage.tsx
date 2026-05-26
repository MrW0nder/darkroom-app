/**
 * ExportPage - Full-screen export interface for the entire project.
 * Displays all project photos with multi-select, filters, and batch export.
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import {
  ArrowLeft, Download, Loader2, CheckCircle2, AlertCircle, AlertTriangle,
  Heart, Lock, Sliders, Image as ImageIcon, CheckSquare, Square as SquareIcon,
  ChevronDown, ChevronRight, Folder, X, Save, Bookmark, Trash2, XCircle,
} from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:8000';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Layer {
  id: number;
  project_id: number;
  type: string;
  content: string | null;
  width: number;
  height: number;
  z_index: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  blend_mode?: string | null;
  x?: number;
  y?: number;
  created_at?: string;
}

interface Adjustments {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  vibrance?: number;
  exposure?: number;
  highlights?: number;
  shadows?: number;
  sharpness?: number;
  temperature?: number;
  tint?: number;
}

interface ExportResult {
  layer_id: number;
  filename: string;
  download_url: string;
  size_bytes: number;
  success: boolean;
  error?: string;
}

type Format =
  | 'JPEG'
  | 'JPEG_12BIT'
  | 'JPEG_XL'
  | 'RAW_ORIGINAL'
  | 'PNG'
  | 'PNG_16BIT'
  | 'PDF'
  | 'TIFF'
  | 'TIFF_16BIT'
  | 'WEBP'
  | 'AVIF'
  | 'PFM'
  | 'PPM_16BIT'
  | 'OPEN_EXR'
  | 'BMP'
  | 'XCF';

type FilterTab = 'all' | 'liked' | 'edited' | 'not-edited' | 'locked';
type ResizeMode = 'none' | 'long_edge' | 'width' | 'height';

interface ExportTemplate {
  id: string;
  name: string;
  format: Format;
  quality: number;
  resizeMode: ResizeMode;
  resizeValue: number;
  dpi: number;
}

const TEMPLATES_KEY = 'darkroom-export-templates';

function loadTemplates(): ExportTemplate[] {
  try {
    const saved = localStorage.getItem(TEMPLATES_KEY);
    if (saved) return JSON.parse(saved) as ExportTemplate[];
  } catch {}
  return [];
}

function saveTemplates(templates: ExportTemplate[]): void {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

interface ExportPageProps {
  projectId: number;
  layers?: Layer[];
  layerAdjustments?: Record<number, Adjustments>;
  editedLayers?: Set<number>;
  lockedLayers?: Set<number>;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

interface FormatOption {
  value: Format;
  label: string;        // shown in dropdown
  ext: string;          // file extension (display)
  apiValue: string;     // what to send to the backend
  hasQuality: boolean;  // show quality slider
  note?: string;        // short description (shown below trigger)
  fallbackNote?: string; // shown when format is an approximation of the chosen type
  itemTip: string;      // plain-English tooltip for this specific variant
  group: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  // ── JPEG ─────────────────────────────────────────────────────────────
  { group: 'JPEG', value: 'JPEG',         label: 'JPEG (8-bit)',        ext: 'jpg',  apiValue: 'JPEG',  hasQuality: true,  note: 'Smallest size, universal',
    itemTip: 'The standard choice for almost everything. Gives you 256 shades per colour — more than enough for photos you\'ll share, print, or post online. Smallest file size of the JPEG family.' },
  { group: 'JPEG', value: 'JPEG_12BIT',   label: 'JPEG (12-bit)',       ext: 'jpg',  apiValue: 'JPEG',  hasQuality: true,  note: 'Higher bit depth JPEG',
    fallbackNote: 'Saved as JPEG (8-bit) — 12-bit encoder not available',
    itemTip: 'Stores 4,096 shades per colour instead of 256. Smooth gradients (like a clear sky) look even smoother with no banding. A slightly larger file, but better for professional printing where perfection matters.' },
  { group: 'JPEG', value: 'JPEG_XL',      label: 'JPEG XL',             ext: 'jxl',  apiValue: 'JPEG',  hasQuality: true,  note: 'Next-gen, lossless option',
    fallbackNote: 'Saved as JPEG (.jpg) — JPEG XL encoder not available',
    itemTip: 'A newer, smarter JPEG. At the same quality it creates a noticeably smaller file than regular JPEG. You can also switch it to lossless mode (like PNG) for zero quality loss. Not supported by all software yet.' },
  // ── RAW ──────────────────────────────────────────────────────────────
  { group: 'RAW',  value: 'RAW_ORIGINAL', label: 'Keep Original (RAW)', ext: '',     apiValue: 'RAW',   hasQuality: false, note: 'Copy source file unchanged',
    itemTip: 'Copies your file exactly as it was imported — no conversion, no compression, no changes at all. Your edits here are NOT baked in. This is purely a way to export the original file alongside others.' },
  // ── PNG ──────────────────────────────────────────────────────────────
  { group: 'PNG',  value: 'PNG',          label: 'PNG (8-bit)',         ext: 'png',  apiValue: 'PNG',   hasQuality: false, note: 'Lossless, web-friendly',
    itemTip: 'The everyday PNG. 256 shades per colour — enough for almost all photos and perfect for graphics with flat colours or text. Smaller file than 16-bit PNG. Use this unless you specifically need more precision.' },
  { group: 'PNG',  value: 'PNG_16BIT',    label: 'PNG (16-bit)',        ext: 'png',  apiValue: 'PNG16', hasQuality: false, note: 'Lossless, high precision',
    itemTip: 'Stores 65,536 shades per colour — 256× more than 8-bit. You won\'t see the difference on a normal screen, but it\'s vital for scientific work, printing from RAW files, or keeping as much image data as possible.' },
  // ── PDF ──────────────────────────────────────────────────────────────
  { group: 'PDF',  value: 'PDF',          label: 'PDF',                 ext: 'pdf',  apiValue: 'PDF',   hasQuality: false, note: 'Print & document delivery',
    itemTip: 'Embeds your photo into a single-page document. The image quality is preserved and it looks the same on every device and printer. The safest choice when sending photos to a print shop or a client.' },
  // ── TIFF ─────────────────────────────────────────────────────────────
  { group: 'TIFF', value: 'TIFF',         label: 'TIFF (8-bit)',        ext: 'tif',  apiValue: 'TIFF',   hasQuality: false, note: 'Maximum quality, large files',
    itemTip: 'No compression at all — every pixel is stored exactly as-is. Files are very large (10–100× bigger than JPEG) but the image is as perfect as it can be. What commercial printers and stock photo libraries typically request.' },
  { group: 'TIFF', value: 'TIFF_16BIT',   label: 'TIFF (16-bit)',       ext: 'tif',  apiValue: 'TIFF16', hasQuality: false, note: 'Archival quality, double precision',
    itemTip: 'The professional archive standard. Stores 65,536 shades per colour with zero compression — identical to what RAW converters and scanning software output. Use this for master files you plan to keep indefinitely.' },
  // ── Web ──────────────────────────────────────────────────────────────
  { group: 'Web',  value: 'WEBP',         label: 'WebP',                ext: 'webp', apiValue: 'WEBP',  hasQuality: true,  note: 'Great quality/size ratio',
    itemTip: 'Google\'s web format. At the same visual quality it produces files about 30% smaller than JPEG. Also supports transparent backgrounds, like PNG. Works in all modern browsers. Great for anything going on a website.' },
  { group: 'Web',  value: 'AVIF',         label: 'AVIF',                ext: 'avif', apiValue: 'WEBP',  hasQuality: true,  note: 'Next-gen web format',
    fallbackNote: 'Saved as WebP (.webp) — AVIF encoder not available',
    itemTip: 'The newest major web format — even smaller than WebP at the same quality. Excellent for websites that need fast loading times. Browser support is growing fast and it\'s already supported in Chrome, Firefox, and Safari.' },
  // ── HDR ──────────────────────────────────────────────────────────────
  { group: 'HDR',  value: 'OPEN_EXR',     label: 'OpenEXR',             ext: 'exr',  apiValue: 'TIFF',  hasQuality: false, note: 'HDR, VFX & compositing',
    fallbackNote: 'Saved as TIFF (.tiff) — OpenEXR encoder not available',
    itemTip: 'The standard format in film and TV production. Stores multiple layers of light data that go far beyond what any screen can display. Used when handing off photos to a video editor or VFX artist for compositing.' },
  { group: 'HDR',  value: 'PFM',          label: 'PFM',                 ext: 'pfm',  apiValue: 'TIFF',  hasQuality: false, note: 'Portable float map',
    fallbackNote: 'Saved as TIFF (.tiff) — PFM encoder not available',
    itemTip: 'A very simple HDR format used in research, computer vision, and academic projects. No compression, completely raw floating-point data. Rarely needed outside of scientific software.' },
  { group: 'HDR',  value: 'PPM_16BIT',    label: 'PPM (16-bit)',         ext: 'ppm',  apiValue: 'PPM',   hasQuality: false, note: 'Portable pixmap',
    itemTip: 'An old, no-frills format used in software development and research. No compression, easy for software to read. Only useful when a specific tool requires it — not intended for everyday photo sharing.' },
  // ── Other ────────────────────────────────────────────────────────────
  { group: 'Other', value: 'BMP',         label: 'BMP',                 ext: 'bmp',  apiValue: 'BMP',   hasQuality: false, note: 'Uncompressed bitmap',
    itemTip: 'Windows\' oldest built-in photo format. No compression, so files are huge. Compatible with almost every program ever made. Only use this if another specific program requires a BMP file and won\'t accept PNG.' },
  { group: 'Other', value: 'XCF',         label: 'XCF (GIMP)',          ext: 'xcf',  apiValue: 'PNG',   hasQuality: false, note: 'GIMP native format',
    fallbackNote: 'Saved as PNG (.png) — XCF format requires GIMP',
    itemTip: 'GIMP\'s own project format. Keeps all layers and editing history intact so you can continue editing in GIMP. Only useful if GIMP is part of your workflow.' },
];

const FORMAT_GROUPS = Array.from(new Set(FORMAT_OPTIONS.map((f) => f.group)));

const getFormatOption = (v: Format) => FORMAT_OPTIONS.find((f) => f.value === v)!;

const TAB_LABELS: Record<FilterTab, string> = {
  all: 'All',
  liked: 'Liked',
  edited: 'Edited',
  'not-edited': 'Not Edited',
  locked: 'Locked',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Tooltip that appears after 2 seconds of hovering. Rendered via portal so it
// escapes any overflow:hidden parent (like the dropdown panel).
// Uses cloneElement so there's no wrapper div breaking getBoundingClientRect.
const HoverTooltip: React.FC<{ tip: string; children: React.ReactElement }> = ({ tip, children }) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({
      top: rect.top + rect.height / 2,
      right: window.innerWidth - rect.left + 10,
    });
    timerRef.current = setTimeout(() => setVisible(true), 2000);
    children.props.onMouseEnter?.(e);
  };

  const handleLeave = (e: React.MouseEvent) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    children.props.onMouseLeave?.(e);
  };

  return (
    <>
      {React.cloneElement(children, { onMouseEnter: handleEnter, onMouseLeave: handleLeave })}
      {visible && createPortal(
        <div
          className="fixed z-[9999] w-64 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2.5 shadow-2xl text-xs text-gray-200 leading-relaxed pointer-events-none"
          style={{ top: pos.top, right: pos.right, transform: 'translateY(-50%)' }}
        >
          {tip}
        </div>,
        document.body
      )}
    </>
  );
};

// ─── Plain-English tooltip copy ──────────────────────────────────────────────

// One sentence per group — explains what the format FAMILY is for.
const GROUP_TIPS: Record<string, string> = {
  JPEG:  'The world\'s most common photo format. Great for sharing online, emailing, or printing. Photos are compressed to keep file sizes small — at high quality settings you won\'t notice any difference.',
  RAW:   'Your original camera file, saved exactly as it came off the camera. Nothing is changed, nothing is lost. Use this when you want to keep the original safe or edit it again later in another program.',
  PNG:   'Saves every single detail with zero quality loss — unlike JPEG, nothing is compressed away no matter how many times you save it. Files are larger, but the image stays perfectly accurate.',
  PDF:   'Saves your photo as a printable document page. Looks identical on every device and is what most print shops and clients prefer to receive.',
  TIFF:  'A professional archive format used by photographers and publishers. Absolutely no quality is lost. Files are very large, but the image is as perfect as it can possibly be.',
  Web:   'Modern formats designed specifically for websites and apps. They give you the same visual quality as JPEG but at a smaller file size, so photos load faster online.',
  HDR:   'Specialist formats for photos with extreme lighting — used in film, VFX, and scientific imaging. Not for everyday sharing; these are for technical professionals who need to capture a wider range of light than a screen can show.',
  Other: 'Less common formats for compatibility with specific older software or niche workflows. Not recommended for everyday use.',
};

function getFilename(layer: Layer): string {
  if (!layer.content) return `layer-${layer.id}`;
  return layer.content.replace(/\\/g, '/').split('/').pop() || `layer-${layer.id}`;
}

function getThumbUrl(layer: Layer): string {
  const filename = getFilename(layer);
  return `${API_URL}/storage/originals/${filename}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ───────────────────────────────────────────────────────────────

const ExportPage: React.FC<ExportPageProps> = ({
  projectId,
  layers: layersProp,
  layerAdjustments: layerAdjustmentsProp,
  editedLayers: editedLayersProp,
  lockedLayers: lockedLayersProp,
  onClose,
}) => {
  // Self-fetch layers if not provided by parent
  const [fetchedLayers, setFetchedLayers] = useState<Layer[]>([]);
  const [fetchLoading, setFetchLoading] = useState(!layersProp || layersProp.length === 0);

  useEffect(() => {
    if (layersProp && layersProp.length > 0) return;
    setFetchLoading(true);
    axios
      .get<Layer[]>(`${API_URL}/api/layers`, { params: { project_id: projectId } })
      .then((res) => setFetchedLayers(res.data))
      .catch(() => {})
      .finally(() => setFetchLoading(false));
  }, [projectId, layersProp]);

  const layers = (layersProp && layersProp.length > 0) ? layersProp : fetchedLayers;

  // Read layerAdjustments from localStorage if not provided
  const layerAdjustments: Record<number, Adjustments> = layerAdjustmentsProp ?? (() => {
    try {
      const saved = localStorage.getItem(`darkroom-layer-adjustments-${projectId}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  })();

  // Read editedLayers from localStorage if not provided
  const editedLayers: Set<number> = editedLayersProp ?? (() => {
    try {
      const saved = localStorage.getItem(`darkroom-edited-layers-${projectId}`);
      if (saved) return new Set<number>(JSON.parse(saved));
    } catch {}
    return new Set<number>();
  })();

  // lockedLayers: derive from fetched layers if not provided
  const lockedLayers: Set<number> = lockedLayersProp ?? new Set(
    layers.filter((l) => l.locked).map((l) => l.id)
  );

  // Read favoritedLayers from localStorage (same key as PhotoGallery)
  const [favoritedLayers, setFavoritedLayers] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem(`darkroom-favorited-layers-${projectId}`);
      if (saved) return new Set<number>(JSON.parse(saved));
    } catch {}
    return new Set<number>();
  });

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [format, setFormat] = useState<Format>('JPEG');
  const selectedFormat = getFormatOption(format);
  // Start with the group of the default format open
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set([getFormatOption('JPEG').group]));

  const toggleGroup = (group: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };
  const [formatDropdownOpen, setFormatDropdownOpen] = useState(false);
  const formatDropdownRef = useRef<HTMLDivElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!formatDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (formatDropdownRef.current && !formatDropdownRef.current.contains(e.target as Node)) {
        setFormatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [formatDropdownOpen]);

  const [quality, setQuality] = useState(92);
  // Resize state
  const [resizeMode, setResizeMode] = useState<ResizeMode>('none');
  const [resizeValue, setResizeValue] = useState(2048);
  const [dpi, setDpi] = useState(300);

  // ── Export templates ────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<ExportTemplate[]>(loadTemplates);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);

  const applyTemplate = (t: ExportTemplate) => {
    setFormat(t.format);
    setQuality(t.quality);
    setResizeMode(t.resizeMode);
    setResizeValue(t.resizeValue);
    setDpi(t.dpi);
    setOpenGroups(new Set([getFormatOption(t.format).group]));
  };

  const handleSaveTemplate = () => {
    const name = newTemplateName.trim();
    if (!name) return;
    const t: ExportTemplate = {
      id: Date.now().toString(36),
      name,
      format,
      quality,
      resizeMode,
      resizeValue,
      dpi,
    };
    const updated = [...templates, t];
    setTemplates(updated);
    saveTemplates(updated);
    setNewTemplateName('');
    setShowSaveTemplate(false);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter((t) => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
  };

  const [savePath, setSavePath] = useState('');
  const [exportedToPath, setExportedToPath] = useState('');
  const [status, setStatus] = useState<'idle' | 'exporting' | 'done' | 'error'>('idle');
  const [results, setResults] = useState<ExportResult[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  // Progress tracking for per-item export
  const [exportProgress, setExportProgress] = useState({ done: 0, total: 0 });
  const cancelledRef = useRef(false);

  // Only image-type layers
  const imageLayers = useMemo(
    () => layers.filter((l) => l.type === 'image'),
    [layers]
  );

  // Filtered set based on active tab
  const filteredLayers = useMemo(() => {
    switch (activeFilter) {
      case 'liked':
        return imageLayers.filter((l) => favoritedLayers.has(l.id));
      case 'edited':
        return imageLayers.filter((l) => editedLayers.has(l.id));
      case 'not-edited':
        return imageLayers.filter((l) => !editedLayers.has(l.id));
      case 'locked':
        return imageLayers.filter((l) => lockedLayers.has(l.id));
      default:
        return imageLayers;
    }
  }, [imageLayers, activeFilter, favoritedLayers, editedLayers, lockedLayers]);

  // Count badges per tab
  const tabCounts = useMemo<Record<FilterTab, number>>(() => ({
    all: imageLayers.length,
    liked: imageLayers.filter((l) => favoritedLayers.has(l.id)).length,
    edited: imageLayers.filter((l) => editedLayers.has(l.id)).length,
    'not-edited': imageLayers.filter((l) => !editedLayers.has(l.id)).length,
    locked: imageLayers.filter((l) => lockedLayers.has(l.id)).length,
  }), [imageLayers, favoritedLayers, editedLayers, lockedLayers]);

  // Toggle single photo
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Select all visible
  const selectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredLayers.forEach((l) => next.add(l.id));
      return next;
    });
  }, [filteredLayers]);

  // Deselect all visible
  const deselectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredLayers.forEach((l) => next.delete(l.id));
      return next;
    });
  }, [filteredLayers]);

  const allVisibleSelected =
    filteredLayers.length > 0 && filteredLayers.every((l) => selectedIds.has(l.id));

  const selectedInView = filteredLayers.filter((l) => selectedIds.has(l.id)).length;

  const handleBrowseFolder = async () => {
    const api = (window as any).electronAPI;
    if (api?.showFolderDialog) {
      // Electron: native OS folder dialog
      const chosen: string | null = await api.showFolderDialog();
      if (chosen) setSavePath(chosen);
    } else {
      // Browser: trigger hidden directory input
      folderInputRef.current?.click();
    }
  };

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const f = files[0] as any;
    if (f.path) {
      // Electron exposes absolute path on file objects
      const absPath = (f.path as string).replace(/\\/g, '/');
      const relParts = (f.webkitRelativePath as string).split('/');
      const absParts = absPath.split('/');
      const folderParts = absParts.slice(0, absParts.length - relParts.length);
      setSavePath(folderParts.join('\\'));
    } else if (f.webkitRelativePath) {
      // Browser: can only get the folder name, not the full path
      setSavePath(f.webkitRelativePath.split('/')[0]);
    }
    e.target.value = '';
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (selectedIds.size === 0) return;

    // GIMP-style: if in Electron and no save path yet, prompt for one before starting
    let exportSavePath = savePath;
    const api = (window as any).electronAPI;
    if (!exportSavePath && api?.showFolderDialog) {
      const chosen: string | null = await api.showFolderDialog();
      if (!chosen) return; // user cancelled the folder dialog
      setSavePath(chosen);
      exportSavePath = chosen;
    }

    cancelledRef.current = false;
    setStatus('exporting');
    setResults([]);
    setErrorMsg('');
    setExportedToPath('');

    const items = Array.from(selectedIds).map((id) => ({
      layer_id: id,
      adjustments: layerAdjustments[id] ?? null,
      format_override: format === 'RAW_ORIGINAL' ? 'RAW' : null,
    }));

    const resizePayload = resizeMode === 'none' ? undefined : {
      long_edge: resizeMode === 'long_edge' ? resizeValue : undefined,
      width:     resizeMode === 'width'     ? resizeValue : undefined,
      height:    resizeMode === 'height'    ? resizeValue : undefined,
      dpi,
    };

    setExportProgress({ done: 0, total: items.length });
    const gathered: ExportResult[] = [];

    for (const item of items) {
      if (cancelledRef.current) break;

      try {
        const res = await axios.post<{
          success: boolean;
          filename: string;
          download_url: string;
          size_bytes: number;
        }>(`${API_URL}/api/export/single`, {
          layer_id:      item.layer_id,
          adjustments:   item.adjustments,
          format:        selectedFormat.apiValue,
          quality,
          save_path:     exportSavePath || undefined,
          resize:        resizePayload,
        });
        gathered.push({
          layer_id:     item.layer_id,
          filename:     res.data.filename,
          download_url: res.data.download_url,
          size_bytes:   res.data.size_bytes,
          success:      res.data.success,
        });
      } catch (err: any) {
        gathered.push({
          layer_id:     item.layer_id,
          filename:     `layer-${item.layer_id}`,
          download_url: '',
          size_bytes:   0,
          success:      false,
          error:        err?.response?.data?.detail ?? err?.message ?? 'Export failed',
        });
      }

      setResults([...gathered]);
      setExportProgress({ done: gathered.length, total: items.length });
    }

    setExportedToPath(exportSavePath);
    setStatus(cancelledRef.current ? 'done' : 'done');
  };

  const handleCancelExport = () => {
    cancelledRef.current = true;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (fetchLoading) {
    return (
      <div className="fixed inset-0 bg-gray-950 z-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-950 z-50 flex flex-col overflow-hidden">

      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 px-5 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          title="Back to editor"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="flex-1">
          <h1 className="text-base font-semibold text-gray-100">Export Photos</h1>
          <p className="text-xs text-gray-500">
            {imageLayers.length} photo{imageLayers.length !== 1 ? 's' : ''} in project
          </p>
        </div>

        <div className="text-sm text-gray-400">
          {selectedIds.size} selected
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left: Gallery ───────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-gray-800">

          {/* Filter Tabs + Select All */}
          <div className="flex items-center justify-between gap-2 px-4 py-2 bg-gray-900/60 border-b border-gray-800 flex-shrink-0">
            <div className="flex gap-1">
              {(Object.keys(TAB_LABELS) as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeFilter === tab
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                  }`}
                >
                  {TAB_LABELS[tab]}
                  <span className={`ml-1.5 ${activeFilter === tab ? 'text-blue-200' : 'text-gray-600'}`}>
                    {tabCounts[tab]}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={selectAll}
                disabled={filteredLayers.length === 0}
                className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Select all
              </button>
              <span className="text-gray-700">|</span>
              <button
                onClick={deselectAll}
                disabled={selectedInView === 0}
                className="text-xs text-gray-400 hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Deselect
              </button>
            </div>
          </div>

          {/* Photo Grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {filteredLayers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                <ImageIcon className="w-12 h-12 opacity-40" />
                <p className="text-sm">No photos match this filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {filteredLayers.map((layer) => {
                  const isSelected = selectedIds.has(layer.id);
                  const isEdited = editedLayers.has(layer.id);
                  const isLiked = favoritedLayers.has(layer.id);
                  const isLocked = lockedLayers.has(layer.id);

                  return (
                    <div
                      key={layer.id}
                      onClick={() => toggleSelect(layer.id)}
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all select-none ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/40'
                          : 'border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-square bg-gray-800">
                        <img
                          src={getThumbUrl(layer)}
                          alt={getFilename(layer)}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          draggable={false}
                        />
                      </div>

                      {/* Checkbox overlay */}
                      <div className={`absolute top-1.5 left-1.5 w-5 h-5 rounded flex items-center justify-center transition-all ${
                        isSelected ? 'bg-blue-500 text-white' : 'bg-gray-900/70 text-gray-400'
                      }`}>
                        {isSelected
                          ? <CheckSquare className="w-3.5 h-3.5" />
                          : <SquareIcon className="w-3.5 h-3.5" />
                        }
                      </div>

                      {/* Status badges (top-right) */}
                      <div className="absolute top-1.5 right-1.5 flex gap-1">
                        {isLiked && (
                          <span className="w-4 h-4 bg-red-500/90 rounded-full flex items-center justify-center" title="Liked">
                            <Heart className="w-2.5 h-2.5 text-white fill-white" />
                          </span>
                        )}
                        {isLocked && (
                          <span className="w-4 h-4 bg-yellow-500/90 rounded-full flex items-center justify-center" title="Locked">
                            <Lock className="w-2.5 h-2.5 text-white" />
                          </span>
                        )}
                        {isEdited && (
                          <span className="w-4 h-4 bg-green-500/90 rounded-full flex items-center justify-center" title="Edited">
                            <Sliders className="w-2.5 h-2.5 text-white" />
                          </span>
                        )}
                      </div>

                      {/* Filename at bottom */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1 pt-3">
                        <p className="text-xs text-gray-200 truncate leading-tight">
                          {getFilename(layer)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Settings + Results ──────────────────────────────── */}
        <div className="w-72 flex flex-col bg-gray-900 flex-shrink-0 overflow-y-auto">

          {/* Templates */}
          <section className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5" />
                Templates
              </h2>
              <button
                onClick={() => setShowSaveTemplate((v) => !v)}
                className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                title="Save current settings as template"
              >
                <Save className="w-3 h-3" />
                Save current
              </button>
            </div>

            {/* Save new template input */}
            {showSaveTemplate && (
              <div className="flex gap-1.5 mb-2">
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTemplate(); if (e.key === 'Escape') setShowSaveTemplate(false); }}
                  placeholder="Template name…"
                  autoFocus
                  className="flex-1 min-w-0 bg-gray-800 border border-blue-500 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 outline-none"
                />
                <button
                  onClick={handleSaveTemplate}
                  disabled={!newTemplateName.trim()}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded text-xs text-white font-medium transition-colors"
                >
                  Save
                </button>
              </div>
            )}

            {templates.length === 0 ? (
              <p className="text-[11px] text-gray-600 italic">No templates saved yet.</p>
            ) : (
              <div className="space-y-1">
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className="group flex items-center gap-1.5 bg-gray-800 hover:bg-gray-750 rounded-lg px-2 py-1.5 cursor-pointer transition-colors"
                    onClick={() => applyTemplate(t)}
                    title={`${t.format} · Q${t.quality} · ${t.resizeMode === 'none' ? 'No resize' : `${t.resizeMode} ${t.resizeValue}px`} · ${t.dpi} DPI`}
                  >
                    <Bookmark className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <span className="flex-1 text-xs text-gray-200 truncate">{t.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono flex-shrink-0">
                      {getFormatOption(t.format)?.ext || t.format.toLowerCase()}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all flex-shrink-0"
                      title="Delete template"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Format */}
          <section className="p-4 border-b border-gray-800">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Format</h2>
            {/* Trigger button */}
            <div className="relative" ref={formatDropdownRef}>
              <button
                onClick={() => setFormatDropdownOpen((v) => !v)}
                className="w-full flex items-center justify-between bg-gray-800 border border-gray-700 hover:border-blue-500 rounded-lg px-3 py-2 text-sm text-gray-200 transition-colors"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="truncate">{selectedFormat.label}</span>
                  {selectedFormat.ext && (
                    <span className="font-mono text-[11px] text-gray-500 flex-shrink-0">.{selectedFormat.ext}</span>
                  )}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-2 transition-transform ${formatDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown panel with accordion */}
              {formatDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-gray-850 border border-gray-700 rounded-lg shadow-xl z-30 overflow-hidden" style={{ backgroundColor: '#1a1f2e' }}>
                  {FORMAT_GROUPS.map((group) => {
                    const groupFormats = FORMAT_OPTIONS.filter((f) => f.group === group);
                    const isOpen = openGroups.has(group);
                    const hasSelected = groupFormats.some((f) => f.value === format);
                    return (
                      <div key={group} className="border-b border-gray-700/50 last:border-0">
                        {/* Group header — tooltip explains what this format family is */}
                        <HoverTooltip tip={GROUP_TIPS[group] ?? group}>
                          <button
                            onClick={() => toggleGroup(group)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold transition-colors ${
                              hasSelected ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              {hasSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                              {group}
                            </span>
                            {isOpen
                              ? <ChevronDown className="w-3 h-3 flex-shrink-0" />
                              : <ChevronRight className="w-3 h-3 flex-shrink-0" />
                            }
                          </button>
                        </HoverTooltip>
                        {/* Group items — tooltip explains what makes this variant different */}
                        {isOpen && (
                          <div className="pb-1">
                            {groupFormats.map((f) => (
                              <HoverTooltip key={f.value} tip={f.itemTip}>
                                <button
                                  onClick={() => { setFormat(f.value); setFormatDropdownOpen(false); }}
                                  className={`w-full flex items-center justify-between pl-6 pr-3 py-1.5 text-xs transition-colors ${
                                    format === f.value
                                      ? 'bg-blue-600/25 text-blue-300'
                                      : 'text-gray-400 hover:bg-gray-700/60 hover:text-gray-200'
                                  }`}
                                >
                                  <span>{f.label}</span>
                                  {f.ext && (
                                    <span className={`font-mono text-[10px] ${
                                      format === f.value ? 'text-blue-400' : 'text-gray-600'
                                    }`}>.{f.ext}</span>
                                  )}
                                </button>
                              </HoverTooltip>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedFormat.note && (
              <p className="mt-1.5 text-[11px] text-gray-500">{selectedFormat.note}</p>
            )}
            {selectedFormat.fallbackNote && (
              <p className="mt-1 text-[11px] text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                {selectedFormat.fallbackNote}
              </p>
            )}
          </section>

          {/* Quality (lossy formats only) */}
          {selectedFormat.hasQuality && (
            <section className="p-4 border-b border-gray-800">
              <div className="flex justify-between mb-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quality</h2>
                <span className="text-xs text-gray-300 font-mono">{quality}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                step={1}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between mt-1 text-[10px] text-gray-600">
                <span>Smaller</span>
                <span>Larger</span>
              </div>
            </section>
          )}

          {/* Resize */}
          <section className="p-4 border-b border-gray-800">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Resize</h2>
            <div className="flex gap-1 mb-2">
              {(['none', 'long_edge', 'width', 'height'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setResizeMode(m)}
                  className={`flex-1 py-1 rounded text-[11px] font-medium transition-colors ${
                    resizeMode === m
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-gray-200'
                  }`}
                >
                  {m === 'none' ? 'Off' : m === 'long_edge' ? 'Long Edge' : m === 'width' ? 'Width' : 'Height'}
                </button>
              ))}
            </div>
            {resizeMode !== 'none' && (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min={64}
                  max={65536}
                  step={1}
                  value={resizeValue}
                  onChange={(e) => setResizeValue(Math.max(64, Math.min(65536, Number(e.target.value))))}
                  className="w-24 bg-gray-800 border border-gray-700 focus:border-blue-500 rounded px-2 py-1 text-xs text-gray-200 outline-none"
                />
                <span className="text-xs text-gray-500">px</span>
                <span className="text-[11px] text-gray-600 ml-auto">
                  {resizeMode === 'long_edge' ? 'longest side' : resizeMode}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-gray-500 w-16 flex-shrink-0">Output DPI</span>
              <select
                value={dpi}
                onChange={(e) => setDpi(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 focus:border-blue-500 rounded px-2 py-1 text-xs text-gray-300 outline-none"
              >
                {[72, 96, 150, 300, 600].map((d) => (
                  <option key={d} value={d}>{d} DPI</option>
                ))}
              </select>
            </div>
          </section>

          {/* Save Location */}
          <section className="p-4 border-b border-gray-800">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Save Location</h2>
            {/* Hidden directory picker — works in both Electron and browser */}
            <input
              ref={folderInputRef}
              type="file"
              className="hidden"
              onChange={handleFolderInputChange}
              {...{ webkitdirectory: '', directory: '' } as any}
            />
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleBrowseFolder}
                className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-gray-700 hover:bg-blue-600 border border-gray-600 hover:border-blue-500 rounded-lg transition-colors"
                title="Choose folder"
                type="button"
              >
                <Folder className="w-4 h-4 text-gray-300" />
              </button>
              <div className="flex-1 min-w-0 flex items-center gap-1.5 bg-gray-800 border border-gray-700 focus-within:border-blue-500 rounded-lg px-2.5 py-1.5 transition-colors">
                <input
                  type="text"
                  value={savePath}
                  onChange={(e) => setSavePath(e.target.value)}
                  placeholder="Choose or type a folder path…"
                  className="flex-1 min-w-0 bg-transparent text-xs text-gray-200 placeholder-gray-600 outline-none"
                  spellCheck={false}
                />
                {savePath && (
                  <button
                    onClick={() => setSavePath('')}
                    className="text-gray-600 hover:text-gray-400 flex-shrink-0"
                    title="Clear"
                    type="button"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            {savePath && (
              <p className="mt-1.5 text-[11px] text-gray-600">Files saved directly here — no download prompt.</p>
            )}
          </section>

          {/* Summary */}
          <section className="p-4 border-b border-gray-800">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Summary</h2>
            <div className="space-y-1 text-xs text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-500">Selected</span>
                <span>{selectedIds.size} photo{selectedIds.size !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Format</span>
                <span>{selectedFormat.label}</span>
              </div>
              {selectedFormat.hasQuality && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Quality</span>
                  <span>{quality}%</span>
                </div>
              )}
              {resizeMode !== 'none' && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Resize</span>
                  <span>{resizeMode === 'long_edge' ? 'Long edge' : resizeMode} {resizeValue}px</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">DPI</span>
                <span>{dpi}</span>
              </div>

            </div>
          </section>

          {/* Export Button + Cancel */}
          <div className="p-4 space-y-2">
            {status === 'exporting' && (
              <div className="space-y-1.5">
                {/* Progress bar */}
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Exporting…</span>
                  <span>{exportProgress.done} / {exportProgress.total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-700 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: exportProgress.total > 0 ? `${(exportProgress.done / exportProgress.total) * 100}%` : '0%' }}
                  />
                </div>
                <button
                  onClick={handleCancelExport}
                  className="w-full py-1.5 rounded-lg border border-gray-600 hover:border-red-500 hover:text-red-400 text-xs text-gray-400 transition-colors flex items-center justify-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel remaining
                </button>
              </div>
            )}
            {status !== 'exporting' && (
              <button
                onClick={handleExport}
                disabled={selectedIds.size === 0}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export {selectedIds.size > 0 ? `${selectedIds.size} photo${selectedIds.size !== 1 ? 's' : ''}` : 'Photos'}
              </button>
            )}
          </div>

          {/* Error */}
          {status === 'error' && (
            <div className="mx-4 mb-4 p-3 bg-red-900/40 border border-red-700 rounded-lg flex gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <section className="px-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Results ({results.filter((r) => r.success).length}/{results.length})
                </h2>
                {/* Download All — only shown when not saved to a local path */}
                {!exportedToPath && results.some((r) => r.success) && (
                  <button
                    onClick={() => {
                      results.filter((r) => r.success).forEach((r) => {
                        const a = document.createElement('a');
                        a.href = `${API_URL}${r.download_url}`;
                        a.download = r.filename;
                        a.click();
                      });
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Download all
                  </button>
                )}
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {results.map((result) => (
                  <div
                    key={result.layer_id}
                    className={`p-2.5 rounded-lg border text-xs ${
                      result.success
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-red-900/20 border-red-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {result.success
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        : <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      }
                      <span className="truncate text-gray-300 flex-1">{result.filename}</span>
                    </div>

                    {result.success ? (
                      exportedToPath ? (
                        // Saved directly to disk — no download dialog needed
                        <p className="text-[10px] text-gray-500 truncate mt-0.5" title={exportedToPath}>
                          Saved · {formatBytes(result.size_bytes)}
                        </p>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500">{formatBytes(result.size_bytes)}</span>
                          <a
                            href={`${API_URL}${result.download_url}`}
                            download={result.filename}
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="w-3 h-3" />
                            Save
                          </a>
                        </div>
                      )
                    ) : (
                      <p className="text-red-400 mt-1">{result.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportPage;
