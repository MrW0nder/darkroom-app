import React from 'react';
import { Info, Image as ImageIcon, Layers, Clock, HardDrive } from 'lucide-react';

export const InfoPanel: React.FC = () => {
  // Mock data - replace with actual image data
  const imageInfo = {
    name: 'IMG_5432.jpg',
    size: '4.2 MB',
    dimensions: '3840 x 2160',
    format: 'JPEG',
    colorSpace: 'sRGB',
    bitDepth: '8-bit',
    dpi: '300 x 300',
    created: '2024-01-15 18:45:23',
    modified: '2024-01-15 19:12:45',
    layerCount: 3,
    historyCount: 12,
  };

  const histogram = {
    red: Array.from({ length: 256 }, (_, i) => Math.sin(i / 40) * 50 + 50),
    green: Array.from({ length: 256 }, (_, i) => Math.cos(i / 35) * 50 + 50),
    blue: Array.from({ length: 256 }, (_, i) => Math.sin(i / 45) * 50 + 50),
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Info</h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Histogram */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-400 uppercase flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Histogram
          </h3>
          <div className="bg-gray-800 rounded p-4 h-40 relative">
            <svg className="w-full h-full" viewBox="0 0 256 100" preserveAspectRatio="none">
              {/* Red channel */}
              <polyline
                points={histogram.red.map((v, i) => `${i},${100 - v}`).join(' ')}
                fill="none"
                stroke="rgba(239, 68, 68, 0.6)"
                strokeWidth="1"
              />
              {/* Green channel */}
              <polyline
                points={histogram.green.map((v, i) => `${i},${100 - v}`).join(' ')}
                fill="none"
                stroke="rgba(34, 197, 94, 0.6)"
                strokeWidth="1"
              />
              {/* Blue channel */}
              <polyline
                points={histogram.blue.map((v, i) => `${i},${100 - v}`).join(' ')}
                fill="none"
                stroke="rgba(59, 130, 246, 0.6)"
                strokeWidth="1"
              />
            </svg>
          </div>
        </div>

        {/* File Info */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-400 uppercase flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            File Information
          </h3>
          <div className="space-y-2 bg-gray-800 rounded p-3">
            <InfoRow label="File Name" value={imageInfo.name} />
            <InfoRow label="File Size" value={imageInfo.size} />
            <InfoRow label="Dimensions" value={imageInfo.dimensions} />
            <InfoRow label="Format" value={imageInfo.format} />
            <InfoRow label="Color Space" value={imageInfo.colorSpace} />
            <InfoRow label="Bit Depth" value={imageInfo.bitDepth} />
            <InfoRow label="DPI" value={imageInfo.dpi} />
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-400 uppercase flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Dates
          </h3>
          <div className="space-y-2 bg-gray-800 rounded p-3">
            <InfoRow label="Created" value={imageInfo.created} />
            <InfoRow label="Modified" value={imageInfo.modified} />
          </div>
        </div>

        {/* Project Info */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-400 uppercase flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Project Information
          </h3>
          <div className="space-y-2 bg-gray-800 rounded p-3">
            <InfoRow label="Layers" value={imageInfo.layerCount.toString()} />
            <InfoRow label="History Steps" value={imageInfo.historyCount.toString()} />
          </div>
        </div>

        {/* Color Information */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">Color Statistics</h3>
          <div className="space-y-2 bg-gray-800 rounded p-3">
            <ColorBar label="Red" color="bg-red-500" percentage={65} />
            <ColorBar label="Green" color="bg-green-500" percentage={72} />
            <ColorBar label="Blue" color="bg-blue-500" percentage={58} />
          </div>
        </div>

        {/* Image Quality */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-400 uppercase">Quality Metrics</h3>
          <div className="space-y-2 bg-gray-800 rounded p-3">
            <QualityBar label="Sharpness" value={78} />
            <QualityBar label="Exposure" value={85} />
            <QualityBar label="Contrast" value={62} />
            <QualityBar label="Saturation" value={70} />
          </div>
        </div>
      </div>
    </div>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-gray-400">{label}:</span>
    <span className="text-gray-200 font-medium">{value}</span>
  </div>
);

interface ColorBarProps {
  label: string;
  color: string;
  percentage: number;
}

const ColorBar: React.FC<ColorBarProps> = ({ label, color, percentage }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center text-xs">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-200">{percentage}%</span>
    </div>
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div
        className={`${color} h-2 rounded-full transition-all`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  </div>
);

interface QualityBarProps {
  label: string;
  value: number;
}

const QualityBar: React.FC<QualityBarProps> = ({ label, value }) => {
  const getColor = (val: number) => {
    if (val >= 80) return 'bg-green-500';
    if (val >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-200">{value}/100</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`${getColor(value)} h-2 rounded-full transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};