import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SplitSquareVertical, Eye } from 'lucide-react';

// Two-panel icon for side-by-side mode
const TwoPanels = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <rect x="3" y="3" width="8" height="18" rx="1"/>
    <rect x="13" y="3" width="8" height="18" rx="1"/>
  </svg>
);

interface Adjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  vibrance?: number;
  exposure: number;
  highlights: number;
  shadows: number;
  sharpness: number;
  temperature?: number;
  tint?: number;
}

interface CompareViewProps {
  originalImage?: string;
  editedImage?: string;
  adjustments?: Adjustments;
}

// ─── SVG filter (mirrors MainCanvas logic, uses a separate filter ID) ──────
const SVG_ID     = 'darkroom-compare-svg';
const FILTER_ID  = 'darkroom-compare-filter';

function buildToneValues(adj: Adjustments): string {
  const N = 33;
  return Array.from({ length: N }, (_, i) => {
    const p = i / (N - 1);
    let v = p * Math.pow(2, adj.exposure * 3 / 110);
    if (adj.brightness !== 0) {
      const gamma = Math.pow(2, -adj.brightness * 1.1 / 50);
      v = Math.pow(Math.max(0, Math.min(1, v)), gamma);
    }
    if (adj.contrast !== 0) {
      const amount = adj.contrast / 50;
      const mid = v - 0.5;
      v = v + amount * mid * (1 - 4 * mid * mid);
    }
    if (adj.highlights !== 0) {
      const vc = Math.max(0, Math.min(1, v));
      const hw = Math.pow(Math.max(0, (vc - 0.5) / 0.5), 2);
      v += (adj.highlights / 100) * hw * 0.9;
    }
    if (adj.shadows !== 0) {
      const vc = Math.max(0, Math.min(1, v));
      const sw = Math.pow(Math.max(0, (0.5 - vc) / 0.5), 2);
      v += (adj.shadows / 100) * sw * 0.9;
    }
    return Math.max(0, Math.min(1, v)).toFixed(4);
  }).join(' ');
}

const M_BRAD = [[0.8951,0.2664,-0.1614],[-0.7502,1.7135,0.0367],[0.0389,-0.0685,1.0296]];
const M_BRAD_INV = [[0.9869929,-0.1470543,0.1599627],[0.4323053,0.5183603,0.0492912],[-0.0085287,0.0400428,0.9684867]];
const M_RGB_XYZ = [[0.4124564,0.3575761,0.1804375],[0.2126729,0.7151522,0.0721750],[0.0193339,0.1191920,0.9503041]];
const M_XYZ_RGB = [[3.2404542,-1.5371385,-0.4985314],[-0.9692660,1.8760108,0.0415560],[0.0556434,-0.2040259,1.0572252]];
const D65 = [0.95047, 1.0, 1.08883];

function mm3(A: number[][], B: number[][]): number[][] {
  const C = [[0,0,0],[0,0,0],[0,0,0]] as number[][];
  for (let i=0;i<3;i++) for (let j=0;j<3;j++) for (let k=0;k<3;k++) C[i][j]+=A[i][k]*B[k][j];
  return C;
}
function mv3(M: number[][], v: number[]) { return [0,1,2].map(i=>M[i][0]*v[0]+M[i][1]*v[1]+M[i][2]*v[2]); }
function kelvinToXYZ(K: number) {
  const T = Math.max(1667, Math.min(25000, K));
  const x = T<=4000 ? -0.2661239e9/T**3-0.2343589e6/T**2+877.6956/T+0.179910 : -3.0258469e9/T**3+2.1070379e6/T**2+222.6347/T+0.240390;
  const y = T<=2222 ? -1.1063814*x**3-1.34811020*x**2+2.18555832*x-0.20219683 : T<=4000 ? -0.9549476*x**3-1.37418593*x**2+2.09137015*x-0.16748867 : 3.0817580*x**3-5.87338670*x**2+3.75112997*x-0.37001483;
  return [x/y, 1.0, (1-x-y)/y];
}
function buildCATMatrix(temp: number, tint: number): number[][] | null {
  if (Math.abs(temp)<0.5 && Math.abs(tint)<0.5) return null;
  const K    = Math.max(1667, 6500 - temp * 80);
  const dst  = kelvinToXYZ(K);
  const sLMS = mv3(M_BRAD, D65);
  const dLMS = mv3(M_BRAD, dst);
  const D    = [[dLMS[0]/sLMS[0],0,0],[0,dLMS[1]/sLMS[1],0],[0,0,dLMS[2]/sLMS[2]]];
  const M    = mm3(M_XYZ_RGB, mm3(mm3(M_BRAD_INV, mm3(D, M_BRAD)), M_RGB_XYZ));
  if (Math.abs(tint)>0.5) { const t=tint/50; for (let j=0;j<3;j++) { M[0][j]*=(1+t*0.05); M[1][j]*=(1-t*0.10); M[2][j]*=(1+t*0.05); } }
  return M;
}
function catToSvg(M: number[][]): string {
  const f = (v: number) => v.toFixed(6);
  return `${f(M[0][0])} ${f(M[0][1])} ${f(M[0][2])} 0 0  ${f(M[1][0])} ${f(M[1][1])} ${f(M[1][2])} 0 0  ${f(M[2][0])} ${f(M[2][1])} ${f(M[2][2])} 0 0  0 0 0 1 0`;
}

