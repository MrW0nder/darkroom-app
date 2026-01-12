import React, { useState } from 'react';
import { Upload, Type, Image as ImageIcon, X, Settings } from 'lucide-react';

interface WatermarkPanelProps {
  imageId?: string;
  onApply?: (config: WatermarkConfig) => void;
}

interface WatermarkConfig {
  type: 'text' | 'image';
  text?: string;
  image?: File;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  fontSize?: number;
  opacity: number;
  color?: string;
  scale?: number;
}

export const WatermarkPanel: React.FC<WatermarkPanelProps> = ({ imageId, onApply }) => {
  const [watermarkType, setWatermarkType] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('© Your Name 2024');
  const [position, setPosition] = useState<WatermarkConfig['position']>('bottom-right');
  const [fontSize, setFontSize] = useState(36);
  const [opacity, setOpacity] = useState(0.5);
  const [color, setColor] = useState('#FFFFFF');
  const [scale, setScale] = useState(0.2);
  const [watermarkImage, setWatermarkImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setWatermarkImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleApply = () => {
    const config: WatermarkConfig = {
      type: watermarkType,
      position,
      opacity,
    };

    if (watermarkType === 'text') {
      config.text = text;
      config.fontSize = fontSize;
      config.color = color;
    } else if (watermarkImage) {
      config.image = watermarkImage;
      config.scale = scale;
    }

    onApply?.(config);
  };

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Watermark</h2>

        {/* Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Watermark Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setWatermarkType('text')}
              className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                watermarkType === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Type size={18} />
              Text
            </button>
            <button
              onClick={() => setWatermarkType('image')}
              className={`flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                watermarkType === 'image'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <ImageIcon size={18} />
              Image
            </button>
          </div>
        </div>

        {/* Text Watermark Settings */}
        {watermarkType === 'text' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Watermark Text
              </label>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Enter watermark text"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Font Size: {fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-10 bg-gray-800 border border-gray-700 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Image Watermark Settings */}
        {watermarkType === 'image' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Upload Watermark Image
              </label>
              <label className="flex items-center justify-center w-full h-32 px-4 py-6 bg-gray-800 border-2 border-gray-700 border-dashed rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
                <div className="text-center">
                  {preview ? (
                    <div className="relative">
                      <img src={preview} alt="Watermark preview" className="max-h-20 mx-auto" />
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setWatermarkImage(null);
                          setPreview(null);
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-600 rounded-full hover:bg-red-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                      <span className="text-sm text-gray-400">
                        Click to upload watermark image
                      </span>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Scale: {Math.round(scale * 100)}%
              </label>
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        )}

        {/* Common Settings */}
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Position
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'top-left', label: '↖' },
                { value: 'top-right', label: '↗' },
                { value: 'center', label: '⊙' },
                { value: 'bottom-left', label: '↙' },
                { value: 'bottom-right', label: '↘' },
              ].map((pos) => (
                <button
                  key={pos.value}
                  onClick={() => setPosition(pos.value as any)}
                  className={`px-4 py-2 rounded-lg text-xl transition-colors ${
                    position === pos.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Opacity: {Math.round(opacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Apply Button */}
        <button
          onClick={handleApply}
          disabled={watermarkType === 'image' && !watermarkImage}
          className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
        >
          Apply Watermark
        </button>
      </div>

      {/* Watermark Removal */}
      <div className="pt-6 border-t border-gray-800">
        <h3 className="text-sm font-semibold text-white mb-3">Remove Watermark (AI)</h3>
        <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          Remove Watermark
        </button>
        <p className="text-xs text-gray-500 mt-2">
          Uses AI to detect and remove watermarks from images
        </p>
      </div>
    </div>
  );
};
