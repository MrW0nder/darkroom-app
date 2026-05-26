/**
 * MainCanvas - Core image editing canvas using Konva.js
 * Supports layers, real-time adjustments, pan/zoom, and selection tools
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Group, Transformer } from 'react-konva';
import { useEditor } from '../../contexts/EditorContext';
import Konva from 'konva';

// ─── MiniMap ────────────────────────────────────────────────────────────────
const MINIMAP_MAX_W = 200;
const MINIMAP_MAX_H = 150;

interface MiniMapProps {
  imageUrl: string;
  imgW: number;
  imgH: number;
  containerW: number;
  containerH: number;
  stageScale: number;
  stagePos: { x: number; y: number };
  onPan: (newPos: { x: number; y: number }) => void;
}

const MiniMap: React.FC<MiniMapProps> = ({
  imageUrl, imgW, imgH, containerW, containerH, stageScale, stagePos, onPan,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mmScale = Math.min(MINIMAP_MAX_W / imgW, MINIMAP_MAX_H / imgH);
  const mmW = Math.round(imgW * mmScale);
  const mmH = Math.round(imgH * mmScale);

  // Viewport rectangle in minimap coordinate space
  const visLeft   = -stagePos.x / stageScale;
  const visTop    = -stagePos.y / stageScale;
  const visW      = containerW  / stageScale;
  const visH      = containerH  / stageScale;
  const rectX     = visLeft * mmScale;
  const rectY     = visTop  * mmScale;
  const rectW     = Math.max(4, visW * mmScale);
  const rectH     = Math.max(4, visH * mmScale);

  const panTo = useCallback((clientX: number, clientY: number) => {
    if (!wrapperRef.current) return;
    const bounds = wrapperRef.current.getBoundingClientRect();
    const mx = clientX - bounds.left;
    const my = clientY - bounds.top;
    const imageX = mx / mmScale;
    const imageY = my / mmScale;
    onPan({
      x: containerW / 2 - imageX * stageScale,
      y: containerH / 2 - imageY * stageScale,
    });
  }, [mmScale, stageScale, containerW, containerH, onPan]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    panTo(e.clientX, e.clientY);
    const onMove = (ev: MouseEvent) => panTo(ev.clientX, ev.clientY);
    const onUp   = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
  };

  return (
    <div
      ref={wrapperRef}
      style={{ width: mmW, height: mmH, position: 'relative', cursor: 'crosshair', userSelect: 'none', flexShrink: 0 }}
      onMouseDown={handleMouseDown}
    >
      <img
        src={imageUrl}
        draggable={false}
        style={{ width: mmW, height: mmH, display: 'block', pointerEvents: 'none' }}
      />
      {/* Viewport rectangle */}
      <div style={{
        position:  'absolute',
        left:      rectX,
        top:       rectY,
        width:     rectW,
        height:    rectH,
        border:    '1.5px solid rgba(255,255,255,0.9)',
        background:'rgba(255,255,255,0.07)',
        boxShadow: '0 0 0 1px rgba(0,0,0,0.6)',
        pointerEvents: 'none',
      }} />
    </div>
  );
};

interface MainCanvasProps {
  imageUrl: string;
  recenterNonce?: number;
  resetZoomNonce?: number;
  showMinimap?: boolean;
  adjustments?: {
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
    // Color grading wheels
    shadowHue?: number; shadowSat?: number; shadowLum?: number;
    midtoneHue?: number; midtoneSat?: number; midtoneLum?: number;
    highlightHue?: number; highlightSat?: number; highlightLum?: number;
  };
}

