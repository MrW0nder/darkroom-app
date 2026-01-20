import React, { useState, useEffect } from 'react';
import { X, Search, Download, Star, Tag, DollarSign, Filter } from 'lucide-react';

interface PresetMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  rating?: number;
  downloads: number;
  is_premium: boolean;
  price: number;
  thumbnail_url?: string;
}

interface Preset {
  metadata: PresetMetadata;
  settings: any;
}

interface PresetsLibraryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPreset?: (preset: Preset) => void;
}

export const PresetsLibraryDialog: React.FC<PresetsLibraryDialogProps> = ({
  isOpen,
  onClose,
  onApplyPreset
}) => {
  const [activeTab, setActiveTab] = useState<'my-library' | 'marketplace'>('my-library');
  const [userPresets, setUserPresets] = useState<Preset[]>([]);
  const [marketplacePresets, setMarketplacePresets] = useState<Preset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchUserPresets();
      fetchMarketplacePresets();
      fetchCategories();
    }
  }, [isOpen]);

  const fetchUserPresets = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/presets-library/presets/my-library');
      const data = await response.json();
      setUserPresets(data.presets || []);
    } catch (error) {
      console.error('Error fetching user presets:', error);
    }
  };

  const fetchMarketplacePresets = async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (searchQuery) params.append('search', searchQuery);
      if (showPremiumOnly) params.append('premium_only', 'true');

      const response = await fetch(
        `http://localhost:8000/api/presets-library/presets/marketplace?${params}`
      );
      const data = await response.json();
      setMarketplacePresets(data.presets || []);
    } catch (error) {
      console.error('Error fetching marketplace presets:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/presets-library/categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handlePurchase = async (presetId: string) => {
    try {
      await fetch(`http://localhost:8000/api/presets-library/presets/${presetId}/purchase`, {
        method: 'POST'
      });
      fetchUserPresets();
      fetchMarketplacePresets();
    } catch (error) {
      console.error('Error purchasing preset:', error);
    }
  };

  const handleApply = (preset: Preset) => {
    if (onApplyPreset) {
      onApplyPreset(preset);
    }
    onClose();
  };

  if (!isOpen) return null;

  const currentPresets = activeTab === 'my-library' ? userPresets : marketplacePresets;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-[90vw] h-[80vh] flex flex-col text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-2xl font-bold">Presets Library</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('my-library')}
            className={`px-4 py-2 rounded ${
              activeTab === 'my-library' ? 'bg-blue-600' : 'bg-gray-800'
            }`}
          >
            My Library ({userPresets.length})
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-4 py-2 rounded ${
              activeTab === 'marketplace' ? 'bg-blue-600' : 'bg-gray-800'
            }`}
          >
            Marketplace
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-2 p-4 border-b border-gray-700">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search presets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-gray-800 rounded border border-gray-700"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-gray-800 rounded border border-gray-700"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {activeTab === 'marketplace' && (
            <button
              onClick={() => setShowPremiumOnly(!showPremiumOnly)}
              className={`px-4 py-2 rounded flex items-center gap-2 ${
                showPremiumOnly ? 'bg-yellow-600' : 'bg-gray-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Premium
            </button>
          )}
        </div>

        {/* Preset Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-4">
            {currentPresets.map(preset => (
              <div
                key={preset.metadata.id}
                className="bg-gray-800 rounded border border-gray-700 overflow-hidden hover:border-blue-500 transition-colors"
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-gray-700 flex items-center justify-center">
                  {preset.metadata.thumbnail_url ? (
                    <img
                      src={preset.metadata.thumbnail_url}
                      alt={preset.metadata.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Filter className="w-12 h-12 text-gray-600" />
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{preset.metadata.name}</h3>
                    {preset.metadata.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm">{preset.metadata.rating}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                    {preset.metadata.description}
                  </p>

                  <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                    <Tag className="w-3 h-3" />
                    {preset.metadata.category}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {preset.metadata.downloads.toLocaleString()} downloads
                    </span>
                    {activeTab === 'marketplace' && preset.metadata.is_premium ? (
                      <button
                        onClick={() => handlePurchase(preset.metadata.id)}
                        className="px-3 py-1 bg-yellow-600 rounded text-sm flex items-center gap-1"
                      >
                        <DollarSign className="w-3 h-3" />
                        ${preset.metadata.price}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApply(preset)}
                        className="px-3 py-1 bg-blue-600 rounded text-sm"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};