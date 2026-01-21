import React, { useState } from 'react';
import { Printer, X, Image as ImageIcon } from 'lucide-react';

interface PrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint?: (config: PrintConfig) => void;
  imageSrc?: string;
}

interface PrintConfig {
  paperSize: string;
  orientation: 'portrait' | 'landscape';
  quality: string;
  colorMode: 'color' | 'grayscale' | 'bw';
  scale: 'fit' | 'fill' | 'actual';
  copies: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  borderless: boolean;
}

export const PrintDialog: React.FC<PrintDialogProps> = ({
  isOpen,
  onClose,
  onPrint,
  imageSrc,
}) => {
  const [config, setConfig] = useState<PrintConfig>({
    paperSize: '4x6',
    orientation: 'portrait',
    quality: 'high',
    colorMode: 'color',
    scale: 'fit',
    copies: 1,
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    borderless: true,
  });

  const paperSizes = [
    { value: '4x6', label: '4x6 in (Photo)', width: 4, height: 6 },
    { value: '5x7', label: '5x7 in', width: 5, height: 7 },
    { value: '8x10', label: '8x10 in', width: 8, height: 10 },
    { value: 'a4', label: 'A4 (8.3x11.7 in)', width: 8.3, height: 11.7 },
    { value: 'letter', label: 'Letter (8.5x11 in)', width: 8.5, height: 11 },
    { value: '11x14', label: '11x14 in', width: 11, height: 14 },
    { value: '16x20', label: '16x20 in', width: 16, height: 20 },
  ];

  const handlePrint = () => {
    onPrint?.(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <Printer className="text-blue-500" size={24} />
            <h2 className="text-xl font-semibold text-white">Print Image</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="text-gray-400" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Settings */}
            <div className="space-y-6">
              {/* Paper Size */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Paper Size
                </label>
                <select
                  value={config.paperSize}
                  onChange={(e) => setConfig({ ...config, paperSize: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {paperSizes.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Orientation */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Orientation
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfig({ ...config, orientation: 'portrait' })}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      config.orientation === 'portrait'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Portrait
                  </button>
                  <button
                    onClick={() => setConfig({ ...config, orientation: 'landscape' })}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                      config.orientation === 'landscape'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    Landscape
                  </button>
                </div>
              </div>

              {/* Print Quality */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Print Quality
                </label>
                <select
                  value={config.quality}
                  onChange={(e) => setConfig({ ...config, quality: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="draft">Draft (Fast)</option>
                  <option value="normal">Normal</option>
                  <option value="high">High Quality</option>
                  <option value="best">Best (Slow)</option>
                </select>
              </div>

              {/* Color Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Color Mode
                </label>
                <select
                  value={config.colorMode}
                  onChange={(e) => setConfig({ ...config, colorMode: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="color">Color</option>
                  <option value="grayscale">Grayscale</option>
                  <option value="bw">Black & White</option>
                </select>
              </div>

              {/* Scaling */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Image Scaling
                </label>
                <select
                  value={config.scale}
                  onChange={(e) => setConfig({ ...config, scale: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="fit">Fit to page</option>
                  <option value="fill">Fill page</option>
                  <option value="actual">Actual size</option>
                </select>
              </div>

              {/* Copies */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Copies
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={config.copies}
                  onChange={(e) => setConfig({ ...config, copies: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Borderless */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="borderless"
                  checked={config.borderless}
                  onChange={(e) => setConfig({ ...config, borderless: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
                />
                <label htmlFor="borderless" className="ml-2 text-sm text-gray-300">
                  Borderless printing
                </label>
              </div>
            </div>

            {/* Right Column - Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Print Preview
              </label>
              <div className="bg-gray-800 rounded-lg p-4 aspect-[8.5/11] flex items-center justify-center border border-gray-700">
                {imageSrc ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src={imageSrc}
                      alt="Print preview"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No image selected</p>
                  </div>
                )}
              </div>

              {/* Print Info */}
              <div className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <h4 className="text-sm font-medium text-white mb-2">Print Details</h4>
                <div className="space-y-1 text-xs text-gray-400">
                  <p>Paper: {paperSizes.find(s => s.value === config.paperSize)?.label}</p>
                  <p>Orientation: {config.orientation}</p>
                  <p>Quality: {config.quality}</p>
                  <p>Copies: {config.copies}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Printer size={18} />
            Print
          </button>
        </div>
      </div>
    </div>
  );
};