// ─── Tone curve ─────────────────────────────────────────────────────────────
// Builds a 17-point lookup table applied identically to R, G, B channels via
// SVG feComponentTransfer. Each adjustment does a distinct mathematical thing:
// ─── Tone ordering matches Lightroom's pipeline ─────────────────────────────
//   Exposure   — multiplicative EV shift (clips highlights like a real sensor)
//   Brightness — gamma/power curve anchored at black+white, lifts midtones only
//   Contrast   — S-curve pivot at midpoint (never pushes blacks or whites)
//   Highlights — cubic weight that is zero below midtone, reaches 1 only at pure white
//   Shadows    — cubic weight that is zero above midtone, reaches 1 only at pure black
function buildToneTableValues(adj: NonNullable<MainCanvasProps['adjustments']>): string {
  const N = 33; // more points = smoother curve
  return Array.from({ length: N }, (_, i) => {
    const p = i / (N - 1);  // 0 → 1

    // 1. Exposure: true EV multiplication in LINEAR light (±3 EV range).
    // Input p is gamma-encoded sRGB, so we must account for that:
    //   v_out_sRGB = (p^2.2 * 2^EV)^(1/2.2) = p * 2^(EV/2.2)
    // Using 50*2.2 (=110) as the divisor keeps ±3 EV in linear at the extremes.
    let v = p * Math.pow(2, adj.exposure * 3 / 110);

    // 2. Brightness: gamma power-curve (Lightroom style)
    //    exponent < 1 lifts midtones; exponent > 1 darkens them.
    //    Blacks stay 0, whites stay 1 — only midtones shift.
    if (adj.brightness !== 0) {
      const gamma = Math.pow(2, -adj.brightness * 1.1 / 50);
      v = Math.pow(Math.max(0, Math.min(1, v)), gamma);
    }

    // 3. Contrast: TRUE cubic S-curve (leaves 0, 0.5, 1 unchanged; cannot clip)
    //    f(v) = v + amount * (v - 0.5) * (1 - 4*(v-0.5)²)
    //    This lifts bright tones and crushes dark tones smoothly — identical to
    //    how Lightroom's contrast slider works on the tone curve.
    if (adj.contrast !== 0) {
      const amount = adj.contrast / 50;
      const mid = v - 0.5;
      v = v + amount * mid * (1 - 4 * mid * mid);
    }

    // 4. Highlights: ONLY top half of tonal range.
    //    Weight is based on *current* v (post-exposure/brightness/contrast) so that
    //    over-exposed pixels are correctly targeted — not the original p.
    //    Quadratic ramp: 0 at v≤0.5, rises to 1 at v=1.
    if (adj.highlights !== 0) {
      const vc = Math.max(0, Math.min(1, v));
      const hw = Math.pow(Math.max(0, (vc - 0.5) / 0.5), 2);
      v += (adj.highlights / 100) * hw * 0.9;
    }

    // 5. Shadows: ONLY bottom half of tonal range.
    //    Same principle — use current v so under-exposed pixels are correctly targeted.
    //    Quadratic ramp: 0 at v≥0.5, rises to 1 at v=0.
    if (adj.shadows !== 0) {
      const vc = Math.max(0, Math.min(1, v));
      const sw = Math.pow(Math.max(0, (0.5 - vc) / 0.5), 2);
      v += (adj.shadows / 100) * sw * 0.9;
    }

    return Math.max(0, Math.min(1, v)).toFixed(4);
  }).join(' ');
}

// ─── Bradford CAT (Chromatic Adaptation Transform) ──────────────────────────
// Full Kelvin-based white balance with Bradford matrix — matches Lightroom math.
// Pipeline (per slider change, GPU-side in SVG filter):
//   sRGB → de-gamma(2.2) → XYZ_D65 → Bradford LMS → scale by illuminant ratio
//      → Bradford back → XYZ → linear sRGB → re-gamma(1/2.2) → sRGB
// Temperature slider: +50 = ~2500 K (warm/tungsten), 0 = 6500 K (D65), -50 = ~10500 K (cool/sky)
// Tint slider: +50 = magenta, -50 = green (perpendicular to Planckian locus)

// Bradford XYZ → cone-like LMS
const M_BRAD: number[][] = [
  [ 0.8951,  0.2664, -0.1614],
  [-0.7502,  1.7135,  0.0367],
  [ 0.0389, -0.0685,  1.0296],
];
const M_BRAD_INV: number[][] = [
  [ 0.9869929, -0.1470543,  0.1599627],
  [ 0.4323053,  0.5183603,  0.0492912],
  [-0.0085287,  0.0400428,  0.9684867],
];
// Linear sRGB (D65) ↔ CIE XYZ  (IEC 61966-2-1)
const M_RGB_XYZ: number[][] = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.0721750],
  [0.0193339, 0.1191920, 0.9503041],
];
const M_XYZ_RGB: number[][] = [
  [ 3.2404542, -1.5371385, -0.4985314],
  [-0.9692660,  1.8760108,  0.0415560],
  [ 0.0556434, -0.2040259,  1.0572252],
];
const D65_XYZ: number[] = [0.95047, 1.0, 1.08883];

function mm3(A: number[][], B: number[][]): number[][] {
  const C = [[0,0,0],[0,0,0],[0,0,0]] as number[][];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      for (let k = 0; k < 3; k++)
        C[i][j] += A[i][k] * B[k][j];
  return C;
}
function mv3(M: number[][], v: number[]): number[] {
  return [0,1,2].map(i => M[i][0]*v[0] + M[i][1]*v[1] + M[i][2]*v[2]);
}