function useCompareFilter(adj: Adjustments | undefined): string {
  useEffect(() => {
    if (!document.getElementById(SVG_ID)) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
      svg.id = SVG_ID;
      svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
      svg.setAttribute('aria-hidden', 'true');
      document.body.appendChild(svg);
    }
    return () => { document.getElementById(SVG_ID)?.remove(); };
  }, []);

  useEffect(() => {
    const container = document.getElementById(SVG_ID);
    if (!container || !adj) { if (container) container.innerHTML = ''; return; }
    const toneTable = buildToneValues(adj);
    const cat = buildCATMatrix(adj.temperature ?? 0, adj.tint ?? 0);
    const colorXml = cat
      ? `<feComponentTransfer in="toned" result="li"><feFuncR type="gamma" amplitude="1" exponent="2.2" offset="0"/><feFuncG type="gamma" amplitude="1" exponent="2.2" offset="0"/><feFuncB type="gamma" amplitude="1" exponent="2.2" offset="0"/></feComponentTransfer><feColorMatrix type="matrix" values="${catToSvg(cat)}" in="li" result="lo"/><feComponentTransfer in="lo" result="colorized"><feFuncR type="gamma" amplitude="1" exponent="0.4545" offset="0"/><feFuncG type="gamma" amplitude="1" exponent="0.4545" offset="0"/><feFuncB type="gamma" amplitude="1" exponent="0.4545" offset="0"/></feComponentTransfer>`
      : `<feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" in="toned" result="colorized"/>`;
    const s = adj.sharpness;
    let sharpXml = '';
    if (s > 1.02) {
      const amount = Math.min(2.0, (s-1.0)*1.5).toFixed(4);
      const k2 = (1+parseFloat(amount)).toFixed(4);
      const k3 = (-parseFloat(amount)).toFixed(4);
      const radius = (0.6+(s-1.0)*0.5).toFixed(2);
      sharpXml = `<feGaussianBlur in="colorized" stdDeviation="${radius}" result="usm_blur"/><feComposite in="colorized" in2="usm_blur" operator="arithmetic" k1="0" k2="${k2}" k3="${k3}" k4="0" result="sharpened"/>`;
    } else if (s < 0.98) {
      const sd = (0.5 + (1.0-s)*2.5).toFixed(2);
      sharpXml = `<feGaussianBlur in="colorized" stdDeviation="${sd}" result="sharpened"/>`;
    }
    const finalIn = sharpXml ? 'sharpened' : 'colorized';
    container.innerHTML = `<filter id="${FILTER_ID}" color-interpolation-filters="sRGB" x="0%" y="0%" width="100%" height="100%"><feComponentTransfer result="toned"><feFuncR type="table" tableValues="${toneTable}"/><feFuncG type="table" tableValues="${toneTable}"/><feFuncB type="table" tableValues="${toneTable}"/></feComponentTransfer>${colorXml}${sharpXml}<feComponentTransfer in="${finalIn}"><feFuncR type="identity"/></feComponentTransfer></filter>`;
  }, [adj]);

  if (!adj) return '';
  const saturate = Math.max(0, 1 + adj.saturation / 50);
  const vibrance = Math.max(0, 1 + (adj.vibrance ?? 0) / 150);
  return `url(#${FILTER_ID}) saturate(${saturate.toFixed(3)}) saturate(${vibrance.toFixed(3)})`;
}

