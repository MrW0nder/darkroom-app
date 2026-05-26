import React, { useRef, useEffect, useState } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import { RotateCcw, ChevronDown, ChevronRight, SplitSquareVertical, Copy, Clipboard, CheckCheck } from 'lucide-react';

interface AdjustmentsPanelProps {
  isLocked?: boolean;
  onEditApplied?: () => void;
  onToggleCompare?: () => void;
  compareActive?: boolean;
  hasCopied?: boolean;         // true when clipboard has settings ready to paste
  onCopySettings?: () => void;
  onPasteSettings?: () => void;
  pasteTargetCount?: number;   // how many photos will receive pasted settings
}

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onCommit: (value: number, before: number) => void;
  onReset: () => void;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  adjustmentKey: string;
  isLocked: boolean;
}

const AdjustmentSlider: React.FC<SliderProps> = ({
  label, value, onChange, onCommit, onReset, min = -50, max = 50, step = 1, defaultValue = 0, adjustmentKey, isLocked,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStartValueRef = useRef<number>(value);
  const isAtDefault = Math.abs(value - defaultValue) < 0.001;
  const percentage = ((value - min) / (max - min)) * 100;
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = adjustmentKey === 'sharpness' ? value.toFixed(1) : String(Math.round(value));

  const startEditing = () => {
    if (isLocked) return;
    setInputVal(displayValue);
    setEditing(true);
    setTimeout(() => { inputRef.current?.select(); }, 0);
  };

  const commitEdit = () => {
    setEditing(false);
    const parsed = parseFloat(inputVal);
    if (isNaN(parsed)) return;
    const clamped = Math.max(min, Math.min(max, Math.round(parsed / step) * step));
    const before = value;
    onChange(clamped);
    onCommit(clamped, before);
  };

  const handleInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(false);
  };

  const valueFromX = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return value;
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + pct * (max - min);
    return Math.round(raw / step) * step;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked) return;
    e.preventDefault();
    dragStartValueRef.current = valueRef.current; // capture pre-drag value
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(valueFromX(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.buttons || isLocked) return;
    onChange(valueFromX(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isLocked) return;
    onCommit(valueFromX(e.clientX), dragStartValueRef.current);
  };

  // Non-passive wheel listener so preventDefault() actually stops page scroll
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onCommitRef = useRef(onCommit);
  valueRef.current = value;
  onChangeRef.current = onChange;
  onCommitRef.current = onCommit;

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let scrollTimer: ReturnType<typeof setTimeout>;
    let scrollStartValue: number | null = null;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (scrollStartValue === null) scrollStartValue = valueRef.current; // capture before first tick
      const delta = e.deltaY < 0 ? step : -step;
      const next = Math.max(min, Math.min(max, valueRef.current + delta));
      const stepped = Math.round(next / step) * step;
      onChangeRef.current(stepped);
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        onCommitRef.current(valueRef.current, scrollStartValue ?? valueRef.current);
        scrollStartValue = null;
      }, 400);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => { el.removeEventListener('wheel', onWheel); clearTimeout(scrollTimer); };
  }, [min, max, step]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-300">{label}</label>
        <div className="flex items-center gap-1">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleInputKey}
              className="text-xs text-gray-200 w-8 text-right bg-transparent border-b border-gray-500 outline-none"
            />
          ) : (
            <span
              className="text-xs text-gray-400 w-8 text-right cursor-text hover:text-gray-200 transition-colors"
              onClick={startEditing}
              title="Click to type a value"
            >
              {displayValue}
            </span>
          )}
          <button
            onClick={onReset}
            disabled={isLocked || isAtDefault}
            className={`p-1 rounded transition-colors ${
              isAtDefault || isLocked
                ? 'text-gray-600'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
            }`}
            title={`Reset ${label.toLowerCase()}`}
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`relative w-full select-none ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
        style={{ height: '16px', display: 'flex', alignItems: 'center' }}
      >
        <div className="absolute inset-x-0 h-1.5 rounded-full bg-gray-700 pointer-events-none" />
        <div
          className="absolute left-0 h-1.5 rounded-full bg-blue-600 pointer-events-none"
          style={{ width: `${percentage}%` }}
        />
        <div
          className="absolute w-2.5 h-2.5 bg-white rounded-full shadow pointer-events-none"
          style={{ left: `calc(${percentage}% - 5px)`, top: '50%', transform: 'translateY(-50%)' }}
        />
      </div>
    </div>
  );
};

const AdjustmentsPanel: React.FC<AdjustmentsPanelProps> = ({
  isLocked = false,
  onEditApplied,
  onToggleCompare,
  compareActive = false,
  hasCopied = false,
  onCopySettings,
  onPasteSettings,
  pasteTargetCount = 0,
}) => {
  const [pasteDone, setPasteDone] = useState(false);
  const { state, updateAdjustments } = useEditor();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('panel.adjustments.collapsed') === 'true'
  );
  // Persist collapse state
  useEffect(() => {
    localStorage.setItem('panel.adjustments.collapsed', String(collapsed));
  }, [collapsed]);

  // Preview: update visuals without recording a history entry
  const previewAdjustment = (key: string, value: number) => {
    if (isLocked) return;
    updateAdjustments({ [key]: value }, { recordHistory: false });
  };

  // Commit: record the final value into history, with the pre-drag value for the description.
  // If the slider was moved but returned to its original value, skip history recording entirely.
  const commitAdjustment = (key: string, value: number, before: number) => {
    if (isLocked) return;
    const step = key === 'sharpness' ? 0.001 : 0.5;
    if (Math.abs(value - before) < step) {
      // Returned to original — sync state without logging
      updateAdjustments({ [key]: before }, { recordHistory: false });
      return;
    }
    updateAdjustments({ [key]: value }, { before: { [key]: before } });
    onEditApplied?.();
  };

  // Used by reset buttons — always commits immediately (before = current state value)
  const handleAdjustmentChange = (key: string, value: number) => {
    if (isLocked) return;
    const before = (state.adjustments as any)[key] ?? 0;
    updateAdjustments({ [key]: value }, { before: { [key]: before }, isReset: true });
    onEditApplied?.();
  };

  const resetAllAdjustments = () => {
    if (isLocked) return;
    updateAdjustments({
      brightness: 0, contrast: 0, saturation: 0, vibrance: 0, exposure: 0,
      highlights: 0, shadows: 0, sharpness: 1.0, temperature: 0, tint: 0,
    }, { isReset: true });
    onEditApplied?.();
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div
        className={`px-4 border-b border-gray-700 flex items-center justify-between cursor-pointer select-none transition-all ${collapsed ? 'py-1' : 'py-3'}`}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="flex items-center gap-1.5">
          {collapsed ? <ChevronRight className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          <h3 className={`font-semibold text-white transition-all ${collapsed ? 'text-sm' : 'text-lg'}`}>Adjustments</h3>
        </div>
        {!collapsed && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleCompare?.(); }}
              className={`px-2.5 py-1.5 rounded text-xs flex items-center gap-1 transition-colors ${
                compareActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Before / After comparison"
            >
              <SplitSquareVertical className="w-3 h-3" />
              B/A
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); resetAllAdjustments(); }}
              disabled={isLocked}
              className={`px-2.5 py-1.5 rounded text-xs flex items-center gap-1.5 transition-all ${
                isLocked
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
              title="Reset all adjustments"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        )}
      </div>

      {!collapsed && (
        /* Copy / Paste settings bar */
        onCopySettings && (
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-700 bg-gray-800/80">
            <button
              onClick={onCopySettings}
              disabled={isLocked}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Copy all adjustments from this photo"
            >
              <Copy className="w-3 h-3" />
              Copy Settings
            </button>
            <button
              onClick={() => {
                onPasteSettings?.();
                setPasteDone(true);
                setTimeout(() => setPasteDone(false), 2000);
              }}
              disabled={!hasCopied || pasteTargetCount === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs bg-gray-700 hover:bg-blue-600 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title={hasCopied ? `Paste to all ${pasteTargetCount} other photo${pasteTargetCount !== 1 ? 's' : ''}` : 'Copy settings first'}
            >
              {pasteDone
                ? <><CheckCheck className="w-3 h-3 text-green-400" /><span className="text-green-400">Pasted!</span></>
                : <><Clipboard className="w-3 h-3" />Paste to All ({pasteTargetCount})</>}
            </button>
          </div>
        )
      )}

      {!collapsed && (isLocked ? (
        <div className="p-4">
          <div className="text-center py-8">
            <p className="text-gray-500">Layer is locked</p>
            <p className="text-xs text-gray-600 mt-1">Unlock to make adjustments</p>
          </div>
        </div>
      ) : (
        <div className="p-3 space-y-1.5">
          {/* Tonal range — Lightroom order: Exposure → Contrast → Highlights → Shadows → Brightness */}
          <AdjustmentSlider label="Exposure" adjustmentKey="exposure" value={state.adjustments.exposure} isLocked={isLocked} onChange={(v) => previewAdjustment('exposure', v)} onCommit={(v, b) => commitAdjustment('exposure', v, b)} onReset={() => handleAdjustmentChange('exposure', 0)} />
          <AdjustmentSlider label="Contrast" adjustmentKey="contrast" value={state.adjustments.contrast} isLocked={isLocked} onChange={(v) => previewAdjustment('contrast', v)} onCommit={(v, b) => commitAdjustment('contrast', v, b)} onReset={() => handleAdjustmentChange('contrast', 0)} />
          <AdjustmentSlider label="Highlights" adjustmentKey="highlights" value={state.adjustments.highlights} isLocked={isLocked} onChange={(v) => previewAdjustment('highlights', v)} onCommit={(v, b) => commitAdjustment('highlights', v, b)} onReset={() => handleAdjustmentChange('highlights', 0)} />
          <AdjustmentSlider label="Shadows" adjustmentKey="shadows" value={state.adjustments.shadows} isLocked={isLocked} onChange={(v) => previewAdjustment('shadows', v)} onCommit={(v, b) => commitAdjustment('shadows', v, b)} onReset={() => handleAdjustmentChange('shadows', 0)} />
          <AdjustmentSlider label="Brightness" adjustmentKey="brightness" value={state.adjustments.brightness} isLocked={isLocked} onChange={(v) => previewAdjustment('brightness', v)} onCommit={(v, b) => commitAdjustment('brightness', v, b)} onReset={() => handleAdjustmentChange('brightness', 0)} />
          <AdjustmentSlider label="Saturation" adjustmentKey="saturation" value={state.adjustments.saturation} isLocked={isLocked} onChange={(v) => previewAdjustment('saturation', v)} onCommit={(v, b) => commitAdjustment('saturation', v, b)} onReset={() => handleAdjustmentChange('saturation', 0)} />
          <AdjustmentSlider label="Vibrance" adjustmentKey="vibrance" value={(state.adjustments as any).vibrance ?? 0} isLocked={isLocked} onChange={(v) => previewAdjustment('vibrance', v)} onCommit={(v, b) => commitAdjustment('vibrance', v, b)} onReset={() => handleAdjustmentChange('vibrance', 0)} />
          <AdjustmentSlider label="Sharpness" adjustmentKey="sharpness" value={state.adjustments.sharpness} isLocked={isLocked} min={0} max={2} step={0.1} defaultValue={1.0} onChange={(v) => previewAdjustment('sharpness', v)} onCommit={(v, b) => commitAdjustment('sharpness', v, b)} onReset={() => handleAdjustmentChange('sharpness', 1.0)} />
          <AdjustmentSlider label="Temperature" adjustmentKey="temperature" value={(state.adjustments as any).temperature ?? 0} isLocked={isLocked} onChange={(v) => previewAdjustment('temperature', v)} onCommit={(v, b) => commitAdjustment('temperature', v, b)} onReset={() => handleAdjustmentChange('temperature', 0)} />
          <AdjustmentSlider label="Tint" adjustmentKey="tint" value={(state.adjustments as any).tint ?? 0} isLocked={isLocked} onChange={(v) => previewAdjustment('tint', v)} onCommit={(v, b) => commitAdjustment('tint', v, b)} onReset={() => handleAdjustmentChange('tint', 0)} />
        </div>
      ))}
    </div>
  );
};

export default AdjustmentsPanel;
