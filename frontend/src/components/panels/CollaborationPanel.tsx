import React, { useState } from 'react';

interface Comment {
  id: string;
  user: string;
  text: string;
  timestamp: string;
}

export const CollaborationPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'team' | 'comments' | 'approvals'>('team');
  const [comments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  const handleAddComment = () => {
    if (newComment.trim()) {
      // Add comment logic
      setNewComment('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Collaboration</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {['team', 'comments', 'approvals'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 capitalize ${
              activeTab === tab ? 'bg-gray-800 border-b-2 border-blue-500' : ''
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'team' && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold mb-2">Team Members</h3>
            <div className="space-y-2">
              <div className="bg-gray-800 p-3 rounded flex items-center justify-between">
                <div>
                  <p className="font-medium">John Doe</p>
                  <p className="text-xs text-gray-400">Editor</p>
                </div>
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-4">
            <div className="space-y-2">
              {comments.map(comment => (
                <div key={comment.id} className="bg-gray-800 p-3 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{comment.user}</span>
                    <span className="text-xs text-gray-400">{comment.timestamp}</span>
                  </div>
                  <p className="text-sm">{comment.text}</p>
                </div>
              ))}
            </div>
            
            <div className="mt-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                rows={3}
              />
              <button
                onClick={handleAddComment}
                className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              >
                Post Comment
              </button>
            </div>
          </div>
        )}

        {activeTab === 'approvals' && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold mb-2">Pending Approvals</h3>
            <p className="text-sm text-gray-400">No pending approvals</p>
          </div>
        )}
      </div>
    </div>
  );
};
