import React, { useState, useEffect } from 'react';
import { Search, Download, Trash2, Power, Settings, Star } from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://127.0.0.1:8000';

interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: string;
  enabled: boolean;
  installed: boolean;
  marketplace_url?: string;
  rating?: number;
  downloads: number;
}

export const PluginsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed');
  const [installedPlugins, setInstalledPlugins] = useState<Plugin[]>([]);
  const [marketplacePlugins, setMarketplacePlugins] = useState<Plugin[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchInstalledPlugins();
    fetchMarketplacePlugins();
  }, []);

  const fetchInstalledPlugins = async () => {
    try {
      const response = await fetch(`${API_URL}/api/plugins/installed`);
      const data = await response.json();
      setInstalledPlugins(data.plugins || []);
    } catch (error) {
      console.error('Error fetching installed plugins:', error);
    }
  };

  const fetchMarketplacePlugins = async () => {
    try {
      const response = await fetch(`${API_URL}/api/plugins/marketplace`);
      const data = await response.json();
      setMarketplacePlugins(data.plugins || []);
    } catch (error) {
      console.error('Error fetching marketplace plugins:', error);
    }
  };

  const handleInstall = async (pluginId: string) => {
    try {
      await fetch(`${API_URL}/api/plugins/install/${pluginId}`, {
        method: 'POST'
      });
      fetchInstalledPlugins();
      fetchMarketplacePlugins();
    } catch (error) {
      console.error('Error installing plugin:', error);
    }
  };

  const handleUninstall = async (pluginId: string) => {
    try {
      await fetch(`${API_URL}/api/plugins/uninstall/${pluginId}`, {
        method: 'DELETE'
      });
      fetchInstalledPlugins();
      fetchMarketplacePlugins();
    } catch (error) {
      console.error('Error uninstalling plugin:', error);
    }
  };

  const handleToggle = async (pluginId: string, enabled: boolean) => {
    try {
      await fetch(`${API_URL}/api/plugins/toggle/${pluginId}?enabled=${!enabled}`, {
        method: 'PATCH'
      });
      fetchInstalledPlugins();
    } catch (error) {
      console.error('Error toggling plugin:', error);
    }
  };

  const filteredPlugins = (activeTab === 'installed' ? installedPlugins : marketplacePlugins)
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

  return (
    <div className="plugins-panel bg-gray-900 text-white p-4 h-full flex flex-col">
      <h2 className="text-xl font-bold mb-4">Plugins</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('installed')}
          className={`px-4 py-2 rounded ${activeTab === 'installed' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Installed ({installedPlugins.length})
        </button>
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`px-4 py-2 rounded ${activeTab === 'marketplace' ? 'bg-blue-600' : 'bg-gray-700'}`}
        >
          Marketplace
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search plugins..."
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
          <option value="all">All Categories</option>
          <option value="filter">Filters</option>
          <option value="tool">Tools</option>
          <option value="export">Export</option>
          <option value="import">Import</option>
        </select>
      </div>

      {/* Plugin List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredPlugins.map(plugin => (
          <div key={plugin.id} className="bg-gray-800 p-4 rounded border border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="font-semibold">{plugin.name}</h3>
                <p className="text-sm text-gray-400">v{plugin.version} by {plugin.author}</p>
              </div>
              {plugin.rating && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-sm">{plugin.rating}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-300 mb-2">{plugin.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">{plugin.downloads.toLocaleString()} downloads</span>
              <div className="flex gap-2">
                {plugin.installed ? (
                  <>
                    <button
                      onClick={() => handleToggle(plugin.id, plugin.enabled)}
                      className={`p-2 rounded ${plugin.enabled ? 'bg-green-600' : 'bg-gray-600'}`}
                      title={plugin.enabled ? 'Disable' : 'Enable'}
                    >
                      <Power className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleUninstall(plugin.id)}
                      className="p-2 bg-red-600 rounded"
                      title="Uninstall"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleInstall(plugin.id)}
                    className="px-4 py-2 bg-blue-600 rounded flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Install
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};