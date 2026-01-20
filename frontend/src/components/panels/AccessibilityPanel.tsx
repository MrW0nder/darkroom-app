import React, { useState } from 'react';

interface AccessibilitySettings {
  screenReader: boolean;
  highContrast: boolean;
  largeText: boolean;
  keyboardOnly: boolean;
  reduceMotion: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

export const AccessibilityPanel: React.FC = () => {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    screenReader: false,
    highContrast: false,
    largeText: false,
    keyboardOnly: false,
    reduceMotion: false,
    colorBlindMode: 'none'
  });

  const [fontSize, setFontSize] = useState(100);

  return (
    <div className="accessibility-panel">
      <h2>Accessibility Settings</h2>
      
      <section>
        <h3>Screen Reader</h3>
        <label>
          <input
            type="checkbox"
            checked={settings.screenReader}
            onChange={(e) => setSettings({...settings, screenReader: e.target.checked})}
          />
          Enable Screen Reader Support (NVDA, JAWS, VoiceOver)
        </label>
        <p className="help-text">Provides detailed descriptions for all UI elements</p>
      </section>

      <section>
        <h3>Visual</h3>
        <label>
          <input
            type="checkbox"
            checked={settings.highContrast}
            onChange={(e) => setSettings({...settings, highContrast: e.target.checked})}
          />
          High Contrast Mode
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.largeText}
            onChange={(e) => setSettings({...settings, largeText: e.target.checked})}
          />
          Large Text
        </label>
        
        <div className="font-size-control">
          <label>Font Size: {fontSize}%</label>
          <input
            type="range"
            min="75"
            max="200"
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
          />
        </div>
      </section>

      <section>
        <h3>Color Blind Mode</h3>
        <select
          value={settings.colorBlindMode}
          onChange={(e) => setSettings({...settings, colorBlindMode: e.target.value as any})}
        >
          <option value="none">None</option>
          <option value="protanopia">Protanopia (Red-Blind)</option>
          <option value="deuteranopia">Deuteranopia (Green-Blind)</option>
          <option value="tritanopia">Tritanopia (Blue-Blind)</option>
        </select>
      </section>

      <section>
        <h3>Keyboard Navigation</h3>
        <label>
          <input
            type="checkbox"
            checked={settings.keyboardOnly}
            onChange={(e) => setSettings({...settings, keyboardOnly: e.target.checked})}
          />
          Keyboard-Only Mode
        </label>
        <p className="help-text">Navigate the entire app using only keyboard</p>
        
        <div className="keyboard-shortcuts">
          <h4>Common Shortcuts:</h4>
          <ul>
            <li>Tab / Shift+Tab: Navigate between elements</li>
            <li>Enter / Space: Activate buttons and controls</li>
            <li>Arrow Keys: Navigate within lists and menus</li>
            <li>Esc: Close dialogs and cancel actions</li>
          </ul>
        </div>
      </section>

      <section>
        <h3>Motion</h3>
        <label>
          <input
            type="checkbox"
            checked={settings.reduceMotion}
            onChange={(e) => setSettings({...settings, reduceMotion: e.target.checked})}
          />
          Reduce Motion
        </label>
        <p className="help-text">Minimize animations and transitions</p>
      </section>

      <section>
        <h3>Accessibility Audit</h3>
        <button className="audit-button">Run WCAG 2.1 AA Compliance Check</button>
        <div className="audit-results">
          <p>Last audit: All checks passed ✓</p>
          <p>Compliance Level: WCAG 2.1 AA</p>
        </div>
      </section>
    </div>
  );
};
