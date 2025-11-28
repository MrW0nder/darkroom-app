import { ImageAdjustments } from "../types/image-types";

// Removed unused FileUtils import

export class ImageProcessor {
  // Apply CSS filters to canvas
  static applyFilters(
    ctx: CanvasRenderingContext2D,
    // removed unused width and height parameters
    adjustments: ImageAdjustments
  ): void {
    ctx.filter = `
      brightness(${adjustments.brightness}%)
      contrast(${adjustments.contrast}%)
      saturate(${adjustments.saturation}%)
      hue-rotate(${adjustments.hue}deg)
      sepia(${Math.max(0, adjustments.vibrance)}%)
    `;
    // For sharpness, we would need a convolution filter which is more complex
    // For now, we'll just apply it as a basic filter
  }

  // Convert canvas to blob with specified format and quality
  static async canvasToBlob(
    canvas: HTMLCanvasElement,
    format: "image/jpeg" | "image/png" | "image/webp",
    quality: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob from canvas"));
          }
        },
        format,
        quality / 100
      );
    });
  }

  // Resize image while maintaining aspect ratio
  static resizeImage(
    imageData: ImageData,
    maxWidth: number,
    maxHeight: number
  ): ImageData {
    // This is a simplified version - in practice, you'd use a more sophisticated
    // resizing algorithm for better quality
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }
    
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    
    const ratio = Math.min(maxWidth / imageData.width, maxHeight / imageData.height);
    const width = Math.floor(imageData.width * ratio);
    const height = Math.floor(imageData.height * ratio);
    
    const resizedCanvas = document.createElement("canvas");
    resizedCanvas.width = width;
    resizedCanvas.height = height;
    
    const resizedCtx = resizedCanvas.getContext("2d");
    if (!resizedCtx) {
      throw new Error("Failed to get resized canvas context");
    }
    
    resizedCtx.drawImage(canvas, 0, 0, width, height);
    return resizedCtx.getImageData(0, 0, width, height);
  }
}