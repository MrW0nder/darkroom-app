/**
 * ColorGradingPanel — live per-tonal-range HSL grading.
 * WheelBlock is a top-level component so React never unmounts/remounts it
 * on parent re-renders, which would kill pointer-capture / slider drag state.
 */
import React, { useRef, useCallback, useState, useEffect } from 'react';
import { RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type ToneRange = 'shadow' | 'midtone' | 'highlight';

interface WheelKeys { hue: string; sat: string; lum: string; }

const WHEEL_KEYS: Record<ToneRange, WheelKeys> = {
  shadow:    { hue: 'shadowHue',    sat: 'shadowSat',    lum: 'shadowLum' },
  midtone:   { hue: 'midtoneHue',   sat: 'midtoneSat',   lum: 'midtoneLum' },
  highlight: { hue: 'highlightHue', sat: 'highlightSat', lum: 'highlightLum' },
};

const WHEEL_COLORS: Record<ToneRange, string> = {
  shadow:    '#6366f1',
  midtone:   '#10b981',
  highlight: '#f59e0b',
};

const DEFAULT_COLOR_GRADING = {
  shadowHue: 0,    shadowSat: 0,    shadowLum: 0,
  midtoneHue: 0,   midtoneSat: 0,   midtoneLum: 0,
  highlightHue: 0, highlightSat: 0, highlightLum: 0,
};

// ─── Colour wheel ─────────────────────────────────────────────────────────────

const ColorWheelPicker: React.FC<{
  hue: number; sat: number; accent: string;
  onChange: (hue: number, sat: number) => void;
  onCommit: (hue: number, sat: number) => void;
}> = ({ hue, sat, accent, onChange, onCommit }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const SIZE = 76; const R = SIZE / 2;
  const dragging = useRef(false);
  const lastRef  = useRef({ h: hue, s: sat });

  const dotPos = () => {
    const r = (sat / 100) * (R - 7);
    const rad = ((hue - 90) * Math.PI) / 180;
    return { x: R + r * Math.cos(rad), y: R + r * Math.sin(rad) };
  };

  const fromXY = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const dx = clientX - rect.left - R, dy = clientY - rect.top - R;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const newSat = Math.min((dist / (R - 7)) * 100, 100);
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    return { h: Math.round(((deg % 360) + 360) % 360), s: Math.round(newSat) };
  };

  const onDown = (e: React.PointerEvent) => {
    dragging.current = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const { h, s } = fromXY(e.clientX, e.clientY);
    lastRef.current = { h, s };
    onChange(h, s);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const { h, s } = fromXY(e.clientX, e.clientY);
    lastRef.current = { h, s };
    onChange(h, s);
  };
  const onUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    onCommit(lastRef.current.h, lastRef.current.s);
  };

  const steps = 36;
  const segments = Array.from({ length: steps }, (_, i) => {
    const r1 = ((i / steps) * 360 - 90) * Math.PI / 180;
    const r2 = (((i + 1) / steps) * 360 - 90) * Math.PI / 180;
    const x1 = R + (R - 4) * Math.cos(r1), y1 = R + (R - 4) * Math.sin(r1);
    const x2 = R + (R - 4) * Math.cos(r2), y2 = R + (R - 4) * Math.sin(r2);
    return { d: `M ${R} ${R} L ${x1} ${y1} A ${R-4} ${R-4} 0 0 1 ${x2} ${y2} Z`, hue: (i / steps) * 360 };
  });

  const dot = dotPos();
  return (
    <svg ref={svgRef} width={SIZE} height={SIZE}
      className="cursor-crosshair flex-shrink-0 select-none touch-none"
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <defs>
        <radialGradient id={`cgFade-${accent.replace('#','')}`}>
          <stop offset="0%"  stopColor="#1f2937" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#1f2937" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`cgClip-${accent.replace('#','')}`}><circle cx={R} cy={R} r={R - 3} /></clipPath>
      </defs>
      <g clipPath={`url(#cgClip-${accent.replace('#','')})`}>
        {segments.map((s, i) => (
          <path key={i} d={s.d} fill={`hsl(${s.hue},80%,55%)`} />
        ))}
        <circle cx={R} cy={R} r={R - 4} fill={`url(#cgFade-${accent.replace('#','')})`} />
      </g>
      <circle cx={R} cy={R} r={R - 3} fill="none" stroke="#374151" strokeWidth={1.5} />
      <circle cx={dot.x} cy={dot.y} r={5} fill={accent} stroke="#fff" strokeWidth={1.5} />
      <circle cx={R} cy={R} r={2} fill="#6b7280" />
    </svg>
  );
};

