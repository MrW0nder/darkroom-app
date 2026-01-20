import React, { useState } from 'react';
import { X, Plus, Trash2, Image, Scan } from 'lucide-react';

interface PanoramaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onStitch: (images: File[], settings: PanoramaSettings) => void;
}

interface PanoramaSettings {
  projection: 'cylindrical' | 'spherical' | 'planar';
  blending: 'multiband' | 'feather';
  exposureCompensation: boolean;
  autoCrop: boolean;
  confidence: number;
}

export const PanoramaDialog: React.FC<PanoramaDialogProps> = ({ isOpen, onClose, onStitch }) => {
  const [images, setImages] = useState<File[]>([]);
  const [settings, setSettings] = useState<PanoramaSettings>({
    projection: 'cylindrical',
    blending: 'multiband',
    exposureCompensation: true,
    autoCrop: true,
    confidence: 0.8,
  });

  if (!isOpen) return null;

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages([...images, ...Array.from(e.target.files)]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleStitch = () => {
    if (images.length >= 2) {
      onStitch(images, settings);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Panorama Stitching</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Image Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Panorama Images (min 2 required, in sequence)
          </label>
          <div className="space-y-2">
            {images.map((image, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                <div className="flex items-center gap-3">
                  <Image size={20} className="text-gray-400" />
                  <span className="text-sm text-gray-300">
                    {index + 1}. {image.name}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 w-fit">
            <Plus size={20} />
            Add Images
            <input type="file" multiple accept="image/*" onChange={handleAddImages} className="hidden" />
          </label>
        </div>

        {/* Projection Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Projection Type</label>
          <select
            value={settings.projection}
            onChange={(e) => setSettings({ ...settings, projection: e.target.value as any })}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="cylindrical">Cylindrical (360° horizontal)</option>
            <option value="spherical">Spherical (360° all directions)</option>
            <option value="planar">Planar (Flat, for small angles)</option>
          </select>
        </div>

        {/* Blending Mode */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Blending Mode</label>
          <select
            value={settings.blending}
            onChange={(e) => setSettings({ ...settings, blending: e.target.value as any })}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="multiband">Multiband (Best quality, slower)</option>
            <option value="feather">Feather (Faster)</option>
          </select>
        </div>

        {/* Alignment Confidence */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Alignment Confidence: {settings.confidence.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.5"
            max="1"
            step="0.05"
            value={settings.confidence}
            onChange={(e) => setSettings({ ...settings, confidence: parseFloat(e.target.value) })}
            className="w-full"
          />
          <p className="text-xs text-gray-400 mt-1">
            Lower values accept more matches (may include bad matches)
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-2 text-gray-300">
            <input
              type="checkbox"
              checked={settings.exposureCompensation}
              onChange={(e) => setSettings({ ...settings, exposureCompensation: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Exposure compensation</span>
          </label>
          <label className="flex items-center gap-2 text-gray-300">
            <input
              type="checkbox"
              checked={settings.autoCrop}
              onChange={(e) => setSettings({ ...settings, autoCrop: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Auto-crop to remove black borders</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={handleStitch}
            disabled={images.length < 2}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Scan size={16} />
            Stitch Panorama
          </button>
        </div>
      </div>
    </div>
  );
};
