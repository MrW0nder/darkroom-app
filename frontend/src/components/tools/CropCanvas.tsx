/**
 * CropCanvas — professional Lightroom-style crop overlay.
 *
 * Improvements:
 *  1. L-bracket corner handles + midpoint tick handles
 *  2. Grid faint at rest, brighter while actively dragging
 *  3. Crop constrained to image after rotation (inscribed-rect formula)
 *  4. Angle snapping near 0° / ±90° / ±180°
 *  5. Rotation protractor shown during rotate drag
 *  6. Grid overlay cycling: thirds → golden → diagonal → off  (press O)
 *  7. Straighten-by-line tool (when straightenMode prop is true)
 *  8. Per-session undo  (Ctrl+Z)
 *  9. setPixelSize() exposed on handle for exact W×H from sidebar
 * 10. cycleGrid() exposed on handle for sidebar button
 */
import React, {
  useRef, useEffect, useCallback, useState,
  forwardRef, useImperativeHandle,
} from 'react';
import { useEditor } from '../../contexts/EditorContext.js';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:8000';

type HandleId = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';
type DragMode  = HandleId | 'move' | 'rotate';
type GridMode  = 'thirds' | 'golden' | 'diagonal' | 'off';
interface Rect { x: number; y: number; w: number; h: number; }
interface Tfm  { scale: number; ox: number; oy: number; imgW: number; imgH: number; }
interface HistoryEntry { rect: Rect; rotation: number; }

export interface CropCanvasHandle {
  apply:        () => Promise<void>;
  reset:        () => void;
  setPixelSize: (w: number, h: number) => void;
  cycleGrid:    () => void;
}

