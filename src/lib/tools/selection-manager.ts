export class SelectionManager {
  private canvas: HTMLCanvasElement | null = null;
  private selectionType: string = 'none';
  private isSelecting = false;
  private startPoint: { x: number; y: number } | null = null;
  private currentPoint: { x: number; y: number } | null = null;

  constructor() {}

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  setSelectionType(type: string) {
    this.selectionType = type;
  }

  getSelectionType() {
    return this.selectionType;
  }

  startSelection(x: number, y: number) {
    this.isSelecting = true;
    this.startPoint = { x, y };
    this.currentPoint = { x, y };
  }

  updateSelection(x: number, y: number) {
    if (!this.isSelecting) return;
    this.currentPoint = { x, y };
  }

  endSelection() {
    this.isSelecting = false;
  }

  clearSelection() {
    this.startPoint = null;
    this.currentPoint = null;
    this.isSelecting = false;
  }

  isInSelection(x: number, y: number): boolean {
    if (!this.startPoint || !this.currentPoint) return false;
    
    const minX = Math.min(this.startPoint.x, this.currentPoint.x);
    const maxX = Math.max(this.startPoint.x, this.currentPoint.x);
    const minY = Math.min(this.startPoint.y, this.currentPoint.y);
    const maxY = Math.max(this.startPoint.y, this.currentPoint.y);
    
    return x >= minX && x <= maxX && y >= minY && y <= maxY;
  }
}