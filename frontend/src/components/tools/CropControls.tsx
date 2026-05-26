/**
 * CropControls — sidebar panel for the Lightroom-style crop tool.
 * Provides aspect-ratio presets, fine/coarse rotation, flip toggles,
 * live pixel dimensions with editable inputs, straighten toggle,
 * grid cycling, and Reset / Apply / Cancel actions.
 */
import React, { useState, useEffect } from 'react';

const BASE_ASPECT_RATIOS: { label: string; value: number | null }[] = [
  { label: 'Free',  value: null    },
  { label: '1:1',   value: 1       },
  { label: '4:3',   value: 4 / 3   },
  { label: '3:4',   value: 3 / 4   },
  { label: '3:2',   value: 3 / 2   },
  { label: '2:3',   value: 2 / 3   },
  { label: '5:4',   value: 5 / 4   },
  { label: '4:5',   value: 4 / 5   },
  { label: '5:7',   value: 5 / 7   },
  { label: '7:5',   value: 7 / 5   },
  { label: '16:9',  value: 16 / 9  },
  { label: '9:16',  value: 9 / 16  },
  { label: '2:1',   value: 2       },
];

const MAX_RECENTS = 5;
const RECENTS_KEY = 'cropRecentAspects';

type AspectEntry = { label: string; value: number | null };

