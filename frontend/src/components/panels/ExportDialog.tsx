/**
 * ExportDialog
 * Modal for exporting the current image or all images in the project.
 */
import React, { useState } from 'react';
import axios from 'axios';
import { X, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:8000';

interface Adjustments {
  brightness:  number;
  contrast:    number;
  saturation:  number;
  vibrance:    number;
  exposure:    number;
  highlights:  number;
  shadows:     number;
  sharpness:   number;
  temperature: number;
  tint:        number;
}

interface ExportDialogProps {
  isOpen:      boolean;
  onClose:     () => void;
  // Single-image export
  layerId?:    number | null;
  filename?:   string;        // suggested name without extension
  adjustments?: Adjustments;
  // Batch export
  batchItems?: { layerId: number; filename?: string; adjustments?: Adjustments }[];
}

type Format  = 'JPEG' | 'PNG' | 'TIFF' | 'WEBP';
type Status  = 'idle' | 'exporting' | 'done' | 'error';

interface Result {
  filename:     string;
  download_url: string;
  size_bytes:   number;
  success:      boolean;
  error?:       string;
  layer_id?:    number;
}

const FORMAT_INFO: Record<Format, string> = {
  JPEG: 'Best for photos. Smaller file size.',
  PNG:  'Lossless. Best for graphics/transparency.',
  TIFF: 'Maximum quality. Large files.',
  WEBP: 'Modern format. Good quality/size ratio.',
};

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen, onClose, layerId, filename, adjustments, batchItems,
}) => {
  const [format,  setFormat]  = useState<Format>('JPEG');
  const [quality, setQuality] = useState(95);
  const [status,  setStatus]  = useState<Status>('idle');
  const [results, setResults] = useState<Result[]>([]);
  const [error,   setError]   = useState<string | null>(null);

  if (!isOpen) return null;

  const isBatch     = batchItems && batchItems.length > 0;
  const itemCount   = isBatch ? batchItems!.length : 1;
  const showQuality = format === 'JPEG' || format === 'WEBP';

  const handleExport = async () => {
    setStatus('exporting');
    setError(null);
    setResults([]);

    try {
      if (isBatch) {
        const response = await axios.post(`${API_URL}/api/export/batch`, {
          items: batchItems!.map((item, i) => ({
            layer_id:    item.layerId,
            adjustments: item.adjustments ?? null,
          })),
          format,
          quality,
          prefix: filename || 'darkroom_batch',
        });
        setResults(response.data.results.map((r: any) => ({
          ...r,
          success:  r.success,
          filename: r.filename ?? '',
        })));
      } else {
        const response = await axios.post(`${API_URL}/api/export/single`, {
          layer_id:    layerId,
          format,
          quality,
          filename:    filename || undefined,
          adjustments: adjustments ?? null,
        });
        setResults([{
          filename:     response.data.filename,
          download_url: response.data.download_url,
          size_bytes:   response.data.size_bytes,
          success:      true,
        }]);
      }
      setStatus('done');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Export failed');
      setStatus('error');
    }
  };

  const handleDownload = (result: Result) => {
    const a = document.createElement('a');
    a.href = `${API_URL}${result.download_url}`;
    a.download = result.filename;
    a.click();
  };

  const handleDownloadAll = () => {
    results.filter(r => r.success).forEach(r => handleDownload(r));
  };

  const formatBytes = (b: number) =>
    b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <h2 className="text-white font-semibold text-base">
            {isBatch ? `Export ${itemCount} Photos` : 'Export Photo'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Settings */}
        {status === 'idle' && (
          <div className="p-5 space-y-5">
            {/* Format */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Format</label>
              <div className="grid grid-cols-4 gap-2">
                {(['JPEG', 'PNG', 'TIFF', 'WEBP'] as Format[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`py-2 rounded text-sm font-medium transition-colors ${
                      format === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">{FORMAT_INFO[format]}</p>
            </div>

            {/* Quality slider — only for JPEG/WEBP */}
            {showQuality && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-300">Quality</label>
                  <span className="text-sm text-blue-400 font-mono">{quality}%</span>
                </div>
                <input
                  type="range" min={1} max={100} value={quality}
                  onChange={e => setQuality(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                  <span>Smaller file</span>
                  <span>Best quality</span>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-gray-800 rounded-lg px-4 py-3 text-sm text-gray-400 space-y-1">
              {isBatch ? (
                <p>{itemCount} images will be exported as <span className="text-white">{format}</span>{showQuality ? ` at ${quality}% quality` : ''}.</p>
              ) : (
                <p>Exporting as <span className="text-white">{format}</span>{showQuality ? ` at ${quality}% quality` : ''}.</p>
              )}
              <p className="text-xs text-gray-600">
                Adjustments (brightness, contrast, etc.) will be baked into the exported file.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded text-sm text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={isBatch ? !batchItems?.length : !layerId}
                className="px-5 py-2 rounded text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export{isBatch ? ` ${itemCount} Photos` : ''}
              </button>
            </div>
          </div>
        )}

        {/* Exporting */}
        {status === 'exporting' && (
          <div className="p-10 flex flex-col items-center gap-4 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            <p className="text-sm">Exporting{isBatch ? ` ${itemCount} photos` : ''}…</p>
          </div>
        )}

        {/* Done */}
        {status === 'done' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5" />
              Export complete
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {results.map((r, i) => (
                <div key={i} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                  r.success ? 'bg-gray-800' : 'bg-red-900/30 border border-red-800'
                }`}>
                  <div className="min-w-0">
                    <p className="text-gray-200 truncate">{r.filename}</p>
                    {r.success && r.size_bytes && (
                      <p className="text-gray-500 text-xs">{formatBytes(r.size_bytes)}</p>
                    )}
                    {!r.success && (
                      <p className="text-red-400 text-xs">{r.error}</p>
                    )}
                  </div>
                  {r.success && (
                    <button
                      onClick={() => handleDownload(r)}
                      className="ml-3 flex-shrink-0 p-1.5 rounded bg-blue-700 hover:bg-blue-600 text-white transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              {isBatch && results.some(r => r.success) && (
                <button
                  onClick={handleDownloadAll}
                  className="px-4 py-2 rounded text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download All
                </button>
              )}
              <button
                onClick={() => { setStatus('idle'); setResults([]); onClose(); }}
                className="px-4 py-2 rounded text-sm text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
              <AlertCircle className="w-5 h-5" />
              Export failed
            </div>
            <p className="text-sm text-gray-400 bg-gray-800 rounded p-3">{error}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStatus('idle')}
                className="px-4 py-2 rounded text-sm bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                Try again
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded text-sm text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportDialog;
