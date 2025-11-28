import * as React from "react";

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
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  const drawingRef = React.useRef<boolean>(false);
  const [drawingData, setDrawingData] = React.useState<ImageData | null>(null);

  // Track last mouse position
  const lastPos = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onCanvasReady(canvas);
  }, [onCanvasReady]);

  // Load image & refresh when imageUrl changes
  React.useEffect(() => {
    if (!imageUrl) {
      setDrawingData(null);
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      imageRef.current = img;
      drawImage();
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // When filter props change, redraw everything
  React.useEffect(() => {
    drawImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brightness, contrast, saturation, hue, vibrance, sharpness, drawingData]);

  // Handle drawing logic (brush tool)
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Helper: get mouse position relative to canvas
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
        const t = e.touches[0];
        return { x: t.clientX - rect.left, y: t.clientY - rect.top };
      } else {
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }
    };

    const startDraw = (e: MouseEvent | TouchEvent) => {
      drawingRef.current = true;
      lastPos.current = getPos(e);
    };

    const endDraw = () => {
      drawingRef.current = false;
      lastPos.current = null;

      // Save brush paint into drawingData for persistence
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          setDrawingData(ctx.getImageData(0, 0, canvas.width, canvas.height));
        }
      }
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!drawingRef.current) return;
      const pos = getPos(e);
      const ctx = canvas.getContext("2d");
      if (!ctx || !lastPos.current) return;
      ctx.save();
      ctx.strokeStyle = "#FF5A5F"; // Brush color (red for demo—customizable)
      ctx.lineWidth = 8; // Brush size—tweak as you wish
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.restore();
      lastPos.current = pos;
    };

    // Mouse events
    canvas.addEventListener("mousedown", startDraw);
    window.addEventListener("mouseup", endDraw);
    canvas.addEventListener("mousemove", draw);

    // Touch events (mobile support)
    canvas.addEventListener("touchstart", startDraw);
    window.addEventListener("touchend", endDraw);
    canvas.addEventListener("touchmove", draw);

    // Clean up listeners
    return () => {
      canvas.removeEventListener("mousedown", startDraw);
      window.removeEventListener("mouseup", endDraw);
      canvas.removeEventListener("mousemove", draw);

      canvas.removeEventListener("touchstart", startDraw);
      window.removeEventListener("touchend", endDraw);
      canvas.removeEventListener("touchmove", draw);
    };
  }, []);

  // Main drawing pipeline
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

    // Apply base filters
    ctx.filter = `
      brightness(${brightness}%)
      contrast(${contrast}%)
      saturate(${saturation}%)
      hue-rotate(${hue}deg)
    `;

    // Draw the main image
    ctx.drawImage(img, 0, 0);

    // Advanced effects (on pixel data)
    if (vibrance !== 0 || sharpness !== 100) {
      applyAdvancedEffects(ctx, canvas.width, canvas.height);
    }

    // If you've drawn on top, restore brush paint
    if (drawingData) {
      ctx.putImageData(drawingData, 0, 0);
    }
  };

  const applyAdvancedEffects = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Vibrance (demo logic)
    if (vibrance !== 0) {
      const vibranceValue = vibrance / 100;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = (max - min) / (max + min);
        const adjustment = 1 + vibranceValue * (1 - saturation);
        data[i] = Math.min(255, r * adjustment);
        data[i + 1] = Math.min(255, g * adjustment);
        data[i + 2] = Math.min(255, b * adjustment);
      }
    }

    // Sharpness (very basic demo)
    if (sharpness !== 100) {
      const sharpnessValue = (sharpness - 100) / 100;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        data[i] = Math.min(255, r + (r - 128) * sharpnessValue);
        data[i + 1] = Math.min(255, g + (g - 128) * sharpnessValue);
        data[i + 2] = Math.min(255, b + (b - 128) * sharpnessValue);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900 overflow-auto">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full border-2 border-purple-600 shadow-lg rounded"
          style={{ touchAction: "none", background: "#fff" }}
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