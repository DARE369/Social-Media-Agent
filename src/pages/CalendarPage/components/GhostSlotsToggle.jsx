import React, { useState } from 'react';
import { Sparkles, Zap, Settings } from 'lucide-react';
import useCalendarStore from '../../../stores/CalendarStore';
import '../../../styles/CalendarV2.css';

/**
 * GhostSlotsToggle - Quick toggle for enabling/disabling AI suggestions
 * Shows count of active ghost slots
 */
export default function GhostSlotsToggle({ enabled, ghostCount }) {
  const { updateCalendarSettings, fetchGhostSlots } = useCalendarStore();
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await updateCalendarSettings({
        ghost_slots_enabled: !enabled,
      });

      if (!enabled) {
        // Fetch ghost slots when enabling
        await fetchGhostSlots();
      }
    } catch (error) {
      console.error('Failed to toggle ghost slots:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ghost-slots-toggle-container">
      {/* Main Toggle Button */}
      <button
        className={`ghost-toggle-btn ${enabled ? 'active' : ''}`}
        onClick={handleToggle}
        disabled={loading}
      >
        <div className="toggle-icon">
          {loading ? (
            <div className="spinner-tiny" />
          ) : (
            <Sparkles size={18} />
          )}
        </div>
        
        <div className="toggle-content">
          <span className="toggle-label">AI Suggestions</span>
          {enabled && ghostCount > 0 && (
            <span className="ghost-count-badge">{ghostCount} active</span>
          )}
        </div>

        <div className={`toggle-switch ${enabled ? 'on' : 'off'}`}>
          <div className="switch-knob" />
        </div>
      </button>

      {/* Settings Button */}
      <button
        className="btn-icon-only"
        onClick={() => setShowSettings(!showSettings)}
        title="Ghost Slots Settings"
      >
        <Settings size={16} />
      </button>

      {/* Settings Dropdown */}
      {showSettings && (
        <GhostSlotsSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

/**
 * GhostSlotsSettings - Settings dropdown for AI suggestions
 */
function GhostSlotsSettings({ onClose }) {
  const { calendarSettings, updateCalendarSettings } = useCalendarStore();
  const [frequency, setFrequency] = useState(calendarSettings?.preferred_post_frequency || 7);

  const handleSave = async () => {
    try {
      await updateCalendarSettings({
        preferred_post_frequency: frequency,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <>
      <div className="dropdown-overlay" onClick={onClose} />
      <div className="ghost-settings-dropdown">
        <div className="dropdown-header">
          <Zap size={18} />
          <h4>AI Suggestions Settings</h4>
        </div>

        <div className="dropdown-content">
          {/* Posting Frequency */}
          <div className="setting-group">
            <label>
              <strong>Target Posts Per Week</strong>
              <span className="setting-description">
                How often you want to post. AI will distribute suggestions accordingly.
              </span>
            </label>
            
            <div className="frequency-selector">
              {[3, 5, 7, 10, 14].map((num) => (
                <button
                  key={num}
                  className={`frequency-btn ${frequency === num ? 'active' : ''}`}
                  onClick={() => setFrequency(num)}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* How It Works */}
          <div className="info-box">
            <Sparkles size={14} />
            <div>
              <strong>How AI Suggestions Work:</strong>
              <ul>
                <li>Analyzes your content pillars & posting history</li>
                <li>Monitors trending topics daily</li>
                <li>Suggests optimal posting times</li>
                <li>Generates 7 days of suggestions ahead</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="dropdown-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </>
  );
}