import React, { useState } from 'react';
import { Wand2 } from 'lucide-react';

interface Filter {
  id: string;
  name: string;
  category: string;
}

export const FiltersPanel: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>('none');
  const [intensity, setIntensity] = useState<number>(1.0);
  const [filters, setFilters] = useState<Filter[]>([
    { id: 'vintage', name: 'Vintage', category: 'Creative' },
    { id: 'sepia', name: 'Sepia', category: 'Classic' },
    { id: 'bw', name: 'Black & White', category: 'Classic' },
    { id: 'warm', name: 'Warm', category: 'Enhancement' },
    { id: 'cool', name: 'Cool', category: 'Enhancement' },
    { id: 'vibrant', name: 'Vibrant', category: 'Enhancement' },
    { id: 'muted', name: 'Muted', category: 'Creative' },
    { id: 'hdr', name: 'HDR', category: 'Enhancement' },
    { id: 'soft_focus', name: 'Soft Focus', category: 'Artistic' },
    { id: 'sharpen', name: 'Sharpen', category: 'Enhancement' },
    { id: 'cross_process', name: 'Cross Process', category: 'Creative' },
    { id: 'split_tone', name: 'Split Tone', category: 'Artistic' },
    { id: 'vignette', name: 'Vignette', category: 'Artistic' },
    { id: 'film_grain', name: 'Film Grain', category: 'Creative' },
    { id: 'polaroid', name: 'Polaroid', category: 'Creative' }
  ]);

  const categories = ['All', 'Creative', 'Classic', 'Enhancement', 'Artistic'];
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredFilters = activeCategory === 'All' 
    ? filters 
    : filters.filter(f => f.category === activeCategory);

  const applyFilter = async (filterId: string) => {
    setSelectedFilter(filterId);
    // TODO: Call API to apply filter
    console.log(`Applying filter: ${filterId} with intensity: ${intensity}`);
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Wand2 className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Filters</h2>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded text-sm whitespace-nowrap ${
                activeCategory === cat 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 gap-3">
          {filteredFilters.map(filter => (
            <button
              key={filter.id}
              onClick={() => applyFilter(filter.id)}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                selectedFilter === filter.id
                  ? 'border-blue-500 bg-blue-500 bg-opacity-10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              {/* Preview thumbnail would go here */}
              <div className="aspect-square bg-gray-700 rounded mb-2 flex items-center justify-center">
                <Wand2 className="w-8 h-8 text-gray-500" />
              </div>
              <div className="text-sm font-medium">{filter.name}</div>
              <div className="text-xs text-gray-400">{filter.category}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Intensity Control */}
      {selectedFilter !== 'none' && (
        <div className="p-4 border-t border-gray-700">
          <label className="block text-sm mb-2">
            Intensity: {Math.round(intensity * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={intensity}
            onChange={(e) => setIntensity(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex gap-2 mt-3">
            <button className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium">
              Apply
            </button>
            <button 
              onClick={() => setSelectedFilter('none')}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};