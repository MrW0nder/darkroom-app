export class BrushEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;

  constructor() {}

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  startDrawing(x: number, y: number, settings: any) {
    if (!this.ctx) return;
    
    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;
    
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = settings.opacity / 100;
    this.ctx.strokeStyle = settings.color;
    this.ctx.lineWidth = settings.size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  draw(x: number, y: number) {
    if (!this.isDrawing || !this.ctx) return;
    
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    
    this.lastX = x;
    this.lastY = y;
  }

  stopDrawing() {
    this.isDrawing = false;
  }
}