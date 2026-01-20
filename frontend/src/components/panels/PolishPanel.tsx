import React, { useState } from 'react';

interface Theme {
  name: string;
  mode: 'dark' | 'light' | 'auto';
  accentColor: string;
}

interface WorkspaceLayout {
  name: string;
  default: boolean;
}

export const PolishPanel: React.FC = () => {
  const [selectedTheme, setSelectedTheme] = useState<Theme>({
    name: 'Dark Pro',
    mode: 'dark',
    accentColor: '#0066cc'
  });

  const [selectedWorkspace, setSelectedWorkspace] = useState('Default');
  const [animationSpeed, setAnimationSpeed] = useState('normal');
  const [fontSize, setFontSize] = useState('medium');

  const themes: Theme[] = [
    { name: 'Dark Pro', mode: 'dark', accentColor: '#0066cc' },
    { name: 'Light Classic', mode: 'light', accentColor: '#0099ff' },
    { name: 'Auto', mode: 'auto', accentColor: '#6600cc' },
    { name: 'High Contrast', mode: 'dark', accentColor: '#ffff00' }
  ];

  const workspaces: WorkspaceLayout[] = [
    { name: 'Default', default: true },
    { name: 'Photography', default: false },
    { name: 'Editing', default: false },
    { name: 'Export', default: false }
  ];

  return (
    <div className="polish-panel">
      <h2>UI Customization</h2>

      <section>
        <h3>Theme</h3>
        <div className="theme-selector">
          {themes.map((theme) => (
            <button
              key={theme.name}
              className={`theme-option ${selectedTheme.name === theme.name ? 'active' : ''}`}
              onClick={() => setSelectedTheme(theme)}
              style={{ borderColor: theme.accentColor }}
            >
              <div className="theme-preview" style={{ backgroundColor: theme.mode === 'dark' ? '#1a1a1a' : '#ffffff' }}>
                <span>{theme.name}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="accent-color">
          <label>Accent Color:</label>
          <input
            type="color"
            value={selectedTheme.accentColor}
            onChange={(e) => setSelectedTheme({...selectedTheme, accentColor: e.target.value})}
          />
          <span>{selectedTheme.accentColor}</span>
        </div>
      </section>

      <section>
        <h3>Workspace Layouts</h3>
        <div className="workspace-selector">
          {workspaces.map((workspace) => (
            <button
              key={workspace.name}
              className={selectedWorkspace === workspace.name ? 'active' : ''}
              onClick={() => setSelectedWorkspace(workspace.name)}
            >
              {workspace.name}
              {workspace.default && <span className="badge">Default</span>}
            </button>
          ))}
        </div>
        <div className="workspace-actions">
          <button>Save Current Layout</button>
          <button>Reset to Default</button>
        </div>
      </section>

      <section>
        <h3>UI Preferences</h3>
        <div className="preference-item">
          <label>Animation Speed</label>
          <select value={animationSpeed} onChange={(e) => setAnimationSpeed(e.target.value)}>
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
            <option value="none">No Animations</option>
          </select>
        </div>

        <div className="preference-item">
          <label>Font Size</label>
          <select value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
            <option value="extra-large">Extra Large</option>
          </select>
        </div>
      </section>

      <section>
        <h3>Startup Preferences</h3>
        <label>
          <input type="checkbox" defaultChecked />
          Restore last session on startup
        </label>
        <label>
          <input type="checkbox" defaultChecked />
          Check for updates automatically
        </label>
        <label>
          <input type="checkbox" defaultChecked />
          Load plugins on startup
        </label>
        <label>
          <input type="checkbox" />
          Show tips on startup
        </label>
      </section>

      <section>
        <h3>Performance</h3>
        <div className="performance-stats">
          <div>Cache Size: 2.1 GB / 4.0 GB</div>
          <div>GPU Acceleration: Enabled</div>
          <div>Background Processing: Active</div>
        </div>
        <button className="optimize-button">Optimize Performance</button>
        <button className="clear-cache-button">Clear Cache</button>
      </section>
    </div>
  );
};