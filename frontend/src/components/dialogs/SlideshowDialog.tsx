import React, { useState } from 'react';

interface SlideshowDialogProps {
  images: string[];
  onClose: () => void;
  onExport: (settings: SlideshowSettings) => void;
}

interface SlideshowSettings {
  duration: number;
  transition: string;
  transitionDuration: number;
  music: string | null;
  loop: boolean;
  shuffle: boolean;
  format: string;
  resolution: string;
  fps: number;
  quality: string;
}

const SlideshowDialog: React.FC<SlideshowDialogProps> = ({ images, onClose, onExport }) => {
  const [settings, setSettings] = useState<SlideshowSettings>({
    duration: 3.0,
    transition: 'fade',
    transitionDuration: 0.5,
    music: null,
    loop: false,
    shuffle: false,
    format: 'mp4',
    resolution: '1920x1080',
    fps: 30,
    quality: 'high'
  });

  const [activeTab, setActiveTab] = useState<'settings' | 'export'>('settings');

  const transitions = ['fade', 'slide', 'zoom', 'none'];
  const formats = ['mp4', 'gif', 'webm'];
  const resolutions = ['1920x1080', '1280x720', '3840x2160', '2560x1440'];
  const qualities = ['draft', 'normal', 'high', 'best'];

  const handleExport = () => {
    onExport(settings);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Create Slideshow</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-2 px-4 ${
              activeTab === 'settings'
                ? 'border-b-2 border-blue-500 text-white'
                : 'text-gray-400'
            }`}
          >
            Slideshow Settings
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`pb-2 px-4 ${
              activeTab === 'export'
                ? 'border-b-2 border-blue-500 text-white'
                : 'text-gray-400'
            }`}
          >
            Export Settings
          </button>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="text-gray-400 text-sm mb-4">
              {images.length} images selected
            </div>

            {/* Duration */}
            <div>
              <label className="block text-white mb-2">
                Duration per Image: {settings.duration}s
              </label>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={settings.duration}
                onChange={(e) =>
                  setSettings({ ...settings, duration: parseFloat(e.target.value) })
                }
                className="w-full"
              />
            </div>

            {/* Transition */}
            <div>
              <label className="block text-white mb-2">Transition Effect</label>
              <div className="grid grid-cols-4 gap-2">
                {transitions.map((transition) => (
                  <button
                    key={transition}
                    onClick={() => setSettings({ ...settings, transition })}
                    className={`p-3 rounded capitalize ${
                      settings.transition === transition
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {transition}
                  </button>
                ))}
              </div>
            </div>

            {/* Transition Duration */}
            <div>
              <label className="block text-white mb-2">
                Transition Duration: {settings.transitionDuration}s
              </label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={settings.transitionDuration}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    transitionDuration: parseFloat(e.target.value)
                  })
                }
                className="w-full"
              />
            </div>

            {/* Options */}
            <div className="space-y-2">
              <label className="flex items-center text-white">
                <input
                  type="checkbox"
                  checked={settings.loop}
                  onChange={(e) =>
                    setSettings({ ...settings, loop: e.target.checked })
                  }
                  className="mr-2"
                />
                Loop slideshow
              </label>
              <label className="flex items-center text-white">
                <input
                  type="checkbox"
                  checked={settings.shuffle}
                  onChange={(e) =>
                    setSettings({ ...settings, shuffle: e.target.checked })
                  }
                  className="mr-2"
                />
                Shuffle images
              </label>
            </div>

            {/* Music */}
            <div>
              <label className="block text-white mb-2">Background Music</label>
              <button className="w-full p-3 bg-gray-700 text-gray-300 rounded hover:bg-gray-600">
                Choose Music File
              </button>
            </div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            {/* Format */}
            <div>
              <label className="block text-white mb-2">Export Format</label>
              <div className="grid grid-cols-3 gap-2">
                {formats.map((format) => (
                  <button
                    key={format}
                    onClick={() => setSettings({ ...settings, format })}
                    className={`p-3 rounded uppercase ${
                      settings.format === format
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div>
              <label className="block text-white mb-2">Resolution</label>
              <select
                value={settings.resolution}
                onChange={(e) =>
                  setSettings({ ...settings, resolution: e.target.value })
                }
                className="w-full p-3 bg-gray-700 text-white rounded"
              >
                {resolutions.map((res) => (
                  <option key={res} value={res}>
                    {res}
                  </option>
                ))}
              </select>
            </div>

            {/* FPS */}
            <div>
              <label className="block text-white mb-2">Frame Rate: {settings.fps} FPS</label>
              <input
                type="range"
                min="15"
                max="60"
                step="15"
                value={settings.fps}
                onChange={(e) =>
                  setSettings({ ...settings, fps: parseInt(e.target.value) })
                }
                className="w-full"
              />
            </div>

            {/* Quality */}
            <div>
              <label className="block text-white mb-2">Quality</label>
              <div className="grid grid-cols-4 gap-2">
                {qualities.map((quality) => (
                  <button
                    key={quality}
                    onClick={() => setSettings({ ...settings, quality })}
                    className={`p-3 rounded capitalize ${
                      settings.quality === quality
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    {quality}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated Size */}
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-gray-400 text-sm">Estimated file size</div>
              <div className="text-white text-lg font-bold">~25 MB</div>
              <div className="text-gray-400 text-sm mt-2">
                Total duration: {(images.length * settings.duration).toFixed(1)}s
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-4 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="flex-1 py-3 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            Create Slideshow
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlideshowDialog;
