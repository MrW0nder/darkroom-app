import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Upload, Type, Image as ImageIcon, X, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Pencil, Trash2, Save } from 'lucide-react';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000';

interface WatermarkPanelProps {
  layerId?: number | null;
  onApply?: (config: WatermarkConfig) => void;
}

interface WatermarkConfig {
  type: 'text' | 'image';
  text?: string;
  image?: File;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  fontSize?: number;
  opacity: number;
  color?: string;
  scale?: number;
}

// ─── Saved watermark entries ────────────────────────────────────────────────
interface SavedWatermark { id: string; name: string; dataUrl: string; }
function loadSaved(): SavedWatermark[] {
  try { return JSON.parse(localStorage.getItem('darkroom.saved-watermarks') || '[]'); } catch { return []; }
}
function persistSaved(list: SavedWatermark[]) {
  localStorage.setItem('darkroom.saved-watermarks', JSON.stringify(list));
}

// ─── Standalone canvas creator modal ─────────────────────────────────────────
const CREATOR_W = 480;
const CREATOR_H = 240;

interface CreatorModalProps {
  onSave: (wm: SavedWatermark) => void;
  onClose: () => void;
}

const CreatorModal: React.FC<CreatorModalProps> = ({ onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawMode, setDrawMode] = useState<'text' | 'pen'>('text');
  const [wmText, setWmText]   = useState('© Your Brand');
  const [fontSize, setFontSz] = useState(40);
  const [fontColor, setFontC] = useState('#FFFFFF');
  const [bgColor, setBgColor] = useState('transparent');
  const [wmName, setWmName]   = useState('My Watermark');
  const [penSize, setPenSize] = useState(3);
  const isPainting = useRef(false);
  const lastPt = useRef<{ x: number; y: number } | null>(null);

  // Render text preview onto canvas
  const renderText = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, CREATOR_W, CREATOR_H);
    if (bgColor !== 'transparent') { ctx.fillStyle = bgColor; ctx.fillRect(0, 0, CREATOR_W, CREATOR_H); }
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = fontColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(wmText, CREATOR_W / 2, CREATOR_H / 2);
  }, [wmText, fontSize, fontColor, bgColor]);

  useEffect(() => { if (drawMode === 'text') renderText(); }, [drawMode, renderText]);

  // Pen drawing
  const getPos = (e: React.MouseEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    const sx = CREATOR_W / r.width;
    const sy = CREATOR_H / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  };
  const penDown = (e: React.MouseEvent) => {
    if (drawMode !== 'pen') return;
    isPainting.current = true;
    lastPt.current = getPos(e);
  };
  const penMove = (e: React.MouseEvent) => {
    if (!isPainting.current || drawMode !== 'pen') return;
    const pt = getPos(e);
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.strokeStyle = fontColor;
    ctx.lineWidth = penSize;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPt.current!.x, lastPt.current!.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    lastPt.current = pt;
  };
  const penUp = () => { isPainting.current = false; };

  const clearCanvas = () => {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.clearRect(0, 0, CREATOR_W, CREATOR_H);
  };

  const handleSave = () => {
    const dataUrl = canvasRef.current!.toDataURL('image/png');
    onSave({ id: Date.now().toString(), name: wmName.trim() || 'My Watermark', dataUrl });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-white font-semibold">Create Watermark / Logo</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-4 space-y-3">
          {/* Mode tabs */}
          <div className="flex gap-2">
            <button onClick={() => setDrawMode('text')}
              className={`flex-1 py-1.5 rounded text-sm flex items-center justify-center gap-1.5 transition-colors ${
                drawMode === 'text' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}>
              <Type size={14} /> Text
            </button>
            <button onClick={() => setDrawMode('pen')}
              className={`flex-1 py-1.5 rounded text-sm flex items-center justify-center gap-1.5 transition-colors ${
                drawMode === 'pen' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}>
              <Pencil size={14} /> Draw
            </button>
          </div>

          {/* Text controls */}
          {drawMode === 'text' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <input type="text" value={wmText} onChange={e => setWmText(e.target.value)}
                  className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                  placeholder="Watermark text" />
              </div>
              <div>
                <label className="text-xs text-gray-400">Size: {fontSize}px</label>
                <input type="range" min={12} max={100} value={fontSize} onChange={e => setFontSz(Number(e.target.value))} className="w-full" />
              </div>
              <div className="flex items-end gap-2">
                <div>
                  <label className="text-xs text-gray-400">Color</label>
                  <input type="color" value={fontColor} onChange={e => setFontC(e.target.value)}
                    className="block w-9 h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer" />
                </div>
                <div>
                  <label className="text-xs text-gray-400">BG</label>
                  <input type="color" value={bgColor === 'transparent' ? '#000000' : bgColor}
                    onChange={e => setBgColor(e.target.value)}
                    className="block w-9 h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer" />
                </div>
                <button onClick={() => setBgColor('transparent')}
                  className="pb-0.5 text-xs text-gray-400 hover:text-white underline">
                  No BG
                </button>
              </div>
              <div className="col-span-2">
                <button onClick={renderText}
                  className="w-full py-1.5 bg-gray-700 hover:bg-gray-600 text-sm text-gray-200 rounded transition-colors">
                  Refresh Preview
                </button>
              </div>
            </div>
          )}

          {/* Pen controls */}
          {drawMode === 'pen' && (
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-400">Brush size: {penSize}px</label>
              <input type="range" min={1} max={20} value={penSize} onChange={e => setPenSize(Number(e.target.value))} className="flex-1" />
              <div>
                <label className="text-xs text-gray-400 block">Color</label>
                <input type="color" value={fontColor} onChange={e => setFontC(e.target.value)}
                  className="w-9 h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer" />
              </div>
            </div>
          )}

          {/* Canvas */}
          <div
            className="border border-gray-600 rounded overflow-hidden"
            style={{
              backgroundColor: '#1a1a1a',
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Crect width='8' height='8' fill='%23333'/%3E%3Crect x='8' y='8' width='8' height='8' fill='%23333'/%3E%3C/svg%3E\")",
            }}
          >
            <canvas
              ref={canvasRef}
              width={CREATOR_W}
              height={CREATOR_H}
              className="w-full"
              style={{ cursor: drawMode === 'pen' ? 'crosshair' : 'default', display: 'block' }}
              onMouseDown={penDown}
              onMouseMove={penMove}
              onMouseUp={penUp}
              onMouseLeave={penUp}
            />
          </div>

          {/* Name + actions */}
          <div className="flex gap-2">
            <input type="text" value={wmName} onChange={e => setWmName(e.target.value)}
              className="flex-1 px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
              placeholder="Watermark name" />
            <button onClick={clearCanvas}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-sm transition-colors">
              Clear
            </button>
            <button onClick={handleSave}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium flex items-center gap-1.5 transition-colors">
              <Save size={14} /> Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const WatermarkPanel: React.FC<WatermarkPanelProps> = ({ layerId, onApply }) => {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('panel.watermark.collapsed') === 'true'
  );
  useEffect(() => {
    localStorage.setItem('panel.watermark.collapsed', String(collapsed));
  }, [collapsed]);

  const [showCreator, setShowCreator] = useState(false);
  const [savedWatermarks, setSavedWatermarks] = useState<SavedWatermark[]>(loadSaved);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);

  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('© Your Name 2024');
  const [position, setPosition] = useState<WatermarkConfig['position']>('bottom-right');
  const [fontSize, setFontSize] = useState(36);
  const [opacity, setOpacity] = useState(0.5);
  const [color, setColor] = useState('#FFFFFF');
  const [scale, setScale] = useState(0.2);
  const [watermarkImage, setWatermarkImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);         // watermark logo preview (thumbnail)
  const [resultUrl, setResultUrl] = useState<string | null>(null);    // baked preview from backend
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setWatermarkImage(file);
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleApply = async () => {
    setApplyError(null);
    setResultUrl(null);

    const config: WatermarkConfig = { type: watermarkType, position, opacity };
    if (watermarkType === 'text') { config.text = text; config.fontSize = fontSize; config.color = color; }
    else if (watermarkImage) { config.image = watermarkImage; config.scale = scale; }
    onApply?.(config);

    if (!layerId) { setApplyError('No image selected.'); return; }

    const formData = new FormData();
    formData.append('layer_id', String(layerId));
    formData.append('watermark_type', watermarkType);
    formData.append('position', position);
    formData.append('opacity', String(opacity));
    if (watermarkType === 'text') {
      formData.append('text', text);
      formData.append('font_size', String(fontSize));
      formData.append('color', color);
    } else {
      formData.append('scale', String(scale));
      if (watermarkImage) formData.append('watermark_image', watermarkImage);
    }

    try {
      setIsApplying(true);
      const res = await axios.post(`${API_URL}/api/watermark/apply`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResultUrl(`${API_URL}${res.data.preview_url}`);
    } catch (err: any) {
      setApplyError(err.response?.data?.detail || err.message || 'Failed to apply watermark');
    } finally {
      setIsApplying(false);
    }
  };

  const handleCreatorSave = (wm: SavedWatermark) => {
    const next = [...savedWatermarks, wm];
    setSavedWatermarks(next);
    persistSaved(next);
    setSelectedSavedId(wm.id);
    setShowCreator(false);
  };

  const deleteSaved = (id: string) => {
    const next = savedWatermarks.filter(w => w.id !== id);
    setSavedWatermarks(next);
    persistSaved(next);
    if (selectedSavedId === id) setSelectedSavedId(null);
  };

  // When a saved watermark is selected, load its dataUrl as the image watermark
  useEffect(() => {
    if (!selectedSavedId) return;
    const wm = savedWatermarks.find(w => w.id === selectedSavedId);
    if (!wm) return;
    setWatermarkType('image');
    fetch(wm.dataUrl)
      .then(r => r.blob())
      .then(blob => {
        const file = new File([blob], `${wm.name}.png`, { type: 'image/png' });
        setWatermarkImage(file);
        setPreview(wm.dataUrl);
      });
  }, [selectedSavedId]);

  return (
    <>
    {showCreator && <CreatorModal onSave={handleCreatorSave} onClose={() => setShowCreator(false)} />}
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div
        className={`px-4 border-b border-gray-700 flex items-center justify-between cursor-pointer select-none transition-all ${collapsed ? 'py-1' : 'py-3'}`}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-1.5">
          {collapsed
            ? <ChevronRight className="w-3 h-3 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />}
          <h3 className={`font-semibold text-white transition-all ${collapsed ? 'text-sm' : 'text-lg'}`}>Watermark</h3>
        </div>
        {!collapsed && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowCreator(true); }}
            className="px-2.5 py-1 rounded text-xs flex items-center gap-1.5 bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors"
            title="Create a custom watermark on a blank canvas"
          >
            <Pencil className="w-3 h-3" />
            Create
          </button>
        )}
      </div>
      {!collapsed && <div className="p-3 space-y-3">

        {/* Type Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1.5">Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setWatermarkType('text')}
              className={`flex-1 py-1.5 rounded flex items-center justify-center gap-1.5 text-sm transition-colors ${
                watermarkType === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Type size={14} />
              Text
            </button>
            <button
              onClick={() => setWatermarkType('image')}
              className={`flex-1 py-1.5 rounded flex items-center justify-center gap-1.5 text-sm transition-colors ${
                watermarkType === 'image'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <ImageIcon size={14} />
              Image
            </button>
          </div>
        </div>

        {/* Text Settings */}
        {watermarkType === 'text' && (
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Text</label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-2 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
                placeholder="Your watermark text"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Font Size: {fontSize}px</label>
              <input type="range" min="12" max="120" value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))} className="w-full" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Color</label>
              <div className="flex gap-2">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                  className="w-9 h-8 bg-gray-700 border border-gray-600 rounded cursor-pointer" />
                <input type="text" value={color} onChange={(e) => setColor(e.target.value)}
                  className="flex-1 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>
        )}

        {/* Image Settings */}
        {watermarkType === 'image' && (
          <div className="space-y-2">
            <label className="block text-xs text-gray-400 mb-1">Watermark Image</label>
            <label className="flex flex-col items-center justify-center w-full h-24 bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
              {preview ? (
                <div className="relative">
                  <img src={preview} alt="wm preview" className="max-h-16 mx-auto" />
                  <button onClick={(e) => { e.preventDefault(); setWatermarkImage(null); setPreview(null); }}
                    className="absolute -top-1 -right-1 p-0.5 bg-red-600 rounded-full hover:bg-red-700">
                    <X size={10} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="text-gray-400 mb-1" size={20} />
                  <span className="text-xs text-gray-400">Click to upload</span>
                </>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Scale: {Math.round(scale * 100)}%</label>
              <input type="range" min="0.05" max="0.5" step="0.05" value={scale}
                onChange={(e) => setScale(Number(e.target.value))} className="w-full" />
            </div>
          </div>
        )}

        {/* Saved Watermarks */}
        {savedWatermarks.length > 0 && (
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Saved Watermarks</label>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {savedWatermarks.map(wm => (
                <div key={wm.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                    selectedSavedId === wm.id ? 'bg-blue-600/30 border border-blue-500' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  onClick={() => setSelectedSavedId(selectedSavedId === wm.id ? null : wm.id)}
                >
                  <img src={wm.dataUrl} alt={wm.name} className="w-12 h-6 object-contain bg-[#1a1a1a] rounded" />
                  <span className="flex-1 text-xs text-gray-200 truncate">{wm.name}</span>
                  <button onClick={e => { e.stopPropagation(); deleteSaved(wm.id); }}
                    className="text-gray-500 hover:text-red-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Position */}
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Position</label>
          <div className="grid grid-cols-3 gap-1">
            {([
              { value: 'top-left',     label: '↖' },
              { value: 'top-right',    label: '↗' },
              { value: 'center',       label: '⊙' },
              { value: 'bottom-left',  label: '↙' },
              { value: 'bottom-right', label: '↘' },
            ] as { value: WatermarkConfig['position']; label: string }[]).map((pos) => (
              <button key={pos.value} onClick={() => setPosition(pos.value)}
                className={`py-1.5 rounded text-lg transition-colors ${
                  position === pos.value ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>
        </div>

        {/* Opacity */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Opacity: {Math.round(opacity * 100)}%</label>
          <input type="range" min="0" max="1" step="0.05" value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))} className="w-full" />
        </div>

        {/* Apply Button */}
        <button
          onClick={handleApply}
          disabled={isApplying || (watermarkType === 'image' && !watermarkImage)}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
        >
          {isApplying ? <><Loader2 className="w-4 h-4 animate-spin" /> Applying…</> : 'Preview Watermark'}
        </button>

        {/* Result Preview */}
        {applyError && (
          <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800 rounded p-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {applyError}
          </div>
        )}

        {resultUrl && !applyError && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-green-400 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Preview ready
            </div>
            <img
              src={resultUrl}
              alt="Watermarked preview"
              className="w-full rounded border border-gray-600 object-contain max-h-48"
            />
            <a
              href={resultUrl}
              download
              className="block text-center text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Download preview
            </a>
          </div>
        )}
      </div>}
    </div>
    </>
  );
};