interface Props {
  layerId:          number;
  imageUrl:         string;
  rotation:         number;
  aspectRatio:      number | null;
  flipH:            boolean;
  flipV:            boolean;
  straightenMode:   boolean;
  onRotationChange: (v: number) => void;
  onCropSizeChange: (w: number, h: number) => void;
  onComplete?:      () => void;
  onCancel?:        () => void;
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

function buildHandles(r: Rect): { id: HandleId; x: number; y: number }[] {
  return [
    { id: 'nw', x: r.x,           y: r.y           },
    { id: 'n',  x: r.x + r.w / 2, y: r.y           },
    { id: 'ne', x: r.x + r.w,     y: r.y           },
    { id: 'e',  x: r.x + r.w,     y: r.y + r.h / 2 },
    { id: 'se', x: r.x + r.w,     y: r.y + r.h     },
    { id: 's',  x: r.x + r.w / 2, y: r.y + r.h     },
    { id: 'sw', x: r.x,           y: r.y + r.h     },
    { id: 'w',  x: r.x,           y: r.y + r.h / 2 },
  ];
}

const CURSORS: Record<DragMode, string> = {
  nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
  e: 'e-resize',   se: 'se-resize', s: 's-resize',
  sw: 'sw-resize', w: 'w-resize',
  move: 'move',   rotate: 'crosshair',
};

/**
 * Half-dimensions of the largest axis-aligned rect inscribed inside an
 * (imgW × imgH) rectangle rotated by rotDeg degrees around its center.
 * Formula: solve a·cosθ + b·sinθ = W/2 and a·sinθ + b·cosθ = H/2.
 */
function getMaxInscribed(imgW: number, imgH: number, rotDeg: number): { hw: number; hh: number } {
  let θ = Math.abs(rotDeg * Math.PI / 180) % Math.PI;
  if (θ > Math.PI / 2) θ = Math.PI - θ;   // fold to [0, π/2]
  if (θ < 0.003) return { hw: imgW / 2, hh: imgH / 2 };
  let W = imgW, H = imgH;
  if (θ > Math.PI / 4) { [W, H] = [H, W]; θ = Math.PI / 2 - θ; }  // fold to [0, π/4]
  if (θ < 0.003) return { hw: W / 2, hh: H / 2 };
  const s = Math.sin(θ), c = Math.cos(θ);
  const cos2θ = Math.cos(2 * θ);
  if (Math.abs(cos2θ) < 0.025) {
    // Near π/4: use L'Hôpital limit
    const sin2θ = Math.sin(2 * θ);
    return {
      hw: Math.max(20, (W / 2 * s + H / 2 * c) / (2 * sin2θ)),
      hh: Math.max(20, (H / 2 * s + W / 2 * c) / (2 * sin2θ)),
    };
  }
  return {
    hw: Math.max(20, (W / 2 * c - H / 2 * s) / cos2θ),
    hh: Math.max(20, (H / 2 * c - W / 2 * s) / cos2θ),
  };
}

function clampRectToInscribed(r: Rect, t: Tfm, rotDeg: number): Rect {
  const { hw, hh } = getMaxInscribed(t.imgW, t.imgH, rotDeg);
  const icx = t.ox + t.imgW / 2, icy = t.oy + t.imgH / 2;
  const bx = icx - hw, by = icy - hh;
  let { x, y, w, h } = r;
  w = Math.min(w, hw * 2);  h = Math.min(h, hh * 2);
  x = Math.max(bx, Math.min(bx + hw * 2 - w, x));
  y = Math.max(by, Math.min(by + hh * 2 - h, y));
  return { x, y, w, h };
}

function snapAngle(deg: number): number {
  for (const s of [-180, -90, 0, 90, 180]) {
    if (Math.abs(deg - s) < 0.8) return s;
  }
  return deg;
}

// ── Draw helpers ──────────────────────────────────────────────────────────────

function drawGrid(ctx: CanvasRenderingContext2D, r: Rect, mode: GridMode, alpha: number) {
  if (mode === 'off') return;
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth   = 0.85;
  if (mode === 'thirds') {
    for (let i = 1; i < 3; i++) {
      const lx = r.x + r.w * i / 3, ly = r.y + r.h * i / 3;
      ctx.beginPath(); ctx.moveTo(lx, r.y);  ctx.lineTo(lx, r.y + r.h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r.x, ly);  ctx.lineTo(r.x + r.w, ly); ctx.stroke();
    }
  } else if (mode === 'golden') {
    for (const f of [0.381966, 0.618034]) {
      const lx = r.x + r.w * f, ly = r.y + r.h * f;
      ctx.beginPath(); ctx.moveTo(lx, r.y);  ctx.lineTo(lx, r.y + r.h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r.x, ly);  ctx.lineTo(r.x + r.w, ly); ctx.stroke();
    }
  } else if (mode === 'diagonal') {
    ctx.beginPath(); ctx.moveTo(r.x, r.y);       ctx.lineTo(r.x + r.w, r.y + r.h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(r.x + r.w, r.y); ctx.lineTo(r.x, r.y + r.h);       ctx.stroke();
  }
  ctx.restore();
}

/** L-bracket corner handle. dx/dy = +1 or -1: direction the arms extend. */
function drawLCorner(ctx: CanvasRenderingContext2D, x: number, y: number, dx: 1 | -1, dy: 1 | -1) {
  const L = 13, T = 2.5;
  ctx.fillStyle = 'rgba(255,255,255,0.97)';
  ctx.fillRect(dx > 0 ? x : x - L, y - T / 2, L, T);     // horizontal arm
  ctx.fillRect(x - T / 2, dy > 0 ? y : y - L, T, L);     // vertical arm
}

function drawHandles(ctx: CanvasRenderingContext2D, r: Rect) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur  = 3;
  drawLCorner(ctx, r.x,         r.y,         1,  1);
  drawLCorner(ctx, r.x + r.w,   r.y,        -1,  1);
  drawLCorner(ctx, r.x + r.w,   r.y + r.h, -1, -1);
  drawLCorner(ctx, r.x,         r.y + r.h,  1, -1);
  // midpoint ticks
  ctx.shadowBlur = 0;
  ctx.fillStyle  = 'rgba(255,255,255,0.90)';
  const MS = 5, ML = 14;
  ctx.fillRect(r.x + r.w / 2 - ML / 2, r.y - MS / 2,        ML, MS);  // n
  ctx.fillRect(r.x + r.w / 2 - ML / 2, r.y + r.h - MS / 2,  ML, MS);  // s
  ctx.fillRect(r.x - MS / 2,            r.y + r.h / 2 - ML / 2, MS, ML);  // w
  ctx.fillRect(r.x + r.w - MS / 2,      r.y + r.h / 2 - ML / 2, MS, ML);  // e
  ctx.restore();
}

function drawProtractor(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number, cx: number, cy: number,
  rotDeg: number,
) {
  const R     = Math.min(cw, ch) * 0.40;
  const zeroA = -Math.PI / 2;
  const curA  = zeroA + rotDeg * Math.PI / 180;
  ctx.save();
  // faint ring
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth   = 28;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  // filled arc showing rotation
  ctx.strokeStyle = 'rgba(255,200,0,0.28)';
  ctx.lineWidth   = 28;
  ctx.beginPath(); ctx.arc(cx, cy, R, zeroA, curA, rotDeg < 0); ctx.stroke();
  // tick marks
  for (let deg = -180; deg < 180; deg += 5) {
    const a       = zeroA + deg * Math.PI / 180;
    const isMaj   = deg % 45 === 0;
    const isMed   = deg % 15 === 0;
    const tick    = isMaj ? 14 : isMed ? 8 : 4;
    ctx.strokeStyle = isMaj ? 'rgba(255,255,255,0.65)'
                    : isMed ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.16)';
    ctx.lineWidth   = isMaj ? 1.5 : 0.75;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (R - 14 - tick), cy + Math.sin(a) * (R - 14 - tick));
    ctx.lineTo(cx + Math.cos(a) * (R - 14),        cy + Math.sin(a) * (R - 14));
    ctx.stroke();
    if (isMaj) {
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.font = '10px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const lr = R - 30;
      ctx.fillText(String(deg), cx + Math.cos(a) * lr, cy + Math.sin(a) * lr);
    }
  }
  // 0° marker
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(zeroA) * (R - 16), cy + Math.sin(zeroA) * (R - 16));
  ctx.lineTo(cx + Math.cos(zeroA) * (R - 2),  cy + Math.sin(zeroA) * (R - 2));
  ctx.stroke();
  // current-angle pointer
  ctx.strokeStyle = 'rgba(255,200,0,0.92)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(curA) * (R - 2), cy + Math.sin(curA) * (R - 2)); ctx.stroke();
  ctx.fillStyle = 'rgba(255,200,0,0.92)';
  ctx.beginPath(); ctx.arc(cx + Math.cos(curA) * (R - 2), cy + Math.sin(curA) * (R - 2), 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawStraightenLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
  if (x1 === x2 && y1 === y2) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,200,0,0.88)'; ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 3]);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,200,0,0.92)';
  for (const [ex, ey] of [[x1, y1], [x2, y2]] as [number, number][]) {
    ctx.beginPath(); ctx.arc(ex, ey, 4.5, 0, Math.PI * 2); ctx.fill();
  }
  const angleDeg = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath(); (ctx as any).roundRect(midX - 32, midY - 13, 64, 24, 4); ctx.fill();
  ctx.fillStyle = 'rgba(255,200,0,0.95)'; ctx.font = '11px system-ui';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`${angleDeg.toFixed(1)}°`, midX, midY + 1);
  ctx.restore();
}