// Planckian locus: Kelvin → CIE 1931 XYZ (Kim et al. 2002 approximation)
function kelvinToXYZ(K: number): number[] {
  const T = Math.max(1667, Math.min(25000, K));
  let x: number;
  if (T <= 4000) {
    x = -0.2661239e9 / Math.pow(T,3) - 0.2343589e6 / Math.pow(T,2) + 877.6956 / T + 0.179910;
  } else {
    x = -3.0258469e9 / Math.pow(T,3) + 2.1070379e6 / Math.pow(T,2) + 222.6347 / T + 0.240390;
  }
  let y: number;
  if (T <= 2222) {
    y = -1.1063814*Math.pow(x,3) - 1.34811020*Math.pow(x,2) + 2.18555832*x - 0.20219683;
  } else if (T <= 4000) {
    y = -0.9549476*Math.pow(x,3) - 1.37418593*Math.pow(x,2) + 2.09137015*x - 0.16748867;
  } else {
    y =  3.0817580*Math.pow(x,3) - 5.87338670*Math.pow(x,2) + 3.75112997*x - 0.37001483;
  }
  return [x / y, 1.0, (1 - x - y) / y];
}

// Returns a linear-RGB → linear-RGB 3×3 CAT matrix, or null when both sliders are zero.
function buildCATMatrix(tempSlider: number, tintSlider: number): number[][] | null {
  if (Math.abs(tempSlider) < 0.5 && Math.abs(tintSlider) < 0.5) return null;
  const K = Math.max(1667, 6500 - tempSlider * 80);
  const dstXYZ = kelvinToXYZ(K);
  const srcLMS = mv3(M_BRAD, D65_XYZ);
  const dstLMS = mv3(M_BRAD, dstXYZ);
  const D = [
    [dstLMS[0]/srcLMS[0], 0, 0],
    [0, dstLMS[1]/srcLMS[1], 0],
    [0, 0, dstLMS[2]/srcLMS[2]],
  ];
  const catXYZ = mm3(M_BRAD_INV, mm3(D, M_BRAD));           // XYZ CAT matrix
  const M = mm3(M_XYZ_RGB, mm3(catXYZ, M_RGB_XYZ));        // linear RGB domain
  // Tint: green-magenta axis  (+t = magenta: reduce G, boost R+B)
  if (Math.abs(tintSlider) > 0.5) {
    const t = tintSlider / 50;   // -1 … +1
    for (let j = 0; j < 3; j++) {
      M[0][j] *= (1 + t * 0.05);
      M[1][j] *= (1 - t * 0.10);
      M[2][j] *= (1 + t * 0.05);
    }
  }
  return M;
}

function catToSvgValues(M: number[][]): string {
  const f = (v: number) => v.toFixed(6);
  return `${f(M[0][0])} ${f(M[0][1])} ${f(M[0][2])} 0 0  ` +
         `${f(M[1][0])} ${f(M[1][1])} ${f(M[1][2])} 0 0  ` +
         `${f(M[2][0])} ${f(M[2][1])} ${f(M[2][2])} 0 0  ` +
         `0 0 0 1 0`;
}

// ─── Colour-grading wheel SVG primitives ─────────────────────────────────────
// Implements per-tonal-range HSL grading using SVG filter primitives.
// Algorithm: compute luminance → shape into per-range soft mask (alpha channel)
//   → blend hue-rotated / saturated / L-shifted versions using the mask.
// This matches the backend adjust_color_wheels() pipeline closely enough for
// a live preview. The final result is always named "cg_out".
//
// Tonal masks (9-point table, lum = 0, 0.125, …, 1.0):
//   shadow    = clamp(1 − 2·lum, 0, 1)²
//   highlight = clamp(2·lum − 1, 0, 1)²
//   midtone   = 1 − shadow − highlight
const CG_SH_TABLE = '1 0.5625 0.25 0.0625 0 0 0 0 0';
const CG_MT_TABLE = '0 0.4375 0.75 0.9375 1 0.9375 0.75 0.4375 0';
const CG_HL_TABLE = '0 0 0 0 0 0.0625 0.25 0.5625 1';

function buildColorGradingXml(adj: NonNullable<MainCanvasProps['adjustments']>, inputResult: string): string {
  const ranges = [
    { p: 'sh', t: CG_SH_TABLE, hue: adj.shadowHue    ?? 0, sat: adj.shadowSat    ?? 0, lum: adj.shadowLum    ?? 0 },
    { p: 'mt', t: CG_MT_TABLE, hue: adj.midtoneHue   ?? 0, sat: adj.midtoneSat   ?? 0, lum: adj.midtoneLum   ?? 0 },
    { p: 'hl', t: CG_HL_TABLE, hue: adj.highlightHue ?? 0, sat: adj.highlightSat ?? 0, lum: adj.highlightLum ?? 0 },
  ];
  const hasAny = ranges.some(r => Math.abs(r.hue) > 0.5 || Math.abs(r.sat) > 0.5 || Math.abs(r.lum) > 0.5);
  if (!hasAny) return '';

  let xml = '';
  // Luminance of each pixel → alpha channel (BT.709 coefficients)
  xml += `<feColorMatrix type="matrix"
      values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.2126 0.7152 0.0722 0 0"
      in="${inputResult}" result="cg_la"/>`;

  let cur = inputResult;

  for (const r of ranges) {
    const active = Math.abs(r.hue) > 0.5 || Math.abs(r.sat) > 0.5 || Math.abs(r.lum) > 0.5;
    if (!active) continue;

    // Tonal mask: alpha = weight for this range at each pixel.
    // Clip by the source image's own alpha so that transparent canvas
    // pixels (outside the image bounds) never receive a non-zero weight —
    // transparent black has luminance=0 which maps to shadow_weight=1
    // via the feFuncA table, and without this clip it would tint the viewport.
    xml += `<feComponentTransfer in="cg_la" result="${r.p}_msk_raw">
      <feFuncA type="table" tableValues="${r.t}"/>
    </feComponentTransfer>`;
    xml += `<feComposite in="${r.p}_msk_raw" in2="${inputResult}" operator="in" result="${r.p}_msk"/>`;

    if (Math.abs(r.hue) > 0.5) {
      xml += `<feColorMatrix type="hueRotate" values="${r.hue.toFixed(1)}" in="${cur}" result="${r.p}_hr"/>`;
      xml += `<feComposite in="${r.p}_hr" in2="${r.p}_msk" operator="in" result="${r.p}_hi"/>`;
      xml += `<feComposite in="${r.p}_hi" in2="${cur}" operator="over" result="${r.p}_hd"/>`;
      cur = `${r.p}_hd`;
    }

    if (Math.abs(r.sat) > 0.5) {
      const satMult   = Math.max(0, 1 + r.sat / 100).toFixed(3);
      const satBlend  = (r.sat / 100).toFixed(3);
      xml += `<feColorMatrix type="saturate" values="${satMult}" in="${cur}" result="${r.p}_sf"/>`;
      xml += `<feComponentTransfer in="${r.p}_msk" result="${r.p}_sm">
        <feFuncA type="linear" slope="${satBlend}" intercept="0"/>
      </feComponentTransfer>`;
      xml += `<feComposite in="${r.p}_sf" in2="${r.p}_sm" operator="in" result="${r.p}_si"/>`;
      xml += `<feComposite in="${r.p}_si" in2="${cur}" operator="over" result="${r.p}_sd"/>`;
      cur = `${r.p}_sd`;
    }

    if (Math.abs(r.lum) > 0.5) {
      const lumFrac  = r.lum / 100; // -0.5…+0.5
      const blend    = Math.abs(lumFrac).toFixed(3);
      const fillCol  = lumFrac > 0 ? 'white' : 'black';
      xml += `<feFlood flood-color="${fillCol}" flood-opacity="1" result="${r.p}_lf"/>`;
      xml += `<feComponentTransfer in="${r.p}_msk" result="${r.p}_lm">
        <feFuncA type="linear" slope="${blend}" intercept="0"/>
      </feComponentTransfer>`;
      xml += `<feComposite in="${r.p}_lf" in2="${r.p}_lm" operator="in" result="${r.p}_li"/>`;
      xml += `<feComposite in="${r.p}_li" in2="${cur}" operator="over" result="${r.p}_ld"/>`;
      cur = `${r.p}_ld`;
    }
  }

  // Normalise output name
  xml += `<feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" in="${cur}" result="cg_out"/>`;
  return xml;
}