function loadRecents(): AspectEntry[] {
  try {
    const s = localStorage.getItem(RECENTS_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

function saveRecents(r: AspectEntry[]) {
  try { localStorage.setItem(RECENTS_KEY, JSON.stringify(r)); } catch {}
}

interface CropControlsProps {
  rotation:        number;
  onRotation:      (v: number) => void;
  aspectRatio:     number | null;
  onAspect:        (v: number | null) => void;
  flipH:           boolean;
  onFlipH:         (v: boolean) => void;
  flipV:           boolean;
  onFlipV:         (v: boolean) => void;
  cropW:           number;
  cropH:           number;
  originalAspect?: number | null;
  straightenMode:  boolean;
  onStraightenMode:(v: boolean) => void;
  onApplySize?:    (w: number, h: number) => void;
  onCycleGrid?:    () => void;
  onReset:         () => void;
  onApply:         () => Promise<void>;
  onCancel:        () => void;
}

const CropControls: React.FC<CropControlsProps> = ({
  rotation, onRotation, aspectRatio, onAspect,
  flipH, onFlipH, flipV, onFlipV,
  cropW, cropH,
  originalAspect,
  straightenMode, onStraightenMode,
  onApplySize, onCycleGrid,
  onReset, onApply, onCancel,
}) => {
  const [applying, setApplying] = useState(false);
  const [rotInput, setRotInput] = useState(rotation.toFixed(1));
  const [wInput,   setWInput]   = useState(String(cropW || ''));
  const [hInput,   setHInput]   = useState(String(cropH || ''));

  // Aspect ratio state
  const [recentAspects, setRecentAspects] = useState<AspectEntry[]>(loadRecents);
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  // Sync rotation input from prop (while rotating via canvas drag)
  useEffect(() => { setRotInput(rotation.toFixed(1)); }, [rotation]);
  // Sync size inputs from prop (while resizing via canvas drag)
  useEffect(() => { setWInput(String(cropW || '')); }, [cropW]);
  useEffect(() => { setHInput(String(cropH || '')); }, [cropH]);

  const handleApply = async () => {
    setApplying(true);
    try { await onApply(); } finally { setApplying(false); }
  };

  const commitRotInput = () => {
    const v = parseFloat(rotInput);
    if (!isNaN(v)) onRotation(Math.max(-180, Math.min(180, v)));
  };

  const commitSize = () => {
    const w = parseInt(wInput, 10), h = parseInt(hInput, 10);
    if (w > 0 && h > 0) onApplySize?.(w, h);
  };

  const sliderRot = Math.max(-45, Math.min(45, rotation));

  // Build full preset list for the dropdown
  const allPresets: AspectEntry[] = [
    ...(originalAspect != null
      ? [{ label: 'Original', value: originalAspect }]
      : []),
    ...BASE_ASPECT_RATIOS,
  ];

  // Which select option is active? (never '__custom__' — custom is a separate UI)
  const selectValue = (() => {
    if (aspectRatio === null) return 'Free';
    const m = allPresets.find(ar => ar.value !== null && Math.abs((ar.value as number) - aspectRatio) < 0.0005);
    return m ? m.label : '';   // empty string = custom active, nothing highlighted in dropdown
  })();

  // Apply a preset or custom entry (also pushes to recents)
  const applyAspect = (ar: AspectEntry) => {
    onAspect(ar.value);
    if (ar.value !== null && ar.label !== 'Original') {
      setRecentAspects(prev => {
        const next = [ar, ...prev.filter(r => r.label !== ar.label)].slice(0, MAX_RECENTS);
        saveRecents(next);
        return next;
      });
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const preset = allPresets.find(ar => ar.label === val);
    if (preset) { setShowCustom(false); applyAspect(preset); }
  };

  const applyCustom = () => {
    const w = parseFloat(customW), h = parseFloat(customH);
    if (w > 0 && h > 0) {
      // Simplify label to integers when possible
      const gcd = (a: number, b: number): number => b < 0.001 ? a : gcd(b, a % b);
      const scale = 100;
      const iw = Math.round(w * scale), ih = Math.round(h * scale);
      const g = gcd(iw, ih);
      const label = `${iw / g}:${ih / g}`;
      applyAspect({ label, value: w / h });
      setShowCustom(false);
    }
  };

  const removeRecent = (label: string) => {
    setRecentAspects(prev => {
      const next = prev.filter(r => r.label !== label);
      saveRecents(next);
      return next;
    });
  };

  return (
    <div className="p-3 flex flex-col gap-3">

      {/* ── Straighten tool ────────────────────────────────── */}
      <div>
        <p className="text-xs text-gray-400 mb-1.5 font-medium tracking-wide uppercase">Straighten</p>
        <button
          onClick={() => onStraightenMode(!straightenMode)}
          title="Click and drag along any straight edge in the photo"
          className={`w-full py-1.5 text-xs rounded font-medium transition-colors ${
            straightenMode
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          {straightenMode ? '✕ Cancel Straighten' : '⟋ Straighten by Line'}
        </button>
        {straightenMode && (
          <p className="text-xs text-gray-500 mt-1">
            Drag a line along a horizon or straight edge
          </p>
        )}
      </div>

      {/* ── Aspect Ratio ───────────────────────────────────── */}
      <div>
        <p className="text-xs text-gray-400 mb-1.5 font-medium tracking-wide uppercase">
          Aspect Ratio
        </p>

        {/* Dropdown + Custom button on same row */}
        <div className="flex items-center gap-2">
          <select
            value={selectValue}
            onChange={handleSelectChange}
            className="px-2 py-1.5 text-xs rounded bg-gray-700 text-gray-200 border border-gray-600 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            {selectValue === '' && (
              <option value="" disabled>Custom</option>
            )}
            {allPresets.map(ar => (
              <option key={ar.label} value={ar.label}>{ar.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowCustom(v => !v)}
            title="Enter a custom aspect ratio"
            className={`px-2 py-1.5 text-xs rounded font-medium transition-colors whitespace-nowrap ${
              showCustom
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Custom
          </button>
        </div>

        {/* Custom ratio inputs */}
        {showCustom && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <input
              type="number" min="0.1" step="0.1" placeholder="W"
              value={customW}
              onChange={e => setCustomW(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCustom(); } }}
              className="w-14 px-1.5 py-1 text-xs rounded bg-gray-600 text-gray-200 border border-gray-500 focus:outline-none focus:border-blue-500 tabular-nums"
            />
            <span className="text-xs text-gray-500">:</span>
            <input
              type="number" min="0.1" step="0.1" placeholder="H"
              value={customH}
              onChange={e => setCustomH(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); applyCustom(); } }}
              className="w-14 px-1.5 py-1 text-xs rounded bg-gray-600 text-gray-200 border border-gray-500 focus:outline-none focus:border-blue-500 tabular-nums"
            />
            <button
              onClick={applyCustom}
              className="flex-1 py-1 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
            >
              Set
            </button>
          </div>
        )}

        {/* Recently used */}
        {recentAspects.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Recent</p>
            <div className="flex flex-wrap gap-1">
              {recentAspects.map(ar => (
                <div key={ar.label} className="flex rounded overflow-hidden">
                  <button
                    onClick={() => applyAspect(ar)}
                    className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                      aspectRatio !== null && ar.value !== null && Math.abs(ar.value - aspectRatio) < 0.0005
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {ar.label}
                  </button>
                  <button
                    onClick={() => removeRecent(ar.label)}
                    title="Remove from recents"
                    className="px-1.5 text-xs bg-gray-700 hover:bg-red-800 text-gray-500 hover:text-gray-200 transition-colors border-l border-gray-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Rotation ───────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">Rotation</p>
          {/* Exact-value number input */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="-180" max="180" step="0.1"
              value={rotInput}
              onChange={e => setRotInput(e.target.value)}
              onBlur={commitRotInput}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitRotInput(); } }}
              className="w-16 px-1 py-0.5 text-xs text-right rounded bg-gray-700 text-gray-200 border border-gray-600 focus:outline-none focus:border-blue-500 tabular-nums"
            />
            <span className="text-xs text-gray-500">°</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRotation(Math.max(-180, rotation - 90))}
            title="Rotate 90° left  (  [  )"
            className="px-2 py-0.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          >
            ↺ 90°
          </button>
          <input
            type="range"
            min="-45" max="45" step="0.1"
            value={sliderRot}
            onChange={e => onRotation(parseFloat(e.target.value))}
            className="flex-1 h-1 accent-blue-500"
          />
          <button
            onClick={() => onRotation(Math.min(180, rotation + 90))}
            title="Rotate 90° right  (  ]  )"
            className="px-2 py-0.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          >
            ↻ 90°
          </button>
        </div>
      </div>

      {/* ── Flip ───────────────────────────────────────────── */}
      <div>
        <p className="text-xs text-gray-400 mb-1.5 font-medium tracking-wide uppercase">Flip</p>
        <div className="flex gap-2">
          <button
            onClick={() => onFlipH(!flipH)}
            className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${
              flipH ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ↔ Horizontal
          </button>
          <button
            onClick={() => onFlipV(!flipV)}
            className={`flex-1 py-1 text-xs rounded font-medium transition-colors ${
              flipV ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ↕ Vertical
          </button>
        </div>
      </div>

      {/* ── Dimensions ─────────────────────────────────────── */}
      <div>
        <p className="text-xs text-gray-400 mb-1.5 font-medium tracking-wide uppercase">Dimensions</p>
        <div className="flex items-center gap-1.5">
          <input
            type="number" min="1" step="1"
            value={wInput}
            onChange={e => setWInput(e.target.value)}
            onBlur={commitSize}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitSize(); } }}
            className="w-20 px-1.5 py-0.5 text-xs rounded bg-gray-700 text-gray-200 border border-gray-600 focus:outline-none focus:border-blue-500 tabular-nums"
          />
          <span className="text-xs text-gray-500">×</span>
          <input
            type="number" min="1" step="1"
            value={hInput}
            onChange={e => setHInput(e.target.value)}
            onBlur={commitSize}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitSize(); } }}
            className="w-20 px-1.5 py-0.5 text-xs rounded bg-gray-700 text-gray-200 border border-gray-600 focus:outline-none focus:border-blue-500 tabular-nums"
          />
          <span className="text-xs text-gray-500">px</span>
        </div>
      </div>

      {/* ── Grid overlay ───────────────────────────────────── */}
      {onCycleGrid && (
        <div>
          <p className="text-xs text-gray-400 mb-1.5 font-medium tracking-wide uppercase">Grid</p>
          <button
            onClick={onCycleGrid}
            className="w-full py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          >
            Cycle Grid  <span className="text-gray-500">(O)</span>
          </button>
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-700">
        <div className="flex gap-2">
          <button
            onClick={onReset}
            disabled={applying}
            className="flex-1 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={handleApply}
            disabled={applying}
            className="flex-1 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold transition-colors disabled:opacity-50"
          >
            {applying ? 'Applying…' : 'Apply  ↵'}
          </button>
        </div>
        <button
          onClick={onCancel}
          disabled={applying}
          className="w-full py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-400 rounded transition-colors disabled:opacity-50"
        >
          Cancel  Esc
        </button>
      </div>

    </div>
  );
};

export default CropControls;