const GRID_CYCLE: GridMode[] = ['thirds', 'golden', 'diagonal', 'off'];

const CropCanvas = forwardRef<CropCanvasHandle, Props>((props, ref) => {
  const {
    layerId, imageUrl, rotation, aspectRatio,
    flipH, flipV, straightenMode,
    onRotationChange, onCropSizeChange,
    onComplete, onCancel,
  } = props;

  const { setProcessing } = useEditor();
  const containerRef  = useRef<HTMLDivElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const [size, setSize]         = useState({ w: 0, h: 0 });
  const [img, setImg]           = useState<HTMLImageElement | null>(null);
  const [applying, setApplying] = useState(false);
  const [gridMode, setGridMode] = useState<GridMode>('thirds');
  const [activeDragMode, setActiveDragMode] = useState<DragMode | null>(null);

  const rectRef       = useRef<Rect | null>(null);
  const historyRef    = useRef<HistoryEntry[]>([]);
  const straightenRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [tick, setTick] = useState(0);

  const dragRef = useRef<{
    mode: DragMode; px: number; py: number; startRect: Rect; startRot: number;
  } | null>(null);

  // ── Load image ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!imageUrl) return;
    rectRef.current = null; // reset so rect is re-calculated for new image
    const el = new window.Image();
    el.crossOrigin = 'anonymous';
    el.src = (imageUrl.startsWith('http') || imageUrl.startsWith('data:'))
      ? imageUrl : `${API_URL}${imageUrl}`;
    el.onload  = () => setImg(el);
    el.onerror = () => console.error('CropCanvas: load failed', el.src);
  }, [imageUrl]);

  // ── Observe container ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    requestAnimationFrame(update);
    return () => ro.disconnect();
  }, []);

  // ── Image → display transform ──────────────────────────────────────────────
  const getTransform = useCallback((): Tfm | null => {
    if (!img || !size.w || !size.h) return null;
    const pad   = 56;
    const scale = Math.min(
      (size.w - pad * 2) / img.naturalWidth,
      (size.h - pad * 2) / img.naturalHeight,
    );
    const imgW = img.naturalWidth  * scale;
    const imgH = img.naturalHeight * scale;
    return { scale, ox: (size.w - imgW) / 2, oy: (size.h - imgH) / 2, imgW, imgH };
    const oy = (size.h - imgH) / 2;
    return { scale, ox: (size.w - imgW) / 2, oy, imgW, imgH };
  }, [img, size]);

  // ── Init rect when image + container ready ─────────────────────────────────
  useEffect(() => {
    if (!img || !size.w || !size.h || rectRef.current) return;
    const t = getTransform();
    if (!t) return;
    rectRef.current = clampRectToInscribed({ x: t.ox, y: t.oy, w: t.imgW, h: t.imgH }, t, rotation);
    setTick(v => v + 1);
    onCropSizeChange(img.naturalWidth, img.naturalHeight);
  }, [img, size, getTransform, rotation, onCropSizeChange]);

  // ── Re-clamp crop rect when rotation changes ───────────────────────────────
  useEffect(() => {
    const t = getTransform();
    if (!t || !rectRef.current) return;
    rectRef.current = clampRectToInscribed(rectRef.current, t, rotation);
    setTick(v => v + 1);
  }, [rotation, getTransform]);

  // ── Enforce aspect ratio when it changes ───────────────────────────────────
  useEffect(() => {
    if (!aspectRatio || !rectRef.current) return;
    const r = rectRef.current;
    rectRef.current = { ...r, h: r.w / aspectRatio };
    setTick(v => v + 1);
  }, [aspectRatio]);

  // ── Draw ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas?.getContext('2d');
    if (!canvas || !ctx || !img || !size.w || !size.h) return;
    const t = getTransform();
    if (!t || !rectRef.current) return;
    const r = rectRef.current;

    canvas.width  = size.w;
    canvas.height = size.h;
    const { w: cw, h: ch } = size;
    const cx = cw / 2, cy = ch / 2;
    const rad = (rotation * Math.PI) / 180;

    // 1. Draw image (rotated + flipped)
    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rad);
    if (flipH) ctx.scale(-1, 1);
    if (flipV) ctx.scale(1, -1);
    ctx.drawImage(img, -t.imgW / 2, -t.imgH / 2, t.imgW, t.imgH);
    ctx.restore();

    // 2. Dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(0, 0, cw, ch);

    // 3. Reveal crop area: clip & redraw image at full brightness
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    ctx.translate(cx, cy); ctx.rotate(rad);
    if (flipH) ctx.scale(-1, 1);
    if (flipV) ctx.scale(1, -1);
    ctx.drawImage(img, -t.imgW / 2, -t.imgH / 2, t.imgW, t.imgH);
    ctx.restore();

    // 4. Crop border
    ctx.strokeStyle = 'rgba(255,255,255,0.90)';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    // 5. Grid (faint at rest, brighter while resize/move dragging)
    const isMoving = activeDragMode !== null && activeDragMode !== 'rotate';
    drawGrid(ctx, r, gridMode, isMoving ? 0.48 : 0.14);

    // 6. Handles
    drawHandles(ctx, r);

    // 7. Protractor (only during rotate drag)
    if (activeDragMode === 'rotate') {
      drawProtractor(ctx, cw, ch, cx, cy, rotation);
    }

    // 8. Straighten line (while drawing it)
    if (straightenRef.current) {
      const { x1, y1, x2, y2 } = straightenRef.current;
      drawStraightenLine(ctx, x1, y1, x2, y2);
    }

    // 9. Rotation angle badge
    if (Math.abs(rotation) > 0.2) {
      const txt = `${rotation >= 0 ? '+' : ''}${rotation.toFixed(1)}°`;
      ctx.font      = '12px system-ui';
      const bw = ctx.measureText(txt).width + 18;
      ctx.fillStyle = 'rgba(0,0,0,0.62)';
      ctx.beginPath();
      (ctx as any).roundRect(r.x + r.w / 2 - bw / 2, r.y + r.h / 2 - 13, bw, 24, 4);
      ctx.fill();
      ctx.fillStyle    = 'white';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, r.x + r.w / 2, r.y + r.h / 2 + 1);
    }

    // 10. Grid mode hint (subtle, bottom-center)
    if (gridMode !== 'off') {
      const label: Record<GridMode, string> = {
        thirds: '⅓ Thirds', golden: 'φ Golden', diagonal: '✕ Diagonal', off: '',
      };
      ctx.font           = '10px system-ui';
      ctx.fillStyle      = 'rgba(255,255,255,0.28)';
      ctx.textAlign      = 'center';
      ctx.textBaseline   = 'bottom';
      ctx.fillText(`${label[gridMode]} · O to cycle`, cw / 2, ch - 8);
    }

    // 11. Straighten mode hint
    if (straightenMode && !straightenRef.current) {
      ctx.font           = '11px system-ui';
      ctx.fillStyle      = 'rgba(255,200,0,0.72)';
      ctx.textAlign      = 'center';
      ctx.textBaseline   = 'top';
      ctx.fillText('Click and drag along a straight edge to straighten', cw / 2, 12);
    }
  }, [img, size, rotation, flipH, flipV, tick, gridMode, activeDragMode, straightenMode, getTransform]);

  // ── Hit test ───────────────────────────────────────────────────────────────
  const hitTest = useCallback((px: number, py: number): DragMode | 'outside' => {
    const r = rectRef.current;
    if (!r) return 'outside';
    for (const { id, x, y } of buildHandles(r)) {
      if (Math.abs(px - x) <= 12 && Math.abs(py - y) <= 12) return id;
    }
    if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) return 'move';
    const m = 24;
    if (px >= r.x - m && px <= r.x + r.w + m &&
        py >= r.y - m && py <= r.y + r.h + m) return 'rotate';
    return 'outside';
  }, []);

  // ── Pointer events ─────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const bnd = canvasRef.current!.getBoundingClientRect();
    const px  = e.clientX - bnd.left;
    const py  = e.clientY - bnd.top;

    // Straighten mode: start drawing a line
    if (straightenMode) {
      straightenRef.current = { x1: px, y1: py, x2: px, y2: py };
      setActiveDragMode('rotate');
      setTick(v => v + 1);
      return;
    }

    const mode = hitTest(px, py);
    if (mode === 'outside') return;

    // Save undo entry before drag starts
    if (rectRef.current) {
      historyRef.current.push({ rect: { ...rectRef.current }, rotation });
      if (historyRef.current.length > 30) historyRef.current.shift();
    }

    dragRef.current = { mode, px, py, startRect: { ...rectRef.current! }, startRot: rotation };
    setActiveDragMode(mode);
  }, [hitTest, rotation, straightenMode]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const bnd = canvasRef.current!.getBoundingClientRect();
    const px  = e.clientX - bnd.left;
    const py  = e.clientY - bnd.top;

    // Straighten mode: update line end
    if (straightenMode && straightenRef.current) {
      straightenRef.current = { ...straightenRef.current, x2: px, y2: py };
      setTick(v => v + 1);
      return;
    }

    if (!dragRef.current) {
      canvasRef.current!.style.cursor = straightenMode
        ? 'crosshair'
        : (() => { const h = hitTest(px, py); return h === 'outside' ? 'default' : CURSORS[h]; })();
      return;
    }

    const { mode, px: spx, py: spy, startRect, startRot } = dragRef.current;
    const dx = px - spx, dy = py - spy;
    const t  = getTransform();
    if (!t) return;

    if (mode === 'rotate') {
      const a1  = Math.atan2(spy - size.h / 2, spx - size.w / 2);
      const a2  = Math.atan2(py  - size.h / 2, px  - size.w / 2);
      const raw = Math.max(-180, Math.min(180, startRot + (a2 - a1) * 180 / Math.PI));
      onRotationChange(snapAngle(raw));
      return;
    }

    const MIN = 30;
    let { x, y, w, h } = startRect;

    if (mode === 'move') {
      const { hw, hh } = getMaxInscribed(t.imgW, t.imgH, rotation);
      const icx = t.ox + t.imgW / 2, icy = t.oy + t.imgH / 2;
      x = Math.max(icx - hw, Math.min(icx + hw - w, x + dx));
      y = Math.max(icy - hh, Math.min(icy + hh - h, y + dy));
    } else {
      if (mode === 'nw' || mode === 'w' || mode === 'sw') {
        const nx = Math.min(x + w - MIN, x + dx); w = w - (nx - x); x = nx;
      }
      if (mode === 'ne' || mode === 'e' || mode === 'se') { w = Math.max(MIN, w + dx); }
      if (mode === 'nw' || mode === 'n' || mode === 'ne') {
        const ny = Math.min(y + h - MIN, y + dy); h = h - (ny - y); y = ny;
      }
      if (mode === 'sw' || mode === 's' || mode === 'se') { h = Math.max(MIN, h + dy); }

      if (aspectRatio) {
        if (['e', 'w', 'ne', 'nw', 'se', 'sw'].includes(mode)) h = w / aspectRatio;
        else w = h * aspectRatio;
      }
      ({ x, y, w, h } = clampRectToInscribed({ x, y, w, h }, t, rotation));
    }

    rectRef.current = { x, y, w, h };
    setTick(v => v + 1);
    onCropSizeChange(Math.round(w / t.scale), Math.round(h / t.scale));
  }, [hitTest, getTransform, size, aspectRatio, rotation, onRotationChange, onCropSizeChange, straightenMode]);

  const onPointerUp = useCallback(() => {
    // Straighten mode: apply the drawn angle
    if (straightenMode && straightenRef.current) {
      const { x1, y1, x2, y2 } = straightenRef.current;
      if (x1 !== x2 || y1 !== y2) {
        const angleDeg = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        onRotationChange(snapAngle(Math.max(-45, Math.min(45, -angleDeg))));
      }
      straightenRef.current = null;
      setTick(v => v + 1);
    }
    dragRef.current = null;
    setActiveDragMode(null);
  }, [straightenMode, onRotationChange]);

  // ── Apply ──────────────────────────────────────────────────────────────────
  const handleApply = useCallback(async () => {
    const r = rectRef.current;
    const t = getTransform();
    if (!r || !t) return;
    const imgX = Math.max(0, Math.round((r.x - t.ox) / t.scale));
    const imgY = Math.max(0, Math.round((r.y - t.oy) / t.scale));
    const imgW = Math.max(1, Math.round(r.w / t.scale));
    const imgH = Math.max(1, Math.round(r.h / t.scale));

    setApplying(true);
    setProcessing(true);
    try {
      if (Math.abs(rotation) > 0.05) {
        const rotRes = await fetch(`${API_URL}/api/crop/rotate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ layer_id: layerId, angle: rotation }),
        });
        if (!rotRes.ok) throw new Error('Rotate failed');
      }
      const res = await fetch(`${API_URL}/api/crop/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layer_id: layerId, x: imgX, y: imgY, width: imgW, height: imgH }),
      });
      if (!res.ok) throw new Error('Crop failed');
      onComplete?.();
    } catch (err) {
      console.error('CropCanvas apply error:', err);
    } finally {
      setApplying(false);
      setProcessing(false);
    }
  }, [getTransform, rotation, layerId, onComplete, setProcessing]);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    const t = getTransform();
    if (!t || !img) return;
    historyRef.current = [];
    rectRef.current = clampRectToInscribed({ x: t.ox, y: t.oy, w: t.imgW, h: t.imgH }, t, rotation);
    setTick(v => v + 1);
    onCropSizeChange(img.naturalWidth, img.naturalHeight);
  }, [getTransform, img, rotation, onCropSizeChange]);

  // ── Set pixel size from sidebar ─────────────────────────────────────────────
  const setPixelSize = useCallback((targetW: number, targetH: number) => {
    const t = getTransform();
    if (!t) return;
    const r      = rectRef.current;
    const icx    = t.ox + t.imgW / 2, icy = t.oy + t.imgH / 2;
    const cx     = r ? r.x + r.w / 2 : icx;
    const cy     = r ? r.y + r.h / 2 : icy;
    const raw    = { x: cx - targetW * t.scale / 2, y: cy - targetH * t.scale / 2, w: targetW * t.scale, h: targetH * t.scale };
    rectRef.current = clampRectToInscribed(raw, t, rotation);
    setTick(v => v + 1);
    const c = rectRef.current;
    onCropSizeChange(Math.round(c.w / t.scale), Math.round(c.h / t.scale));
  }, [getTransform, rotation, onCropSizeChange]);

  // ── Cycle grid overlay ──────────────────────────────────────────────────────
  const cycleGrid = useCallback(() => {
    setGridMode(g => GRID_CYCLE[(GRID_CYCLE.indexOf(g) + 1) % GRID_CYCLE.length]);
  }, []);

  useImperativeHandle(ref, () => ({ apply: handleApply, reset: handleReset, setPixelSize, cycleGrid }),
    [handleApply, handleReset, setPixelSize, cycleGrid]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter')        { e.preventDefault(); handleApply(); }
      else if (e.key === 'Escape')  { e.preventDefault(); onCancel?.(); }
      else if (e.key === '[')       { e.preventDefault(); onRotationChange(Math.max(-180, rotation - 90)); }
      else if (e.key === ']')       { e.preventDefault(); onRotationChange(Math.min(180,  rotation + 90)); }
      else if ((e.key === 'o' || e.key === 'O') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault(); cycleGrid();
      }
      else if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        const prev = historyRef.current.pop();
        if (prev) { rectRef.current = prev.rect; onRotationChange(prev.rotation); setTick(v => v + 1); }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [handleApply, onCancel, onRotationChange, rotation, cycleGrid]);

  return (
    <div ref={containerRef} className="absolute inset-0 bg-[#1a1a1a]">
      {!img ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-gray-400 text-sm">Loading image…</span>
        </div>
      ) : (
        <>
          <canvas
            ref={canvasRef}
            width={size.w || 1}
            height={size.h || 1}
            style={{
              display: 'block', width: '100%', height: '100%', touchAction: 'none',
              cursor: straightenMode ? 'crosshair' : 'default',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
          {applying && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
              <span className="text-white text-sm">Applying crop…</span>
            </div>
          )}
        </>
      )}
    </div>
  );
});

CropCanvas.displayName = 'CropCanvas';
export default CropCanvas;
