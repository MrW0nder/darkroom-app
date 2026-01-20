import React, { useState } from 'react';
import { X, Plus, Trash2, Image, Zap } from 'lucide-react';

interface HDRMergeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMerge: (images: File[], settings: HDRSettings) => void;
}

interface HDRSettings {
  algorithm: 'debevec' | 'robertson' | 'mertens';
  toneMapping: 'drago' | 'reinhard' | 'mantiuk';
  removeGhosts: boolean;
  autoAlign: boolean;
  toneMappingIntensity: number;
}

export const HDRMergeDialog: React.FC<HDRMergeDialogProps> = ({ isOpen, onClose, onMerge }) => {
  const [images, setImages] = useState<File[]>([]);
  const [settings, setSettings] = useState<HDRSettings>({
    algorithm: 'debevec',
    toneMapping: 'reinhard',
    removeGhosts: true,
    autoAlign: true,
    toneMappingIntensity: 0.5,
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

  const handleMerge = () => {
    if (images.length >= 2) {
      onMerge(images, settings);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">HDR Merge</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Image Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Exposure Bracketed Images (min 2 required)
          </label>
          <div className="space-y-2">
            {images.map((image, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                <div className="flex items-center gap-3">
                  <Image size={20} className="text-gray-400" />
                  <span className="text-sm text-gray-300">{image.name}</span>
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

        {/* HDR Algorithm */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">HDR Algorithm</label>
          <select
            value={settings.algorithm}
            onChange={(e) => setSettings({ ...settings, algorithm: e.target.value as any })}
            className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="debevec">Debevec (Accurate response curve)</option>
            <option value="robertson">Robertson (Fast)</option>
            <option value="mertens">Mertens (No tone mapping needed)</option>
          </select>
        </div>

        {/* Tone Mapping */}
        {settings.algorithm !== 'mertens' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Tone Mapping</label>
            <select
              value={settings.toneMapping}
              onChange={(e) => setSettings({ ...settings, toneMapping: e.target.value as any })}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="drago">Drago (Natural)</option>
              <option value="reinhard">Reinhard (Balanced)</option>
              <option value="mantiuk">Mantiuk (High contrast)</option>
            </select>
          </div>
        )}

        {/* Tone Mapping Intensity */}
        {settings.algorithm !== 'mertens' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tone Mapping Intensity: {settings.toneMappingIntensity.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={settings.toneMappingIntensity}
              onChange={(e) => setSettings({ ...settings, toneMappingIntensity: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        )}

        {/* Options */}
        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-2 text-gray-300">
            <input
              type="checkbox"
              checked={settings.removeGhosts}
              onChange={(e) => setSettings({ ...settings, removeGhosts: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Remove Ghosting (for moving objects)</span>
          </label>
          <label className="flex items-center gap-2 text-gray-300">
            <input
              type="checkbox"
              checked={settings.autoAlign}
              onChange={(e) => setSettings({ ...settings, autoAlign: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Auto-align images</span>
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
            onClick={handleMerge}
            disabled={images.length < 2}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Zap size={16} />
            Merge HDR
          </button>
        </div>
      </div>
    </div>
  );
};
