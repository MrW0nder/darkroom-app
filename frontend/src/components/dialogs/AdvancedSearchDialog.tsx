import React from 'react';

const AdvancedSearchDialog: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 text-white rounded-lg p-6 max-w-2xl w-full">
        <h2 className="text-xl font-bold mb-4">Advanced Search</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Keywords</label>
            <input type="text" placeholder="Search by keywords..." className="w-full bg-gray-700 p-2 rounded" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Camera</label>
              <select className="w-full bg-gray-700 p-2 rounded">
                <option>All Cameras</option>
                <option>Canon EOS R5</option>
                <option>Nikon Z9</option>
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Rating</label>
              <select className="w-full bg-gray-700 p-2 rounded">
                <option>Any Rating</option>
                <option>5 Stars</option>
                <option>4+ Stars</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">AI Content Search</label>
            <input type="text" placeholder="Describe image content..." className="w-full bg-gray-700 p-2 rounded" />
          </div>
          <div className="flex gap-2 pt-4">
            <button className="flex-1 bg-blue-600 hover:bg-blue-700 p-2 rounded">Search</button>
            <button className="flex-1 bg-gray-600 hover:bg-gray-700 p-2 rounded">Clear</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchDialog;