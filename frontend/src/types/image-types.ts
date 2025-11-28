export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  vibrance: number;
  sharpness: number;
}

export interface ExportOptions {
  format: "jpeg" | "png" | "webp";
  quality: number;
  width?: number;
  height?: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: string;
}

export interface HistoryState {
  id: string;
  name: string;
  timestamp: Date;
  data: any;
}