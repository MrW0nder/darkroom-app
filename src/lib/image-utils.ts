export class ImageUtils {
  // Convert canvas to blob with quality settings
  static async canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to create blob"));
        },
        type,
        quality
      );
    });
  }

  // Get image dimensions
  static getImageDimensions(imageUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }

  // Apply preset filters (basic implementation)
  static applyPresetFilter(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    preset: string
  ): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    switch (preset) {
      case "vintage":
        // Apply sepia tone
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
          data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
          data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        }
        break;
        
      case "blackAndWhite":
        // Convert to grayscale
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }
        break;
        
      case "highContrast":
        // Increase contrast
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          data[i] = r > 128 ? Math.min(255, r + 50) : Math.max(0, r - 50);
          data[i + 1] = g > 128 ? Math.min(255, g + 50) : Math.max(0, g - 50);
          data[i + 2] = b > 128 ? Math.min(255, b + 50) : Math.max(0, b - 50);
        }
        break;
    }

    ctx.putImageData(imageData, 0, 0);
  }
}