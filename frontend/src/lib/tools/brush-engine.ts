export class BrushEngine {
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;

  constructor() {}

  init(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d');
  }

  startDrawing(x: number, y: number, settings: any) {
    if (!this.ctx) return;

    this.isDrawing = true;

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
  }

  stopDrawing() {
    this.isDrawing = false;
  }
}