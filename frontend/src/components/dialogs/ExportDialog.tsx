import React, { useState } from 'react';
import { X, Download, FileImage } from 'lucide-react';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
  imageName?: string;
}

export interface ExportOptions {
  format: 'jpeg' | 'png' | 'tiff' | 'webp';
  quality: number;
  width?: number;
  height?: number;
  maintainAspectRatio: boolean;
  includeMetadata: boolean;
  colorSpace: 'sRGB' | 'Adobe RGB' | 'ProPhoto RGB';
  filename: string;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  onExport,
  imageName = 'untitled'
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    format: 'jpeg',
    quality: 95,
    maintainAspectRatio: true,
    includeMetadata: true,
    colorSpace: 'sRGB',
    filename: imageName
  });

  if (!isOpen) return null;

  const handleExport = () => {
    onExport(options);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-lg mx-4 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <FileImage size={20} className="text-blue-500" />
            <h2 className="text-lg font-semibold text-white">Export Image</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Filename */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Filename</label>
            <input
              type="text"
              value={options.filename}
              onChange={(e) => setOptions({ ...options, filename: e.target.value })}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
              placeholder="Enter filename"
            />
          </div>

          {/* Format */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Format</label>
            <div className="grid grid-cols-4 gap-2">
              {(['jpeg', 'png', 'tiff', 'webp'] as const).map((format) => (
                <button
                  key={format}
                  onClick={() => setOptions({ ...options, format })}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    options.format === format
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Quality (for lossy formats) */}
          {(options.format === 'jpeg' || options.format === 'webp') && (
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Quality: {options.quality}%
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={options.quality}
                onChange={(e) => setOptions({ ...options, quality: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Lower size</span>
                <span>Higher quality</span>
              </div>
            </div>
          )}

          {/* Dimensions */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Dimensions (optional)</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="number"
                  placeholder="Width"
                  value={options.width || ''}
                  onChange={(e) => setOptions({ ...options, width: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <input
                  type="number"
                  placeholder="Height"
                  value={options.height || ''}
                  onChange={(e) => setOptions({ ...options, height: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Color Space */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Color Space</label>
            <select
              value={options.colorSpace}
              onChange={(e) => setOptions({ ...options, colorSpace: e.target.value as any })}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="sRGB">sRGB (Standard)</option>
              <option value="Adobe RGB">Adobe RGB (Wide Gamut)</option>
              <option value="ProPhoto RGB">ProPhoto RGB (Professional)</option>
            </select>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={options.maintainAspectRatio}
                onChange={(e) => setOptions({ ...options, maintainAspectRatio: e.target.checked })}
                className="w-4 h-4"
              />
              Maintain aspect ratio
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={options.includeMetadata}
                onChange={(e) => setOptions({ ...options, includeMetadata: e.target.checked })}
                className="w-4 h-4"
              />
              Include metadata (EXIF, IPTC)
            </label>
          </div>

          {/* File Size Estimate */}
          <div className="bg-gray-800 rounded p-3 text-sm">
            <div className="text-gray-400 mb-1">Estimated file size</div>
            <div className="text-white font-medium">
              {options.format === 'png' ? '2-5 MB' : 
               options.format === 'tiff' ? '10-20 MB' : 
               options.quality > 90 ? '1-3 MB' : 
               options.quality > 70 ? '500 KB - 1.5 MB' : '200-800 KB'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;