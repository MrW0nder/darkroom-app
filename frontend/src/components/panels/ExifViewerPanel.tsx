import React, { useState } from 'react';
import { Camera, Info, MapPin, Calendar, Aperture, Zap } from 'lucide-react';

interface ExifData {
  camera?: {
    make: string;
    model: string;
    lens?: string;
  };
  settings?: {
    iso: number;
    aperture: string;
    shutterSpeed: string;
    focalLength: string;
    exposureCompensation?: string;
  };
  image?: {
    width: number;
    height: number;
    orientation: string;
    colorSpace: string;
  };
  metadata?: {
    dateTime: string;
    software?: string;
    copyright?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
}

interface ExifViewerPanelProps {
  layerId: number | null;
}

const ExifViewerPanel: React.FC<ExifViewerPanelProps> = ({ layerId }) => {
  // Mock EXIF data - in real implementation, this would come from the API
  const [exifData] = useState<ExifData>({
    camera: {
      make: 'Canon',
      model: 'EOS 5D Mark IV',
      lens: 'EF 24-70mm f/2.8L II USM',
    },
    settings: {
      iso: 400,
      aperture: 'f/2.8',
      shutterSpeed: '1/250',
      focalLength: '50mm',
      exposureCompensation: '+0.3 EV',
    },
    image: {
      width: 6720,
      height: 4480,
      orientation: 'Horizontal',
      colorSpace: 'sRGB',
    },
    metadata: {
      dateTime: '2024-01-15 14:32:18',
      software: 'Adobe Lightroom 12.1',
      copyright: '© 2024 Photographer Name',
    },
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      altitude: 16,
    },
  });

  if (!layerId) {
    return (
      <div className="bg-gray-900 rounded-lg p-6 text-center">
        <Info className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">
          Select an image to view EXIF metadata
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 h-full overflow-y-auto">
      <div className="flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">EXIF Metadata</h2>
      </div>

      {/* Camera Info */}
      {exifData.camera && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-white">Camera</h3>
          </div>
          <div className="bg-gray-800 rounded p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Make</span>
              <span className="text-white">{exifData.camera.make}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Model</span>
              <span className="text-white">{exifData.camera.model}</span>
            </div>
            {exifData.camera.lens && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Lens</span>
                <span className="text-white text-right">{exifData.camera.lens}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Camera Settings */}
      {exifData.settings && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Aperture className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-white">Settings</h3>
          </div>
          <div className="bg-gray-800 rounded p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">ISO</span>
              <span className="text-white">{exifData.settings.iso}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Aperture</span>
              <span className="text-white">{exifData.settings.aperture}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Shutter Speed</span>
              <span className="text-white">{exifData.settings.shutterSpeed}s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Focal Length</span>
              <span className="text-white">{exifData.settings.focalLength}</span>
            </div>
            {exifData.settings.exposureCompensation && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Exposure Comp.</span>
                <span className="text-white">{exifData.settings.exposureCompensation}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Info */}
      {exifData.image && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-white">Image</h3>
          </div>
          <div className="bg-gray-800 rounded p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Dimensions</span>
              <span className="text-white">
                {exifData.image.width} × {exifData.image.height}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Orientation</span>
              <span className="text-white">{exifData.image.orientation}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Color Space</span>
              <span className="text-white">{exifData.image.colorSpace}</span>
            </div>
          </div>
        </div>
      )}

      {/* Metadata */}
      {exifData.metadata && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-white">Metadata</h3>
          </div>
          <div className="bg-gray-800 rounded p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Date & Time</span>
              <span className="text-white">{exifData.metadata.dateTime}</span>
            </div>
            {exifData.metadata.software && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Software</span>
                <span className="text-white text-right">{exifData.metadata.software}</span>
              </div>
            )}
            {exifData.metadata.copyright && (
              <div className="flex flex-col text-sm">
                <span className="text-gray-400 mb-1">Copyright</span>
                <span className="text-white">{exifData.metadata.copyright}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location */}
      {exifData.location && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-white">Location</h3>
          </div>
          <div className="bg-gray-800 rounded p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Latitude</span>
              <span className="text-white">{exifData.location.latitude.toFixed(6)}°</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Longitude</span>
              <span className="text-white">{exifData.location.longitude.toFixed(6)}°</span>
            </div>
            {exifData.location.altitude && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Altitude</span>
                <span className="text-white">{exifData.location.altitude}m</span>
              </div>
            )}
            <a
              href={`https://www.google.com/maps?q=${exifData.location.latitude},${exifData.location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-sm text-blue-400 hover:text-blue-300 transition-colors mt-2"
            >
              View on Map →
            </a>
          </div>
        </div>
      )}

      {/* Export Button */}
      <button
        className="w-full py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm"
      >
        Export Metadata as JSON
      </button>
    </div>
  );
};

export default ExifViewerPanel;