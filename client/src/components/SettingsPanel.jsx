import { useState, useEffect } from 'react';
import './SettingsPanel.css';

const MODELS = [
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6' },
  { id: 'claude-opus-4-6', name: 'Claude Opus 4.6' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
];

const STORAGE_KEY = 'claude-gateway-settings';

function getStoredSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // ignore parse errors
  }
  return { model: '', systemPrompt: '', theme: 'dark' };
}

function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function SettingsPanel({ isOpen, onClose, onSettingsChange }) {
  const [settings, setSettings] = useState(getStoredSettings);

  useEffect(() => {
    // Apply theme
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    onSettingsChange(settings);
  }, [settings, onSettingsChange]);

  const handleChange = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="settings-close" onClick={onClose}>&times;</button>
        </div>

        <div className="settings-body">
          <div className="settings-section">
            <label className="settings-label">Model</label>
            <select
              className="settings-select"
              value={settings.model}
              onChange={(e) => handleChange('model', e.target.value)}
            >
              <option value="">Default (server config)</option>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="settings-section">
            <label className="settings-label">System Prompt</label>
            <textarea
              className="settings-textarea"
              value={settings.systemPrompt}
              onChange={(e) => handleChange('systemPrompt', e.target.value)}
              placeholder="Custom system prompt (leave empty for default)"
              rows={4}
            />
          </div>

          <div className="settings-section">
            <label className="settings-label">Theme</label>
            <div className="theme-options">
              <button
                className={`theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleChange('theme', 'dark')}
              >
                Dark
              </button>
              <button
                className={`theme-btn ${settings.theme === 'light' ? 'active' : ''}`}
                onClick={() => handleChange('theme', 'light')}
              >
                Light
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { getStoredSettings };
export default SettingsPanel;
