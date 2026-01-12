import React, { useState, useRef } from 'react';
import { TrendingUp } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface ToneCurvePanelProps {
  onApply: (channel: string, points: Point[]) => void;
}

export const ToneCurvePanel: React.FC<ToneCurvePanelProps> = ({ onApply }) => {
  const [channel, setChannel] = useState<'rgb' | 'red' | 'green' | 'blue'>('rgb');
  const [points, setPoints] = useState<Point[]>([
    { x: 0, y: 0 },
    { x: 1, y: 1 }
  ]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const presets = [
    { name: 'Linear', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] },
    { name: 'S-Curve', points: [{ x: 0, y: 0 }, { x: 0.25, y: 0.2 }, { x: 0.75, y: 0.8 }, { x: 1, y: 1 }] },
    { name: 'Contrast', points: [{ x: 0, y: 0 }, { x: 0.5, y: 0.6 }, { x: 1, y: 1 }] },
    { name: 'Fade', points: [{ x: 0, y: 0.1 }, { x: 1, y: 0.9 }] },
  ];

  const handleApply = () => {
    onApply(channel, points);
  };

  const addPoint = (x: number, y: number) => {
    const newPoints = [...points, { x, y }].sort((a, b) => a.x - b.x);
    setPoints(newPoints);
  };

  const removePoint = (index: number) => {
    if (points.length > 2) {
      const newPoints = points.filter((_, i) => i !== index);
      setPoints(newPoints);
    }
  };

  const updatePoint = (index: number, x: number, y: number) => {
    const newPoints = [...points];
    newPoints[index] = { x, y };
    setPoints(newPoints.sort((a, b) => a.x - b.x));
  };

  const applyPreset = (presetPoints: Point[]) => {
    setPoints(presetPoints);
  };

  // Draw curve on canvas
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const pos = (i / 4) * width;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(width, pos);
      ctx.stroke();
    }

    // Draw diagonal reference line
    ctx.strokeStyle = '#4b5563';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, 0);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw curve
    const channelColor = {
      rgb: '#ffffff',
      red: '#ef4444',
      green: '#22c55e',
      blue: '#3b82f6'
    }[channel];

    ctx.strokeStyle = channelColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const x1 = p1.x * width;
      const y1 = (1 - p1.y) * height;
      const x2 = p2.x * width;
      const y2 = (1 - p2.y) * height;

      if (i === 0) {
        ctx.moveTo(x1, y1);
      }
      ctx.lineTo(x2, y2);
    }
    ctx.stroke();

    // Draw points
    points.forEach((point) => {
      const x = point.x * width;
      const y = (1 - point.y) * height;
      
      ctx.fillStyle = channelColor;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [points, channel]);

  return (
    <div className="p-4 bg-gray-900 text-white h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Tone Curve</h2>
      </div>

      {/* Channel Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">Channel</label>
        <div className="flex gap-2">
          {(['rgb', 'red', 'green', 'blue'] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannel(ch)}
              className={`flex-1 py-2 px-4 rounded transition-colors ${
                channel === ch
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {ch.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Curve Canvas */}
      <div className="mb-4">
        <canvas
          ref={canvasRef}
          width={300}
          height={300}
          className="w-full border border-gray-700 rounded cursor-crosshair"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = 1 - (e.clientY - rect.top) / rect.height;
            addPoint(x, y);
          }}
        />
      </div>

      {/* Curve Presets */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">Presets</label>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset.points)}
              className="py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-sm"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Point List */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">Control Points</label>
        <div className="space-y-2">
          {points.map((point, index) => (
            <div key={index} className="flex items-center gap-2 bg-gray-800 p-2 rounded">
              <span className="text-xs text-gray-400 w-8">#{index + 1}</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={point.x.toFixed(2)}
                onChange={(e) => updatePoint(index, parseFloat(e.target.value), point.y)}
                className="flex-1 bg-gray-700 text-white text-sm px-2 py-1 rounded"
                placeholder="X"
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={point.y.toFixed(2)}
                onChange={(e) => updatePoint(index, point.x, parseFloat(e.target.value))}
                className="flex-1 bg-gray-700 text-white text-sm px-2 py-1 rounded"
                placeholder="Y"
              />
              <button
                onClick={() => removePoint(index)}
                disabled={points.length <= 2}
                className="text-red-400 hover:text-red-300 disabled:text-gray-600 disabled:cursor-not-allowed text-xs"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Apply Button */}
      <button
        onClick={handleApply}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded transition-colors"
      >
        Apply Curve
      </button>

      {/* Reset Button */}
      <button
        onClick={() => setPoints([{ x: 0, y: 0 }, { x: 1, y: 1 }])}
        className="w-full mt-2 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
      >
        Reset Curve
      </button>
    </div>
  );
};