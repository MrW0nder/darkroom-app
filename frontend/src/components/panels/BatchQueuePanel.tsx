import React, { useState } from 'react';
import { Upload, Download, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface BatchItem {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

interface BatchQueuePanelProps {
  onImport?: (files: FileList) => void;
  onExport?: (layerIds: number[]) => void;
}

const BatchQueuePanel: React.FC<BatchQueuePanelProps> = ({ onImport, onExport }) => {
  const [importQueue, setImportQueue] = useState<BatchItem[]>([]);
  const [exportQueue, setExportQueue] = useState<BatchItem[]>([]);
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  const handleFileSelect = async (files: FileList) => {
    const newItems: BatchItem[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      filename: file.name,
      status: 'pending',
      progress: 0,
    }));

    setImportQueue((prev) => [...prev, ...newItems]);

    // Simulate batch import processing
    for (const item of newItems) {
      setImportQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'processing' } : i))
      );

      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        setImportQueue((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, progress } : i))
        );
      }

      setImportQueue((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'completed', progress: 100 } : i))
      );
    }

    if (onImport) {
      onImport(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelect(e.target.files);
    }
  };

  const removeItem = (id: string, queue: 'import' | 'export') => {
    if (queue === 'import') {
      setImportQueue((prev) => prev.filter((item) => item.id !== id));
    } else {
      setExportQueue((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const clearCompleted = (queue: 'import' | 'export') => {
    if (queue === 'import') {
      setImportQueue((prev) => prev.filter((item) => item.status !== 'completed'));
    } else {
      setExportQueue((prev) => prev.filter((item) => item.status !== 'completed'));
    }
  };

  const renderQueueItem = (item: BatchItem, queue: 'import' | 'export') => (
    <div key={item.id} className="bg-gray-800 rounded p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {item.status === 'pending' && <Loader className="w-4 h-4 text-gray-400" />}
          {item.status === 'processing' && <Loader className="w-4 h-4 text-blue-400 animate-spin" />}
          {item.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-400" />}
          {item.status === 'failed' && <AlertCircle className="w-4 h-4 text-red-400" />}
          
          <span className="text-sm text-gray-300 truncate">{item.filename}</span>
        </div>
        
        <button
          onClick={() => removeItem(item.id, queue)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {item.status === 'processing' && (
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${item.progress}%` }}
          />
        </div>
      )}

      {item.error && (
        <p className="text-xs text-red-400 mt-1">{item.error}</p>
      )}
    </div>
  );

  const currentQueue = activeTab === 'import' ? importQueue : exportQueue;

  return (
    <div className="bg-gray-900 rounded-lg p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold text-white mb-4">Batch Queue</h2>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('import')}
          className={`flex-1 py-2 px-4 rounded transition-colors ${
            activeTab === 'import'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Upload className="w-4 h-4 inline-block mr-2" />
          Import ({importQueue.length})
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex-1 py-2 px-4 rounded transition-colors ${
            activeTab === 'export'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          <Download className="w-4 h-4 inline-block mr-2" />
          Export ({exportQueue.length})
        </button>
      </div>

      {/* Drop Zone for Import */}
      {activeTab === 'import' && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-6 mb-4 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-900/20'
              : 'border-gray-700 bg-gray-800/50'
          }`}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-400 mb-2">
            Drag and drop files here or
          </p>
          <label className="inline-block cursor-pointer">
            <span className="text-blue-400 hover:text-blue-300 transition-colors">
              browse files
            </span>
            <input
              type="file"
              multiple
              accept="image/*,.cr2,.cr3,.nef,.nrw,.arw,.dng,.raf,.orf,.rw2,.pef,.srw"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-500 mt-2">
            Supports JPEG, PNG, TIFF, and 15 RAW formats
          </p>
        </div>
      )}

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto mb-4">
        {currentQueue.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No items in queue</p>
            {activeTab === 'import' && (
              <p className="text-xs mt-1">Drop files to start batch import</p>
            )}
          </div>
        ) : (
          currentQueue.map((item) => renderQueueItem(item, activeTab))
        )}
      </div>

      {/* Actions */}
      {currentQueue.length > 0 && (
        <div className="flex gap-2">
          <button
            onClick={() => clearCompleted(activeTab)}
            className="flex-1 py-2 px-4 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors text-sm"
          >
            Clear Completed
          </button>
          <button
            onClick={() => {
              if (activeTab === 'import') {
                setImportQueue([]);
              } else {
                setExportQueue([]);
              }
            }}
            className="py-2 px-4 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors text-sm"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <p className="text-gray-500">Pending</p>
            <p className="text-white font-semibold">
              {currentQueue.filter((i) => i.status === 'pending').length}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Processing</p>
            <p className="text-blue-400 font-semibold">
              {currentQueue.filter((i) => i.status === 'processing').length}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Completed</p>
            <p className="text-green-400 font-semibold">
              {currentQueue.filter((i) => i.status === 'completed').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchQueuePanel;
