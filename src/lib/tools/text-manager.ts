export class TextManager {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private textElements: any[] = [];

  constructor() {}

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  addText(x: number, y: number, settings: any) {
    const newText = {
      id: `text-${Date.now()}`,
      x,
      y,
      ...settings
    };
    
    this.textElements.push(newText);
    return newText;
  }

  updateText(id: string, settings: any) {
    const textElement = this.textElements.find(el => el.id === id);
    if (textElement) {
      Object.assign(textElement, settings);
    }
  }

  deleteText(id: string) {
    this.textElements = this.textElements.filter(el => el.id !== id);
  }

  getAllTextElements() {
    return [...this.textElements];
  }

  drawTextElements(ctx: CanvasRenderingContext2D) {
    this.textElements.forEach(text => {
      ctx.save();
      ctx.font = `${text.fontSize}px ${text.fontFamily}`;
      ctx.fillStyle = text.color;
      ctx.fillText(text.content, text.x, text.y);
      ctx.restore();
    });
  }
}