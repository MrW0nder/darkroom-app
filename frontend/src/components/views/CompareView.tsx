import React, { useState } from 'react';
import { SplitSquareVertical, Grid, Eye } from 'lucide-react';

interface CompareViewProps {
  originalImage?: string;
  editedImage?: string;
}

export const CompareView: React.FC<CompareViewProps> = ({ 
  originalImage, 
  editedImage 
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [compareMode, setCompareMode] = useState<'slider' | 'sidebyside' | 'overlay'>('slider');
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || compareMode !== 'slider') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSliderPosition(Math.max(0, Math.min(100, percentage)));
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header with mode selector */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Compare View</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setCompareMode('slider')}
              className={`p-2 rounded ${
                compareMode === 'slider' 
                  ? 'bg-blue-600' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="Slider"
            >
              <SplitSquareVertical className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCompareMode('sidebyside')}
              className={`p-2 rounded ${
                compareMode === 'sidebyside' 
                  ? 'bg-blue-600' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="Side by Side"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCompareMode('overlay')}
              className={`p-2 rounded ${
                compareMode === 'overlay' 
                  ? 'bg-blue-600' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="Overlay"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Area */}
      <div className="flex-1 relative overflow-hidden">
        {compareMode === 'slider' && (
          <div
            className="relative w-full h-full cursor-col-resize"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseUp}
          >
            {/* Original Image */}
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              {originalImage ? (
                <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-gray-500">Original Image</div>
              )}
              <div className="absolute bottom-4 left-4 px-3 py-1 bg-black bg-opacity-50 rounded text-sm">
                Before
              </div>
            </div>

            {/* Edited Image with clip */}
            <div 
              className="absolute inset-0 bg-gray-800 flex items-center justify-center"
              style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
              {editedImage ? (
                <img src={editedImage} alt="Edited" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-gray-500">Edited Image</div>
              )}
              <div className="absolute bottom-4 right-4 px-3 py-1 bg-black bg-opacity-50 rounded text-sm">
                After
              </div>
            </div>

            {/* Slider Handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white cursor-col-resize"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                <div className="w-1 h-4 bg-gray-800 rounded-full mx-0.5"></div>
                <div className="w-1 h-4 bg-gray-800 rounded-full mx-0.5"></div>
              </div>
            </div>
          </div>
        )}

        {compareMode === 'sidebyside' && (
          <div className="flex w-full h-full">
            {/* Original Image */}
            <div className="flex-1 bg-gray-800 flex items-center justify-center relative border-r border-gray-700">
              {originalImage ? (
                <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-gray-500">Original Image</div>
              )}
              <div className="absolute bottom-4 left-4 px-3 py-1 bg-black bg-opacity-50 rounded text-sm">
                Before
              </div>
            </div>

            {/* Edited Image */}
            <div className="flex-1 bg-gray-800 flex items-center justify-center relative">
              {editedImage ? (
                <img src={editedImage} alt="Edited" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-gray-500">Edited Image</div>
              )}
              <div className="absolute bottom-4 right-4 px-3 py-1 bg-black bg-opacity-50 rounded text-sm">
                After
              </div>
            </div>
          </div>
        )}

        {compareMode === 'overlay' && (
          <div className="relative w-full h-full">
            {/* Original Image (Base) */}
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
              {originalImage ? (
                <img src={originalImage} alt="Original" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-gray-500">Original Image</div>
              )}
            </div>

            {/* Edited Image (Overlay with opacity control) */}
            <div 
              className="absolute inset-0 bg-gray-800 flex items-center justify-center transition-opacity"
              style={{ opacity: 0.5 }}
            >
              {editedImage ? (
                <img src={editedImage} alt="Edited" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="text-gray-500">Edited Image</div>
              )}
            </div>

            {/* Labels */}
            <div className="absolute bottom-4 left-4 px-3 py-1 bg-black bg-opacity-50 rounded text-sm">
              Overlay Mode
            </div>
          </div>
        )}
      </div>

      {/* Footer with info */}
      <div className="p-4 border-t border-gray-700 text-sm text-gray-400">
        <div className="flex justify-between items-center">
          <span>
            {compareMode === 'slider' && 'Drag slider to compare'}
            {compareMode === 'sidebyside' && 'Side by side comparison'}
            {compareMode === 'overlay' && 'Overlay comparison'}
          </span>
          <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white">
            Export Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
