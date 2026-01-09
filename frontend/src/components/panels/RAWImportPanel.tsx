import React, { useState } from 'react';
import { Camera, FileImage, AlertCircle, Settings, CheckCircle } from 'lucide-react';

interface RAWFormat {
  extension: string;
  make: string;
  example: string;
}

const SUPPORTED_RAW_FORMATS: RAWFormat[] = [
  { extension: '.cr2, .cr3', make: 'Canon', example: 'IMG_1234.CR2' },
  { extension: '.nef, .nrw', make: 'Nikon', example: 'DSC_5678.NEF' },
  { extension: '.arw', make: 'Sony', example: 'DSC00123.ARW' },
  { extension: '.dng', make: 'Adobe (Universal)', example: 'IMG_9012.DNG' },
  { extension: '.raf', make: 'Fujifilm', example: 'DSCF1234.RAF' },
  { extension: '.orf', make: 'Olympus', example: 'P1234567.ORF' },
  { extension: '.rw2', make: 'Panasonic', example: 'P1000123.RW2' },
  { extension: '.pef', make: 'Pentax', example: 'IMGP1234.PEF' },
  { extension: '.srw', make: 'Samsung', example: 'SAM_1234.SRW' },
];

interface RAWImportSettings {
  preserveMetadata: boolean;
  autoWhiteBalance: boolean;
  exposureCompensation: number;
  highlightRecovery: boolean;
  shadowRecovery: boolean;
}

interface RAWImportPanelProps {
  onImport?: (files: FileList, settings: RAWImportSettings) => void;
}

const RAWImportPanel: React.FC<RAWImportPanelProps> = ({ onImport }) => {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [settings, setSettings] = useState<RAWImportSettings>({
    preserveMetadata: true,
    autoWhiteBalance: false,
    exposureCompensation: 0.0,
    highlightRecovery: true,
    shadowRecovery: true,
  });
  const [showSettings, setShowSettings] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files);
      setImportComplete(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFiles) return;

    setImporting(true);
    
    // Simulate import process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    if (onImport) {
      onImport(selectedFiles, settings);
    }
    
    setImporting(false);
    setImportComplete(true);
    
    // Reset after 3 seconds
    setTimeout(() => {
      setSelectedFiles(null);
      setImportComplete(false);
    }, 3000);
  };

  const detectFileFormat = (filename: string): string => {
    const ext = filename.toLowerCase().match(/\.(cr2|cr3|nef|nrw|arw|dng|raf|orf|rw2|pef|srw|erf|kdc|dcr|mos|raw)$/);
    if (ext) {
      const format = SUPPORTED_RAW_FORMATS.find((f) => f.extension.includes(ext[1]));
      return format ? format.make : 'RAW';
    }
    return 'Unknown';
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Camera className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">RAW Image Import</h2>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded transition-colors ${
            showSettings ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* File Selection */}
      <div className="mb-6">
        <label className="block">
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
            <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-white mb-1">
              {selectedFiles
                ? `${selectedFiles.length} file(s) selected`
                : 'Select RAW files to import'}
            </p>
            <p className="text-sm text-gray-500">Click or drag files here</p>
            <input
              type="file"
              multiple
              accept=".cr2,.cr3,.nef,.nrw,.arw,.dng,.raf,.orf,.rw2,.pef,.srw,.erf,.kdc,.dcr,.mos,.raw"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </label>
      </div>

      {/* Selected Files Preview */}
      {selectedFiles && selectedFiles.length > 0 && (
        <div className="mb-6 bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Selected Files</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Array.from(selectedFiles).map((file, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="text-gray-300 truncate flex-1">{file.name}</span>
                <span className="text-blue-400 ml-2">{detectFileFormat(file.name)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Settings */}
      {showSettings && (
        <div className="mb-6 bg-gray-800 rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-white mb-3">Import Settings</h3>
          
          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Preserve EXIF Metadata</span>
            <input
              type="checkbox"
              checked={settings.preserveMetadata}
              onChange={(e) => setSettings({ ...settings, preserveMetadata: e.target.checked })}
              className="w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Auto White Balance</span>
            <input
              type="checkbox"
              checked={settings.autoWhiteBalance}
              onChange={(e) => setSettings({ ...settings, autoWhiteBalance: e.target.checked })}
              className="w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Highlight Recovery</span>
            <input
              type="checkbox"
              checked={settings.highlightRecovery}
              onChange={(e) => setSettings({ ...settings, highlightRecovery: e.target.checked })}
              className="w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Shadow Recovery</span>
            <input
              type="checkbox"
              checked={settings.shadowRecovery}
              onChange={(e) => setSettings({ ...settings, shadowRecovery: e.target.checked })}
              className="w-4 h-4"
            />
          </label>

          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Exposure Compensation: {settings.exposureCompensation.toFixed(1)} EV
            </label>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={settings.exposureCompensation}
              onChange={(e) =>
                setSettings({ ...settings, exposureCompensation: parseFloat(e.target.value) })
              }
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* Import Button */}
      <button
        onClick={handleImport}
        disabled={!selectedFiles || importing || importComplete}
        className={`w-full py-3 rounded-lg font-semibold transition-all ${
          importing
            ? 'bg-blue-600/50 text-white cursor-wait'
            : importComplete
            ? 'bg-green-600 text-white'
            : selectedFiles
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
      >
        {importing ? (
          <span className="flex items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Importing RAW files...
          </span>
        ) : importComplete ? (
          <span className="flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Import Complete!
          </span>
        ) : (
          'Import RAW Files'
        )}
      </button>

      {/* Supported Formats */}
      <div className="mt-6 pt-6 border-t border-gray-800">
        <h3 className="text-sm font-semibold text-white mb-3">Supported RAW Formats</h3>
        <div className="grid grid-cols-2 gap-2">
          {SUPPORTED_RAW_FORMATS.map((format, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span className="text-gray-400">{format.make}</span>
              <span className="text-gray-600">({format.extension})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Info Alert */}
      <div className="mt-4 flex items-start gap-2 bg-blue-900/20 border border-blue-800 rounded p-3">
        <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-300">
          RAW files are imported with non-destructive processing. Original files are preserved, and all adjustments can be modified later.
        </p>
      </div>
    </div>
  );
};

export default RAWImportPanel;