// ─── Slider row (module-level — never remounted between renders) ──────────────

const SliderRow: React.FC<{
  label: string; value: number; defaultValue?: number; min: number; max: number; accent?: string;
  onChange: (v: number) => void; onCommit: (v: number) => void; onReset: () => void;
}> = ({ label, value, defaultValue = 0, min, max, accent = '#3b82f6', onChange, onCommit, onReset }) => {
  const isChanged = value !== defaultValue;
  const inputRef  = useRef<HTMLInputElement>(null);

  // Stale-ref pattern so the non-passive wheel listener never captures stale closures
  const valueRef    = useRef(value);
  const onChangeRef = useRef(onChange);
  const onCommitRef = useRef(onCommit);
  valueRef.current    = value;
  onChangeRef.current = onChange;
  onCommitRef.current = onCommit;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    let scrollTimer: ReturnType<typeof setTimeout>;
    let scrollStartValue: number | null = null;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (scrollStartValue === null) scrollStartValue = valueRef.current;
      const next = Math.max(min, Math.min(max, valueRef.current + (e.deltaY < 0 ? 1 : -1)));
      onChangeRef.current(next);
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        onCommitRef.current(valueRef.current);
        scrollStartValue = null;
      }, 400);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => { el.removeEventListener('wheel', onWheel); clearTimeout(scrollTimer); };
  }, [min, max]);

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-gray-500 w-5 flex-shrink-0 select-none">{label}</span>
      <input
        ref={inputRef}
        type="range" min={min} max={max} step={1} value={value}
        className="flex-1" style={{ accentColor: accent }}
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={(e)  => onCommit(Number((e.target as HTMLInputElement).value))}
        onTouchEnd={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
      />
      <span className="text-[10px] font-mono text-gray-400 w-7 text-right flex-shrink-0 select-none">
        {value > 0 ? `+${value}` : value}
      </span>
      <button
        onClick={onReset}
        className={`w-4 h-4 flex items-center justify-center flex-shrink-0 rounded transition-opacity ${
          isChanged ? 'opacity-100 text-gray-400 hover:text-white' : 'opacity-0 pointer-events-none'
        }`}
        title={`Reset ${label}`}
      >
        <RotateCcw className="w-2.5 h-2.5" />
      </button>
    </div>
  );
};

// ─── WheelBlock (module-level) ────────────────────────────────────────────────

interface WheelBlockProps {
  range: ToneRange;
  label: string;
  hue: number; sat: number; lum: number;
  onLive:   (p: Record<string, number>) => void;
  onCommit: (p: Record<string, number>) => void;
}