// ─── CSS filter (post SVG) ───────────────────────────────────────────────────
// Only saturation stays here — sharpness is now a proper unsharp mask inside
// the SVG filter, and the tone curve + white balance are handled by SVG too.
function buildCssFilter(adj: NonNullable<MainCanvasProps['adjustments']>, svgId: string): string {
  const saturate = Math.max(0, 1 + adj.saturation / 50);
  // Vibrance: gentler saturation boost (divisor 150) — boosts muted colours
  // without over-blowing already vivid ones (CSS approximation)
  const vibrance = Math.max(0, 1 + (adj.vibrance ?? 0) / 150);
  return `url(#${svgId}) saturate(${saturate.toFixed(3)}) saturate(${vibrance.toFixed(3)})`;
}

// ─── SVG filter hook ─────────────────────────────────────────────────────────
// Injects a hidden <svg> with a <filter> into document.body and hot-swaps its
// contents whenever adjustments change.  The filter ID is stable so the CSS
// url(#id) reference always resolves without any flicker.
const SVG_CONTAINER_ID = 'darkroom-adj-svg';
const SVG_FILTER_ID    = 'darkroom-adj-filter';

function useSvgFilter(adj: MainCanvasProps['adjustments']): string {
  // Create the hidden SVG container once on mount; tear it down on unmount.
  useEffect(() => {
    if (!document.getElementById(SVG_CONTAINER_ID)) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
      svg.id = SVG_CONTAINER_ID;
      svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
      svg.setAttribute('aria-hidden', 'true');
      document.body.appendChild(svg);
    }
    return () => { document.getElementById(SVG_CONTAINER_ID)?.remove(); };
  }, []);

  // Rewrite the filter whenever any adjustment value changes.
  useEffect(() => {
    const container = document.getElementById(SVG_CONTAINER_ID);
    if (!container) return;
    if (!adj) { container.innerHTML = ''; return; }

    const toneTable = buildToneTableValues(adj);
    const catMatrix  = buildCATMatrix(adj.temperature ?? 0, adj.tint ?? 0);
    const cgXml      = buildColorGradingXml(adj, 'colorized');
    const cgResult   = cgXml ? 'cg_out' : 'colorized';

    // White-balance XML: Bradford CAT with proper sRGB→linear de-gamma before the matrix
    // and linear→sRGB re-gamma after. Falls back to identity when both sliders are zero.
    let colorXml: string;
    if (catMatrix) {
      const mv = catToSvgValues(catMatrix);
      colorXml = `
        <feComponentTransfer in="toned" result="linear_in">
          <feFuncR type="gamma" amplitude="1" exponent="2.2" offset="0"/>
          <feFuncG type="gamma" amplitude="1" exponent="2.2" offset="0"/>
          <feFuncB type="gamma" amplitude="1" exponent="2.2" offset="0"/>
        </feComponentTransfer>
        <feColorMatrix type="matrix" values="${mv}" in="linear_in" result="linear_out"/>
        <feComponentTransfer in="linear_out" result="colorized">
          <feFuncR type="gamma" amplitude="1" exponent="0.4545" offset="0"/>
          <feFuncG type="gamma" amplitude="1" exponent="0.4545" offset="0"/>
          <feFuncB type="gamma" amplitude="1" exponent="0.4545" offset="0"/>
        </feComponentTransfer>`;
    } else {
      colorXml = `
        <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" in="toned" result="colorized"/>`;
    }

    // Sharpness: real unsharp mask (subtract blurred copy from original).
    // Formula: result = (1+amount)*original − amount*blurred
    // At amount=0 (sharpness=1.0) this is the identity transform.
    let sharpnessXml = '';
    const s = adj.sharpness;
    if (s > 1.02) {
      const amount = Math.min(2.0, (s - 1.0) * 1.5).toFixed(4);
      const k2     = (1 + parseFloat(amount)).toFixed(4);
      const k3     = (-parseFloat(amount)).toFixed(4);
      const radius  = (0.6 + (s - 1.0) * 0.5).toFixed(2);
      sharpnessXml = `
        <feGaussianBlur in="${cgResult}" stdDeviation="${radius}" result="usm_blur"/>
        <feComposite in="${cgResult}" in2="usm_blur" operator="arithmetic"
                     k1="0" k2="${k2}" k3="${k3}" k4="0" result="sharpened"/>`;
    } else if (s < 0.98) {
      const blurR = ((1.0 - s) * 2.0).toFixed(2);
      sharpnessXml = `
        <feGaussianBlur in="${cgResult}" stdDeviation="${blurR}" result="sharpened"/>`;
    }

    void (sharpnessXml.length > 0);
    container.innerHTML = `<defs>
      <filter id="${SVG_FILTER_ID}" color-interpolation-filters="sRGB"
              x="0%" y="0%" width="100%" height="100%">
        <feComponentTransfer result="toned">
          <feFuncR type="table" tableValues="${toneTable}"/>
          <feFuncG type="table" tableValues="${toneTable}"/>
          <feFuncB type="table" tableValues="${toneTable}"/>
        </feComponentTransfer>${colorXml}${cgXml}${sharpnessXml}
      </filter>
    </defs>`;
  }, [adj]);

  return SVG_FILTER_ID;
}

