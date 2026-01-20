import React, { useState } from 'react';

interface VideoClip {
  id: string;
  startTime: number;
  endTime: number;
  filePath: string;
}

export const VideoEditingDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [selectedTransition, setSelectedTransition] = useState('fade');
  const [outputFormat, setOutputFormat] = useState('mp4');

  const handleExport = async () => {
    // Video export logic
    console.log('Exporting video...');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-[90%] max-w-6xl">
        <h2 className="text-2xl font-bold mb-4">Video Editor</h2>
        
        <div className="space-y-4">
          {/* Timeline */}
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="text-sm font-semibold mb-2">Timeline</h3>
            <div className="h-32 bg-gray-700 rounded flex items-center justify-center">
              {clips.length === 0 ? (
                <p className="text-gray-400">Drag video clips here</p>
              ) : (
                <div className="flex gap-2">
                  {clips.map(clip => (
                    <div key={clip.id} className="bg-blue-600 h-24 w-32 rounded"></div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Transition</label>
              <select 
                value={selectedTransition}
                onChange={(e) => setSelectedTransition(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
              >
                <option value="fade">Fade</option>
                <option value="dissolve">Dissolve</option>
                <option value="wipe">Wipe</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Output Format</label>
              <select 
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
              >
                <option value="mp4">MP4 (H.264)</option>
                <option value="mov">MOV (ProRes)</option>
                <option value="webm">WebM</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Export Video
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};