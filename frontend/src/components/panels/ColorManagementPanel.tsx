import React, { useState } from 'react';
import { Palette, AlertTriangle, Eye } from 'lucide-react';

export const ColorManagementPanel: React.FC = () => {
  const [workingSpace, setWorkingSpace] = useState('sRGB');
  const [softProof, setSoftProof] = useState(false);
  const [proofProfile, setProofProfile] = useState('sRGB');
  const [renderingIntent, setRenderingIntent] = useState('perceptual');
  const [gamutWarning, setGamutWarning] = useState(false);

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Palette size={20} />
        Color Management
      </h3>

      {/* Working Color Space */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Working Color Space
        </label>
        <select
          value={workingSpace}
          onChange={(e) => setWorkingSpace(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="sRGB">sRGB (Standard, web)</option>
          <option value="AdobeRGB">Adobe RGB (Wide gamut)</option>
          <option value="ProPhotoRGB">ProPhoto RGB (Widest gamut)</option>
          <option value="DisplayP3">Display P3 (Modern displays)</option>
        </select>
      </div>

      {/* Soft Proofing */}
      <div className="mb-4 p-3 bg-gray-700 rounded">
        <label className="flex items-center gap-2 text-gray-300 mb-3">
          <input
            type="checkbox"
            checked={softProof}
            onChange={(e) => setSoftProof(e.target.checked)}
            className="rounded"
          />
          <Eye size={16} />
          <span className="text-sm font-medium">Soft Proofing</span>
        </label>
        {softProof && (
          <>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Proof Profile
            </label>
            <select
              value={proofProfile}
              onChange={(e) => setProofProfile(e.target.value)}
              className="w-full px-3 py-2 bg-gray-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="sRGB">sRGB (Web/Screen)</option>
              <option value="CMYK_Coated">CMYK Coated Paper</option>
              <option value="CMYK_Uncoated">CMYK Uncoated Paper</option>
              <option value="CMYK_Newspaper">CMYK Newspaper</option>
            </select>
          </>
        )}
      </div>

      {/* Rendering Intent */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Rendering Intent
        </label>
        <select
          value={renderingIntent}
          onChange={(e) => setRenderingIntent(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="perceptual">Perceptual (Photos)</option>
          <option value="relative">Relative Colorimetric (Accurate)</option>
          <option value="saturation">Saturation (Graphics)</option>
          <option value="absolute">Absolute Colorimetric (Proofing)</option>
        </select>
        <p className="text-xs text-gray-400 mt-1">
          {renderingIntent === 'perceptual' && 'Maintains visual relationships, best for photos'}
          {renderingIntent === 'relative' && 'Maintains color accuracy within gamut'}
          {renderingIntent === 'saturation' && 'Maximizes color vividness'}
          {renderingIntent === 'absolute' && 'Exact color matching for proofing'}
        </p>
      </div>

      {/* Gamut Warning */}
      <div className="mb-4">
        <label className="flex items-center gap-2 text-gray-300">
          <input
            type="checkbox"
            checked={gamutWarning}
            onChange={(e) => setGamutWarning(e.target.checked)}
            className="rounded"
          />
          <AlertTriangle size={16} className="text-yellow-500" />
          <span className="text-sm">Show gamut warnings</span>
        </label>
        {gamutWarning && (
          <p className="text-xs text-gray-400 mt-2">
            Out-of-gamut colors will be highlighted in magenta
          </p>
        )}
      </div>

      {/* Color Temperature Info */}
      <div className="mt-6 p-3 bg-gray-700 rounded">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Color Analysis</h4>
        <div className="space-y-1 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>Temperature:</span>
            <span className="text-white">5500K (Daylight)</span>
          </div>
          <div className="flex justify-between">
            <span>Tint:</span>
            <span className="text-white">0 (Neutral)</span>
          </div>
          <div className="flex justify-between">
            <span>Gamut Coverage:</span>
            <span className="text-white">98.5%</span>
          </div>
        </div>
      </div>
    </div>
  );
};