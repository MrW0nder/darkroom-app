import React, { useState } from 'react';
import { X, Printer, Grid, Image as ImageIcon, Layout } from 'lucide-react';

interface AdvancedPrintDialogProps {
  onClose: () => void;
  imageFiles: File[];
}

const AdvancedPrintDialog: React.FC<AdvancedPrintDialogProps> = ({ onClose, imageFiles }) => {
  const [layout, setLayout] = useState('single');
  const [paperSize, setPaperSize] = useState('8x10');
  const [orientation, setOrientation] = useState('portrait');
  const [dpi, setDpi] = useState(300);
  const [margins, setMargins] = useState(0.5);
  const [borderless, setBorderless] = useState(false);

  const layouts = [
    { id: 'single', name: 'Single Image', icon: ImageIcon },
    { id: '2up', name: '2-Up', icon: Layout },
    { id: '4up', name: '4-Up Grid', icon: Grid },
    { id: 'contact_sheet', name: 'Contact Sheet', icon: Grid },
    { id: 'picture_package', name: 'Picture Package', icon: Layout },
  ];

  const paperSizes = [
    '4x6', '5x7', '8x10', 'A4', 'Letter', '11x14', '13x19', '16x20', 'A3'
  ];

  const handlePrint = async () => {
    try {
      const formData = new FormData();
      imageFiles.forEach(file => formData.append('images', file));

      const response = await fetch('/api/print/layout', {
        method: 'POST',
        body: JSON.stringify({
          layout_type: layout,
          paper_size: paperSize,
          orientation,
          dpi,
          margins_inches: margins,
          borderless,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      console.log('Print layout created:', data);
      onClose();
    } catch (error) {
      console.error('Print error:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Printer className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Advanced Print</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Layout Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Layout</label>
            <div className="grid grid-cols-5 gap-3">
              {layouts.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLayout(l.id)}
                  className={`p-4 rounded-lg border-2 flex flex-col items-center space-y-2 transition ${
                    layout === l.id
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <l.icon className="w-8 h-8 text-gray-300" />
                  <span className="text-xs text-gray-300 text-center">{l.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Paper Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Paper Size</label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              >
                {paperSizes.map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Orientation</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>

          {/* DPI */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              DPI: {dpi}
            </label>
            <input
              type="range"
              min="72"
              max="600"
              step="1"
              value={dpi}
              onChange={(e) => setDpi(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>72 (Screen)</span>
              <span>300 (Standard)</span>
              <span>600 (High Quality)</span>
            </div>
          </div>

          {/* Margins */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Margins: {margins}" inches
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={margins}
              onChange={(e) => setMargins(parseFloat(e.target.value))}
              className="w-full"
              disabled={borderless}
            />
          </div>

          {/* Borderless */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="borderless"
              checked={borderless}
              onChange={(e) => setBorderless(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="borderless" className="text-sm text-gray-300">
              Borderless Printing
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedPrintDialog;