// Custom hook for loading images
const useImageLoader = (imageUrl: string): HTMLImageElement | null => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setImage(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.onerror = () => {
      console.error('Failed to load image:', imageUrl);
      setImage(null);
    };
    img.src = imageUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  return image;
};

// Custom hook — loads the image and computes the live CSS filter string.
// The filter references the SVG filter managed by useSvgFilter().
const useAdjustedImage = (imageUrl: string, adjustments?: MainCanvasProps['adjustments'], svgId?: string) => {
  const image = useImageLoader(imageUrl);
  const cssFilter = (adjustments && svgId) ? buildCssFilter(adjustments, svgId) : '';
  return { image, cssFilter };
};

const MainCanvas: React.FC<MainCanvasProps> = ({ 
  imageUrl, 
  recenterNonce, 
  resetZoomNonce, 
  showMinimap,
  adjustments 
}) => {
  const { state, setSelectedLayerId } = useEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1.0);
  const [baseScale, setBaseScale] = useState(1.0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Refs so that event handlers never have stale values despite empty dep arrays
  const baseScaleRef = useRef(1.0);
  const stageScaleRef = useRef(1.0);
  const stagePosRef  = useRef({ x: 0, y: 0 });
  // True when the current view is at fit-to-screen scale/position.
  // Reset to false by any user zoom (wheel). Re-set to true by auto-fit, recenter, or resetZoom.
  // Used to decide whether to re-fit when the container resizes (e.g. sidebar collapse).
  const isAtFitRef = useRef(true);
  // Track which image object we last fitted to. We compare by reference (not URL)
  // because useImageLoader keeps the old HTMLImageElement in state while the new
  // image loads — so the URL can already point to the new image while
  // adjustedImage still has the old dimensions. Object-reference comparison is
  // always synchronous and never races.
  const lastFitImageRef = useRef<HTMLImageElement | null>(null);

  // Self-measure the container so we always have the real available dimensions,
  // independent of any stale props passed from the parent.
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => {
      setContainerSize({ width: el.clientWidth, height: el.clientHeight });
    };
    // RAF ensures layout (incl. sidebar) has fully painted before we read dimensions
    const raf = requestAnimationFrame(update);
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, []);

  const width = containerSize.width;
  const height = containerSize.height;
  
  // Calculate fit-to-screen scale
  const calculateFitScale = useCallback((imgWidth: number, imgHeight: number, viewWidth: number, viewHeight: number) => {
    const scaleX = (viewWidth * 0.9) / imgWidth;
    const scaleY = (viewHeight * 0.9) / imgHeight;
    return Math.min(scaleX, scaleY);
  }, []);

  // Get display zoom percentage (relative to fit-to-screen)
  const getDisplayZoom = useCallback(() => {
    if (baseScale === 0) return 100;
    return Math.round((stageScale / baseScale) * 100);
  }, [stageScale, baseScale]);

  // Inject + manage the SVG filter in the DOM; get its stable ID back.
  const svgFilterId = useSvgFilter(adjustments);

  // Load and apply adjustments to the main image
  const { image: adjustedImage, cssFilter } = useAdjustedImage(imageUrl, adjustments, svgFilterId);
  
  // ── Wheel zoom ──────────────────────────────────────────────────────────────
  // Uses refs so this callback never goes stale even with an empty dep array.
  // Zooms toward the pointer — NOT the image center.
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = stageScaleRef.current;
    const ptr = stage.getPointerPosition() ?? { x: 0, y: 0 };

    // Point in image-space that is currently under the mouse
    const imageX = (ptr.x - stagePosRef.current.x) / oldScale;
    const imageY = (ptr.y - stagePosRef.current.y) / oldScale;

    const zoomFactor = e.evt.deltaY < 0 ? 1.1 : 1 / 1.1;
    const newScale   = oldScale * zoomFactor;
    const minScale   = baseScaleRef.current * 0.05;  // 5% of fit-to-screen
    const maxScale   = baseScaleRef.current * 20.0;  // 2000% of fit-to-screen
    const clamped    = Math.max(minScale, Math.min(maxScale, newScale));

    // User is now at a custom zoom — don't re-fit on container resize
    isAtFitRef.current = false;

    // Keep the image-space point under the mouse stationary
    const newPos = {
      x: ptr.x - imageX * clamped,
      y: ptr.y - imageY * clamped,
    };

    stage.scale({ x: clamped, y: clamped });
    stage.position(newPos);
    stageScaleRef.current = clamped;
    stagePosRef.current   = newPos;
    setStageScale(clamped);
    setStagePos(newPos);
  }, []); // empty — intentional, we use refs above

  // ── Pan (drag) ──────────────────────────────────────────────────────────────
  const handleDragStart = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === stageRef.current) setIsDragging(true);
  }, []);

  const handleDragMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current) return;
    stagePosRef.current = { x: e.target.x(), y: e.target.y() };
  }, []);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== stageRef.current) return;
    const pos = { x: e.target.x(), y: e.target.y() };
    stagePosRef.current = pos;
    setStagePos(pos);
    setIsDragging(false);
  }, []);

  // Handle selection
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Clicking empty canvas space does nothing — we never deselect the active layer
    // because that would clear selectedImageUrl and black out the canvas.
  }, []);

  // Handle layer click
  const handleLayerClick = useCallback((layerId: string) => {
    setSelectedId(layerId);
    const numericId = parseInt(layerId.replace('layer-', ''));
    if (!isNaN(numericId)) setSelectedLayerId(numericId);
  }, [setSelectedLayerId]);

  // Update transformer when selection changes
  useEffect(() => {
    if (!transformerRef.current) return;
    
    const transformer = transformerRef.current;
    const stage = transformer.getStage();
    if (!stage) return;

    if (selectedId) {
      const selectedNode = stage.findOne(`#${selectedId}`);
      if (selectedNode) {
        transformer.nodes([selectedNode]);
        transformer.getLayer()?.batchDraw();
      }
    } else {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedId]);

  // Handle recenter to fit-to-screen
  useEffect(() => {
    if (!recenterNonce || !stageRef.current || !adjustedImage) return;
    const stage = stageRef.current;
    const fitScale = calculateFitScale(adjustedImage.naturalWidth, adjustedImage.naturalHeight, width, height);
    baseScaleRef.current = fitScale;
    setBaseScale(fitScale);
    const x = (width  - adjustedImage.naturalWidth  * fitScale) / 2;
    const y = (height - adjustedImage.naturalHeight * fitScale) / 2;
    stage.scale({ x: fitScale, y: fitScale });
    stage.position({ x, y });
    stageScaleRef.current = fitScale;
    stagePosRef.current   = { x, y };
    setStageScale(fitScale);
    setStagePos({ x, y });
    isAtFitRef.current = true;
  }, [recenterNonce, adjustedImage, width, height, calculateFitScale]);

  // Auto-fit when image first loads OR when a new image object arrives (switched image).
  // On subsequent container resizes we only update baseScale (for the % display)
  // but do NOT re-center — the user may have panned/zoomed to a specific area.
  //
  // We compare the adjustedImage *object reference* (not the URL string) because
  // useImageLoader keeps the old HTMLImageElement alive while the new image loads.
  // Using the URL would fire the fit with stale dimensions the moment imageUrl
  // changes, before the new image's naturalWidth/Height are known.
  useEffect(() => {
    if (!adjustedImage || !stageRef.current || width === 0 || height === 0) return;
    const stage = stageRef.current;
    const fitScale = calculateFitScale(adjustedImage.naturalWidth, adjustedImage.naturalHeight, width, height);

    baseScaleRef.current = fitScale;
    setBaseScale(fitScale);

    // True when a brand-new image object has loaded (first load OR switched image)
    const newImage = adjustedImage !== lastFitImageRef.current;
    if (newImage) lastFitImageRef.current = adjustedImage;

    if (!isInitialized || newImage) {
      const x = (width  - adjustedImage.naturalWidth  * fitScale) / 2;
      const y = (height - adjustedImage.naturalHeight * fitScale) / 2;
      stage.scale({ x: fitScale, y: fitScale });
      stage.position({ x, y });
      stageScaleRef.current = fitScale;
      stagePosRef.current   = { x, y };
      setStageScale(fitScale);
      setStagePos({ x, y });
      isAtFitRef.current = true;
      if (!isInitialized) setIsInitialized(true);
    } else if (isAtFitRef.current) {
      // Container resized (e.g. sidebar collapsed) while view was at fit — re-fit.
      const x = (width  - adjustedImage.naturalWidth  * fitScale) / 2;
      const y = (height - adjustedImage.naturalHeight * fitScale) / 2;
      stage.scale({ x: fitScale, y: fitScale });
      stage.position({ x, y });
      stageScaleRef.current = fitScale;
      stagePosRef.current   = { x, y };
      setStageScale(fitScale);
      setStagePos({ x, y });
    }
  }, [adjustedImage, width, height, isInitialized, calculateFitScale]);
  // ↑ imageUrl and getDisplayZoom deliberately omitted — imageUrl changes before the
  //   new image loads (stale dims); getDisplayZoom reads stageScale causing scroll resets.

  // Handle zoom reset to fit-to-screen (same logic as recenter)
  useEffect(() => {
    if (!resetZoomNonce || !stageRef.current || !adjustedImage) return;
    const stage = stageRef.current;
    const fitScale = calculateFitScale(adjustedImage.naturalWidth, adjustedImage.naturalHeight, width, height);
    baseScaleRef.current = fitScale;
    setBaseScale(fitScale);
    const x = (width  - adjustedImage.naturalWidth  * fitScale) / 2;
    const y = (height - adjustedImage.naturalHeight * fitScale) / 2;
    stage.scale({ x: fitScale, y: fitScale });
    stage.position({ x, y });
    stageScaleRef.current = fitScale;
    stagePosRef.current   = { x, y };
    setStageScale(fitScale);
    setStagePos({ x, y });
    isAtFitRef.current = true;
  }, [resetZoomNonce, adjustedImage, width, height, calculateFitScale]);

  return (
    <div 
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative', 
        background: '#1a1a1a',
        overflow: 'hidden'
      }}
    >
      {/* Filter wrapper: apply CSS filter (which references the SVG filter) to the
          whole Stage so slider changes are instant without re-encoding the image. */}
      <div style={{ width: '100%', height: '100%', filter: cssFilter || undefined, transition: 'filter 0.05s linear' }}>
      <Stage
        ref={stageRef}
        width={width}
        height={height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos.x}
        y={stagePos.y}
        onWheel={handleWheel}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        draggable
        dragDistance={5}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onClick={handleStageClick}
      >
        <Layer>
          {/* Main image layer */}
          {adjustedImage && (
            <Group
              id="layer-main"
            >
              <KonvaImage
                image={adjustedImage}
                width={adjustedImage.naturalWidth}
                height={adjustedImage.naturalHeight}
                x={0}
                y={0}
              />
            </Group>
          )}
          
          {/* Additional layers from state */}
          {state.layers
            .filter(layer => layer.visible)
            .sort((a, b) => a.z_index - b.z_index)
            .map(layer => {
              // For now, we'll implement basic layer rendering
              // This will be expanded as we add different layer types
              return (
                <Group
                  key={layer.id}
                  id={`layer-${layer.id}`}
                  x={layer.x}
                  y={layer.y}
                  opacity={layer.opacity}
                  onClick={() => handleLayerClick(`layer-${layer.id}`)}
                >
                  {/* Layer content will be rendered based on layer type */}
                </Group>
              );
            })
          }
          
          {/* Selection transformer */}
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit resize
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>
      
      </div>
      {/* Minimap panel — appears just below the Map button (top-left) */}
      {showMinimap && adjustedImage && (
        <div className="absolute top-14 left-4 z-30 rounded-lg overflow-hidden border border-gray-600 shadow-2xl">
            <MiniMap
            imageUrl={imageUrl}
            imgW={adjustedImage.naturalWidth}
            imgH={adjustedImage.naturalHeight}
            containerW={width}
            containerH={height}
            stageScale={stageScale}
            stagePos={stagePos}
            onPan={(newPos) => {
              if (!stageRef.current) return;
              stageRef.current.position(newPos);
              stagePosRef.current = newPos;
              setStagePos(newPos);
            }}
          />
        </div>
      )}

      {/* Canvas info overlay — bottom-left, tooltip opens upward to stay on screen */}
      <div className="absolute bottom-4 left-4 group cursor-default">
        <div className="bg-black/50 text-white text-xs px-2 py-1 rounded">
          Zoom: {getDisplayZoom()}%
        </div>
        {/* Tooltip anchored above the badge so it never clips off the bottom */}
        <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 bg-black/80 text-white text-xs p-2 rounded whitespace-nowrap">
          <div className="text-gray-300">Scroll to zoom • Drag to pan</div>
          <div className="text-gray-500">100% = Fit to screen</div>
          {selectedId && (
            <div className="text-blue-400">Selected: {selectedId}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainCanvas;
