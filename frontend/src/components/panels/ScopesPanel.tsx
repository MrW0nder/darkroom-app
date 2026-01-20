import React, { useState, useEffect } from 'react';

interface ScopesPanelProps {
  imageData?: string;
}

export const ScopesPanel: React.FC<ScopesPanelProps> = ({ imageData }) => {
  const [activeScope, setActiveScope] = useState<'parade' | 'vectorscope' | 'waveform' | 'histogram'>('histogram');
  const [scopeData, setScopeData] = useState<any>(null);

  useEffect(() => {
    if (imageData) {
      // Fetch scope data from API
      fetchScopeData();
    }
  }, [imageData]);

  const fetchScopeData = async () => {
    // API call to analyze image and get scope data
    console.log('Fetching scope data...');
  };

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col">
      {/* Scope Selector */}
      <div className="bg-gray-800 p-3 border-b border-gray-700">
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setActiveScope('histogram')}
            className={`px-3 py-2 rounded text-sm ${
              activeScope === 'histogram' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            Histogram
          </button>
          <button
            onClick={() => setActiveScope('parade')}
            className={`px-3 py-2 rounded text-sm ${
              activeScope === 'parade' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            RGB Parade
          </button>
          <button
            onClick={() => setActiveScope('vectorscope')}
            className={`px-3 py-2 rounded text-sm ${
              activeScope === 'vectorscope' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            Vectorscope
          </button>
          <button
            onClick={() => setActiveScope('waveform')}
            className={`px-3 py-2 rounded text-sm ${
              activeScope === 'waveform' ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            Waveform
          </button>
        </div>
      </div>

      {/* Scope Display */}
      <div className="flex-1 p-4 overflow-auto">
        {activeScope === 'histogram' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Histogram with Zone System</h3>
            <div className="bg-gray-800 h-48 rounded flex items-center justify-center">
              <span className="text-gray-500">Histogram visualization</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Highlights Clipping</div>
                <div className="text-red-500">0.2%</div>
              </div>
              <div>
                <div className="text-gray-400">Shadows Clipping</div>
                <div className="text-blue-500">0.5%</div>
              </div>
            </div>
          </div>
        )}

        {activeScope === 'parade' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">RGB Parade</h3>
            <div className="bg-gray-800 h-48 rounded flex items-center justify-center">
              <span className="text-gray-500">RGB Parade visualization</span>
            </div>
            <div className="text-sm text-gray-400">
              Shows the distribution of red, green, and blue values across the image
            </div>
          </div>
        )}

        {activeScope === 'vectorscope' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Vectorscope</h3>
            <div className="bg-gray-800 h-64 rounded flex items-center justify-center">
              <span className="text-gray-500">Vectorscope visualization</span>
            </div>
            <div className="text-sm text-gray-400">
              Displays hue and saturation information on a circular graph
            </div>
          </div>
        )}

        {activeScope === 'waveform' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Waveform Monitor</h3>
            <div className="bg-gray-800 h-48 rounded flex items-center justify-center">
              <span className="text-gray-500">Waveform visualization</span>
            </div>
            <div className="text-sm text-gray-400">
              Shows the distribution of brightness levels across the image
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="bg-gray-800 p-3 border-t border-gray-700">
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div>
            <div className="text-gray-400">Mean</div>
            <div>128.5</div>
          </div>
          <div>
            <div className="text-gray-400">Median</div>
            <div>125.0</div>
          </div>
          <div>
            <div className="text-gray-400">Std Dev</div>
            <div>45.2</div>
          </div>
        </div>
      </div>
    </div>
  );
};
