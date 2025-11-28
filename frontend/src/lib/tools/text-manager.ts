export class TextManager {
  private texts: any[] = [];

  constructor() {}

  // No-op for compatibility
  init() {}

  addText(x: number, y: number, options: any) {
    this.texts.push({
      x,
      y,
      ...options
    });
  }

  deleteText(id: string) {
    this.texts = this.texts.filter(text => text.id !== id);
  }

  getAllTexts() {
    return [...this.texts];
  }

  drawTexts(ctx: CanvasRenderingContext2D) {
    this.texts.forEach(text => {
      ctx.save();
      ctx.font = `${text.fontSize || 24}px ${text.fontFamily || 'Arial'}`;
      ctx.fillStyle = text.color || "#000";
      ctx.globalAlpha = text.opacity !== undefined ? text.opacity / 100 : 1;
      ctx.textBaseline = "top";
      ctx.fillText(text.content || "", text.x, text.y);
      ctx.restore();
    });
  }
}