export const CompareView: React.FC<CompareViewProps> = ({
  originalImage,
  editedImage,
  adjustments,
}) => {
  const [compareMode, setCompareMode] = useState<'slider' | 'sidebyside' | 'overlay'>('slider');

  // Refs for the DOM nodes we update directly — no React state during drag = no re-renders = no jank
  const afterPaneRef   = useRef<HTMLDivElement>(null);
  const dividerRef     = useRef<HTMLDivElement>(null);
  const overlayPaneRef = useRef<HTMLDivElement>(null);
  const sliderWrapRef  = useRef<HTMLDivElement>(null);
  const labelBoxRef    = useRef<HTMLDivElement>(null);

  const cssFilter = useCompareFilter(adjustments);
  const imgSrc = editedImage || originalImage;

  // Size the label overlay to exactly match the displayed (object-contain) image area
  const fitLabelBox = useCallback(() => {
    const wrap = sliderWrapRef.current;
    const box  = labelBoxRef.current;
    if (!wrap || !box) return;
    const img = wrap.querySelector<HTMLImageElement>('img');
    if (!img?.naturalWidth) return;
    const cw = wrap.clientWidth, ch = wrap.clientHeight;
    const ar = img.naturalWidth / img.naturalHeight;
    const dw = ar > cw / ch ? cw : ch * ar;
    const dh = ar > cw / ch ? cw / ar : ch;
    box.style.width  = `${dw}px`;
    box.style.height = `${dh}px`;
  }, []);

  // Cached rect — read once on pointerdown, reused for every pointermove
  const rectRef = useRef<DOMRect | null>(null);

  // Write clip-path and divider position straight to the DOM — no React re-renders
  const applySlider = useCallback((clientX: number) => {
    const rect = rectRef.current;
    if (!rect) return;
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    if (afterPaneRef.current)  afterPaneRef.current.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
    if (dividerRef.current)    dividerRef.current.style.left = `${pct}%`;
  }, []);

  // Native listeners bypass React's synthetic event system entirely — zero per-event overhead
  useEffect(() => {
    const wrap = sliderWrapRef.current;
    if (!wrap) return;

    const onDown = (e: PointerEvent) => {
      rectRef.current = wrap.getBoundingClientRect(); // cache once per drag
      wrap.setPointerCapture(e.pointerId);
      applySlider(e.clientX);
    };
    const onMove = (e: PointerEvent) => {
      if (!wrap.hasPointerCapture(e.pointerId)) return;
      applySlider(e.clientX);
    };

    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('pointermove', onMove, { passive: true });

    const ro = new ResizeObserver(() => {
      rectRef.current = null; // stale after resize — refreshed on next pointerdown
      fitLabelBox();
    });
    ro.observe(wrap);

    return () => {
      wrap.removeEventListener('pointerdown', onDown);
      wrap.removeEventListener('pointermove', onMove);
      ro.disconnect();
    };
  }, [applySlider, fitLabelBox]);

  return (
    <div className="w-full h-full relative bg-[#1a1a1a] overflow-hidden">
      {/* Mode buttons — floating bottom-right */}
      <div className="absolute bottom-3 right-3 z-10 flex gap-1">
        {([
          ['slider',     'Slider split', <SplitSquareVertical className="w-4 h-4" />],
          ['sidebyside', 'Side by side', <TwoPanels />],
          ['overlay',    'Overlay',      <Eye className="w-4 h-4" />],
        ] as [string, string, React.ReactNode][]).map(([mode, label, icon]) => (
          <button
            key={mode}
            onClick={() => setCompareMode(mode as any)}
            className={`p-1.5 rounded transition-colors shadow ${
              compareMode === mode ? 'bg-blue-600 text-white' : 'bg-black/50 hover:bg-black/70 text-gray-300'
            }`}
            title={label}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* ── Slider mode ── */}
      {compareMode === 'slider' && (
        <div
          ref={sliderWrapRef}
          className="absolute inset-0 select-none"
          style={{ cursor: 'col-resize', touchAction: 'none' }}
        >
          {/* BEFORE — always fully visible underneath */}
          <div className="absolute inset-0 flex items-center justify-center">
            {imgSrc
              ? <img src={imgSrc} alt="Before" className="max-w-full max-h-full object-contain pointer-events-none" onLoad={fitLabelBox} draggable={false} />
              : <span className="text-gray-500 text-sm">No image</span>}
          </div>

          {/* AFTER — on top, clip-path controlled via DOM ref */}
          <div
            ref={afterPaneRef}
            className="absolute inset-0 flex items-center justify-center"
            style={{ clipPath: 'inset(0 50% 0 0)', willChange: 'clip-path' }}
          >
            {imgSrc && (
              <img
                src={imgSrc}
                alt="After"
                className="max-w-full max-h-full object-contain pointer-events-none"
                style={{ filter: cssFilter || undefined }}
                draggable={false}
              />
            )}
          </div>

          {/* Divider line + handle */}
          <div
            ref={dividerRef}
            className="absolute top-0 bottom-0 pointer-events-none"
            style={{ left: '50%', transform: 'translateX(-50%)', willChange: 'left' }}
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-white" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center gap-0.5">
              <div className="w-0.5 h-4 bg-gray-600 rounded-full" />
              <div className="w-0.5 h-4 bg-gray-600 rounded-full" />
            </div>
          </div>

          {/* Label overlay — sized to the actual image area via JS, so labels sit at image corners */}
          <div
            ref={labelBoxRef}
            className="pointer-events-none"
            style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <div className="absolute px-2 py-0.5 bg-black/60 rounded text-xs font-medium text-white whitespace-nowrap" style={{ bottom: '8px', right: 'calc(100% + 8px)' }}>Before</div>
            <div className="absolute px-2 py-0.5 bg-black/60 rounded text-xs font-medium text-white whitespace-nowrap" style={{ bottom: '8px', left: 'calc(100% + 8px)' }}>After</div>
          </div>
        </div>
      )}

      {/* ── Side-by-side mode ── */}
      {compareMode === 'sidebyside' && (
        <div className="absolute inset-0 flex">
          <div className="flex-1 flex items-center justify-center relative border-r border-gray-700">
            {imgSrc && <img src={imgSrc} alt="Before" className="max-w-full max-h-full object-contain" draggable={false} />}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/60 rounded text-xs font-medium text-white">Before</div>
          </div>
          <div className="flex-1 flex items-center justify-center relative">
            {imgSrc && <img src={imgSrc} alt="After" className="max-w-full max-h-full object-contain" style={{ filter: cssFilter || undefined }} draggable={false} />}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/60 rounded text-xs font-medium text-white">After</div>
          </div>
        </div>
      )}

      {/* ── Overlay mode ── */}
      {compareMode === 'overlay' && (
        <div className="absolute inset-0">
          {/* AFTER base */}
          <div className="absolute inset-0 flex items-center justify-center">
            {imgSrc && <img src={imgSrc} alt="After" className="max-w-full max-h-full object-contain" style={{ filter: cssFilter || undefined }} draggable={false} />}
          </div>
          {/* BEFORE on top — opacity driven directly via DOM ref, no re-renders */}
          <div ref={overlayPaneRef} className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0.5 }}>
            {imgSrc && <img src={imgSrc} alt="Before" className="max-w-full max-h-full object-contain" draggable={false} />}
          </div>
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded px-3 py-1.5">
            <span className="text-xs text-gray-300">Original</span>
            <input
              type="range" min={0} max={1} step={0.01} defaultValue={0.5}
              onChange={e => { if (overlayPaneRef.current) overlayPaneRef.current.style.opacity = String(1 - Number(e.target.value)); }}
              className="w-28 accent-blue-500"
            />
            <span className="text-xs text-gray-300">Edited</span>
          </div>
        </div>
      )}
    </div>
  );
};