import React, { useState } from 'react';

interface ImageComparisonViewProps {
  images: Array<{ id: string; url: string; filename: string }>;
}

export const ImageComparisonView: React.FC<ImageComparisonViewProps> = ({ images }) => {
  const [mode, setMode] = useState<'side-by-side' | 'survey'>('side-by-side');
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [flags, setFlags] = useState<Record<string, 'pick' | 'reject' | null>>({});

  const handleRate = (imageId: string, rating: number) => {
    setRatings(prev => ({ ...prev, [imageId]: rating }));
  };

  const handleFlag = (imageId: string, flag: 'pick' | 'reject') => {
    setFlags(prev => ({ ...prev, [imageId]: prev[imageId] === flag ? null : flag }));
  };

  return (
    <div className="h-full bg-gray-900 text-white">
      {/* Toolbar */}
      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => setMode('side-by-side')}
              className={`px-4 py-2 rounded ${mode === 'side-by-side' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              Side by Side
            </button>
            <button
              onClick={() => setMode('survey')}
              className={`px-4 py-2 rounded ${mode === 'survey' ? 'bg-blue-600' : 'bg-gray-700'}`}
            >
              Survey Mode
            </button>
          </div>
          <div className="text-sm text-gray-400">
            {images.length} images
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className={`p-4 grid gap-4 ${
        mode === 'survey' ? 'grid-cols-3' : 'grid-cols-2'
      }`}>
        {images.map((img) => (
          <div key={img.id} className="bg-gray-800 rounded-lg overflow-hidden">
            {/* Image */}
            <div className="aspect-video bg-gray-700 flex items-center justify-center">
              <img src={img.url} alt={img.filename} className="max-w-full max-h-full object-contain" />
            </div>

            {/* Controls */}
            <div className="p-3 space-y-2">
              <div className="text-sm text-gray-400 truncate">{img.filename}</div>
              
              {/* Star Rating */}
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(img.id, star)}
                    className={`text-lg ${ratings[img.id] >= star ? 'text-yellow-500' : 'text-gray-600'}`}
                  >
                    ★
                  </button>
                ))}
              </div>

              {/* Pick/Reject Flags */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleFlag(img.id, 'pick')}
                  className={`px-3 py-1 rounded text-sm ${
                    flags[img.id] === 'pick' ? 'bg-green-600' : 'bg-gray-700'
                  }`}
                >
                  Pick
                </button>
                <button
                  onClick={() => handleFlag(img.id, 'reject')}
                  className={`px-3 py-1 rounded text-sm ${
                    flags[img.id] === 'reject' ? 'bg-red-600' : 'bg-gray-700'
                  }`}
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
