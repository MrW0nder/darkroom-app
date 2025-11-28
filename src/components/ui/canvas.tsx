import React, { useEffect, useRef } from "react";

interface CanvasProps {
  imageUrl: string | null;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  vibrance: number;
  sharpness: number;
  onCanvasReady: (canvas: HTMLCanvasElement) => void;
}

export default function Canvas({
  imageUrl,
  brightness,
  contrast,
  saturation,
  hue,
  vibrance,
  sharpness,
  onCanvasReady
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    onCanvasReady(canvas);
  }, [onCanvasReady]);

  useEffect(() => {
    if (!imageUrl) return;

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      drawImage();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  useEffect(() => {
    drawImage();
  }, [brightness, contrast, saturation, hue, vibrance, sharpness]);

  const drawImage = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match image
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply filters
    ctx.filter = `
      brightness(${brightness}%)
      contrast(${contrast}%)
      saturate(${saturation}%)
      hue-rotate(${hue}deg)
    `;

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Apply additional effects that can't be done with CSS filters
    if (vibrance !== 0 || sharpness !== 100) {
      applyAdvancedEffects(ctx, canvas.width, canvas.height);
    }
  };

  const applyAdvancedEffects = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Get image data for advanced processing
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Apply vibrance
    if (vibrance !== 0) {
      const vibranceValue = vibrance / 100;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Calculate saturation
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = (max - min) / (max + min);
        
        // Apply vibrance adjustment
        const adjustment = 1 + vibranceValue * (1 - saturation);
        data[i] = Math.min(255, r * adjustment);
        data[i + 1] = Math.min(255, g * adjustment);
        data[i + 2] = Math.min(255, b * adjustment);
      }
    }

    // Apply sharpness (simplified version)
    if (sharpness !== 100) {
      // For simplicity, we'll just increase contrast to simulate sharpness
      const sharpnessValue = (sharpness - 100) / 100;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Increase contrast to simulate sharpness
        data[i] = Math.min(255, r + (r - 128) * sharpnessValue);
        data[i + 1] = Math.min(255, g + (g - 128) * sharpnessValue);
        data[i + 2] = Math.min(255, b + (b - 128) * sharpnessValue);
      }
    }

    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 overflow-auto">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full"
        />
        {!imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            <p>Upload an image to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}