import React, { useState } from 'react';

interface SocialAccount {
  platform: string;
  username: string;
  connected: boolean;
}

interface StockPhoto {
  id: string;
  url: string;
  thumbnail: string;
  photographer: string;
  description: string;
}

export const IntegrationsDialog: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'social' | 'stock' | 'api'>('social');
  
  const [socialAccounts] = useState<SocialAccount[]>([
    { platform: 'Instagram', username: '@user', connected: true },
    { platform: 'Facebook', username: 'User Name', connected: true },
    { platform: 'Twitter', username: '@user', connected: false },
    { platform: 'Pinterest', username: 'user', connected: false }
  ]);

  const [stockSearch, setStockSearch] = useState('');
  const [stockProvider, setStockProvider] = useState('unsplash');
  const [stockPhotos, setStockPhotos] = useState<StockPhoto[]>([]);

  const handleStockSearch = async () => {
    // Mock search results
    setStockPhotos([
      {
        id: '1',
        url: 'https://example.com/photo1.jpg',
        thumbnail: 'https://example.com/thumb1.jpg',
        photographer: 'John Doe',
        description: stockSearch
      }
    ]);
  };

  return (
    <div className="integrations-dialog">
      <div className="dialog-header">
        <h2>Integrations</h2>
        <button onClick={onClose}>×</button>
      </div>

      <div className="dialog-tabs">
        <button
          className={activeTab === 'social' ? 'active' : ''}
          onClick={() => setActiveTab('social')}
        >
          Social Media
        </button>
        <button
          className={activeTab === 'stock' ? 'active' : ''}
          onClick={() => setActiveTab('stock')}
        >
          Stock Photos
        </button>
        <button
          className={activeTab === 'api' ? 'active' : ''}
          onClick={() => setActiveTab('api')}
        >
          API Keys
        </button>
      </div>

      <div className="dialog-content">
        {activeTab === 'social' && (
          <div className="social-media-tab">
            <h3>Connected Accounts</h3>
            <div className="accounts-list">
              {socialAccounts.map((account) => (
                <div key={account.platform} className="account-item">
                  <div className="account-info">
                    <strong>{account.platform}</strong>
                    <span>{account.username}</span>
                  </div>
                  <button className={account.connected ? 'disconnect' : 'connect'}>
                    {account.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>

            <div className="share-section">
              <h4>Share Current Image</h4>
              <textarea placeholder="Add a caption..."></textarea>
              <input type="text" placeholder="Add tags (comma-separated)" />
              <button className="share-button">Share</button>
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="stock-photos-tab">
            <div className="stock-search">
              <select value={stockProvider} onChange={(e) => setStockProvider(e.target.value)}>
                <option value="unsplash">Unsplash</option>
                <option value="pexels">Pexels</option>
                <option value="shutterstock">Shutterstock</option>
              </select>
              <input
                type="text"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Search stock photos..."
              />
              <button onClick={handleStockSearch}>Search</button>
            </div>

            <div className="stock-results">
              {stockPhotos.map((photo) => (
                <div key={photo.id} className="stock-photo-item">
                  <img src={photo.thumbnail} alt={photo.description} />
                  <div className="photo-info">
                    <p>{photo.photographer}</p>
                    <button>Download</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'api' && (
          <div className="api-keys-tab">
            <h3>API Configuration</h3>
            <div className="api-key-form">
              <label>
                Unsplash API Key
                <input type="password" placeholder="Enter API key" defaultValue="********" />
              </label>
              <label>
                Pexels API Key
                <input type="password" placeholder="Enter API key" defaultValue="********" />
              </label>
              <label>
                Shutterstock API Key
                <input type="password" placeholder="Enter API key" />
              </label>
              <button className="save-button">Save API Keys</button>
            </div>
            <p className="help-text">
              API keys are encrypted and stored securely. Never share your API keys.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
