export class ShapeRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private shapes: any[] = [];

  constructor() {}

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  addShape(shape: any) {
    this.shapes.push(shape);
  }

  deleteShape(id: string) {
    this.shapes = this.shapes.filter(shape => shape.id !== id);
  }

  getAllShapes() {
    return [...this.shapes];
  }

  drawShapes(ctx: CanvasRenderingContext2D) {
    this.shapes.forEach(shape => {
      ctx.save();
      ctx.strokeStyle = shape.strokeColor;
      ctx.fillStyle = shape.fillColor;
      ctx.lineWidth = shape.strokeWidth;
      
      switch (shape.type) {
        case 'rectangle':
          if (shape.fill) ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
          ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
          break;
        case 'ellipse':
          ctx.beginPath();
          ctx.ellipse(shape.x, shape.y, shape.radiusX, shape.radiusY, 0, 0, 2 * Math.PI);
          if (shape.fill) ctx.fill();
          ctx.stroke();
          break;
        case 'line':
          ctx.beginPath();
          ctx.moveTo(shape.startX, shape.startY);
          ctx.lineTo(shape.endX, shape.endY);
          ctx.stroke();
          break;
      }
      
      ctx.restore();
    });
  }
}