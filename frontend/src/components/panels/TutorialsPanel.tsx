import React, { useState } from 'react';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  duration_minutes: number;
  completed: boolean;
}

export const TutorialsPanel: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');
  const [tutorials] = useState<Tutorial[]>([]);

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Learning Center</h2>
      </div>

      {/* Filter */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex gap-2">
          {(['all', 'beginner', 'intermediate', 'advanced'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilter(level)}
              className={`px-3 py-1 rounded capitalize text-sm ${
                filter === level ? 'bg-blue-600' : 'bg-gray-800'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Tutorials List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {tutorials.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No tutorials available</p>
          </div>
        ) : (
          tutorials.map((tutorial) => (
            <div key={tutorial.id} className="bg-gray-800 p-4 rounded hover:bg-gray-750 cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{tutorial.title}</h3>
                  <p className="text-sm text-gray-400 mb-2">{tutorial.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className={`px-2 py-0.5 rounded ${
                      tutorial.difficulty === 'beginner' ? 'bg-green-900 text-green-300' :
                      tutorial.difficulty === 'intermediate' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {tutorial.difficulty}
                    </span>
                    <span>{tutorial.duration_minutes} min</span>
                  </div>
                </div>
                {tutorial.completed && (
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Progress Summary */}
      <div className="p-4 border-t border-gray-700">
        <div className="bg-gray-800 p-3 rounded">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Your Progress</span>
            <span className="text-gray-400">0/0 completed</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded overflow-hidden">
            <div className="h-full bg-blue-500" style={{ width: '0%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};