const WheelBlock: React.FC<WheelBlockProps> = ({ range, label, hue, sat, lum, onLive, onCommit }) => {
  const k = WHEEL_KEYS[range];
  const accent = WHEEL_COLORS[range];
  const active = hue !== 0 || sat !== 0 || lum !== 0;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-medium ${active ? 'text-white' : 'text-gray-400'}`}>{label}</span>
        <button
          onClick={() => onCommit({ [k.hue]: 0, [k.sat]: 0, [k.lum]: 0 })}
          className={`flex items-center gap-0.5 text-[10px] rounded px-1.5 py-0.5 transition-all ${
            active
              ? 'text-gray-300 hover:text-white hover:bg-gray-700 opacity-100'
              : 'text-gray-600 opacity-40 pointer-events-none'
          }`}
          title={`Reset ${label}`}
        >
          <RotateCcw className="w-2.5 h-2.5" /> reset
        </button>
      </div>
      <div className="flex gap-3 items-center">
        <ColorWheelPicker
          hue={hue} sat={sat} accent={accent}
          onChange={(h, s) => onLive({ [k.hue]: h, [k.sat]: s })}
          onCommit={(h, s) => onCommit({ [k.hue]: h, [k.sat]: s })}
        />
        <div className="flex-1 space-y-1.5">
          <SliderRow label="H" value={hue} min={0}   max={360} accent="#3b82f6" defaultValue={0}
            onChange={(v) => onLive({ [k.hue]: v })}
            onCommit={(v) => onCommit({ [k.hue]: v })}
            onReset={() => onCommit({ [k.hue]: 0 })} />
          <SliderRow label="S" value={sat} min={0}   max={100} accent="#3b82f6" defaultValue={0}
            onChange={(v) => onLive({ [k.sat]: v })}
            onCommit={(v) => onCommit({ [k.sat]: v })}
            onReset={() => onCommit({ [k.sat]: 0 })} />
          <SliderRow label="L" value={lum} min={-50} max={50}  accent="#3b82f6" defaultValue={0}
            onChange={(v) => onLive({ [k.lum]: v })}
            onCommit={(v) => onCommit({ [k.lum]: v })}
            onReset={() => onCommit({ [k.lum]: 0 })} />
        </div>
      </div>
    </div>
  );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────

export const ColorGradingPanel: React.FC = () => {
  const { state, updateAdjustments } = useEditor();
  const adj = state.adjustments as any;

  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('panel.colorgrading.collapsed') === 'true'
  );
  useEffect(() => {
    localStorage.setItem('panel.colorgrading.collapsed', String(collapsed));
  }, [collapsed]);

  const live   = useCallback((p: Record<string, number>) =>
    updateAdjustments(p, { recordHistory: false }), [updateAdjustments]);
  const commit = useCallback((p: Record<string, number>) =>
    updateAdjustments(p, { recordHistory: true }),  [updateAdjustments]);
  const resetAll = useCallback(() =>
    updateAdjustments(DEFAULT_COLOR_GRADING, { recordHistory: true, isReset: true }),
    [updateAdjustments]);

  const hasAny = Object.keys(DEFAULT_COLOR_GRADING).some((k) => (adj[k] ?? 0) !== 0);

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className={`px-4 border-b border-gray-700 flex items-center justify-between cursor-pointer select-none transition-all ${collapsed ? 'py-1' : 'py-3'}`}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-1.5">
          {collapsed
            ? <ChevronRight className="w-3 h-3 text-gray-400" />
            : <ChevronDown className="w-4 h-4 text-gray-400" />}
          <h3 className={`font-semibold text-white transition-all ${collapsed ? 'text-sm' : 'text-lg'}`}>
            Color Grading
          </h3>
        </div>
        {!collapsed && hasAny && (
          <button
            onClick={(e) => { e.stopPropagation(); resetAll(); }}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-gray-700"
          >
            <RotateCcw className="w-3 h-3" /> Reset all
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="p-4">
          <WheelBlock
            range="shadow" label="Shadows"
            hue={adj.shadowHue ?? 0} sat={adj.shadowSat ?? 0} lum={adj.shadowLum ?? 0}
            onLive={live} onCommit={commit}
          />
          <WheelBlock
            range="midtone" label="Midtones"
            hue={adj.midtoneHue ?? 0} sat={adj.midtoneSat ?? 0} lum={adj.midtoneLum ?? 0}
            onLive={live} onCommit={commit}
          />
          <WheelBlock
            range="highlight" label="Highlights"
            hue={adj.highlightHue ?? 0} sat={adj.highlightSat ?? 0} lum={adj.highlightLum ?? 0}
            onLive={live} onCommit={commit}
          />
        </div>
      )}
    </div>
  );
};

export default ColorGradingPanel;