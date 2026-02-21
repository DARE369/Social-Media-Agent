import React, { useState, useEffect } from 'react';
import { X, Calendar, Wand2, Check, AlertCircle } from 'lucide-react';
import useCalendarStore from '../../../stores/CalendarStore';
import { getRecommendedTime } from '../../../services/OptimalTimesService';
import '../../../styles/CalendarV2.css';

/**
 * BulkScheduleModal - Schedule multiple drafts at once
 * Uses AI to suggest optimal posting times
 */
export default function BulkScheduleModal({ onClose, onComplete }) {
  const { drafts, updatePost } = useCalendarStore();
  
  const [selectedDrafts, setSelectedDrafts] = useState([]);
  const [scheduleMode, setScheduleMode] = useState('auto'); // 'auto' or 'manual'
  const [scheduledItems, setScheduledItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Select, 2: Review, 3: Confirm

  // Initialize selection
  useEffect(() => {
    if (drafts.length > 0) {
      // Auto-select up to 10 drafts
      const initial = drafts.slice(0, 10).map(d => d.id);
      setSelectedDrafts(initial);
    }
  }, [drafts]);

  // Toggle draft selection
  const toggleDraft = (draftId) => {
    setSelectedDrafts(prev =>
      prev.includes(draftId)
        ? prev.filter(id => id !== draftId)
        : [...prev, draftId]
    );
  };

  // Generate auto schedule
  const handleAutoSchedule = async () => {
    setLoading(true);
    try {
      const selected = drafts.filter(d => selectedDrafts.includes(d.id));
      const scheduled = [];

      for (let i = 0; i < selected.length; i++) {
        const draft = selected[i];
        const platform = draft.connected_accounts?.platform || 'instagram';
        
        // Get optimal time for each post (spread across next 7 days)
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + Math.floor(i / 2) + 1); // 2 posts per day max

        const recommendation = await getRecommendedTime(
          draft.user_id,
          platform,
          targetDate
        );

        scheduled.push({
          draft,
          scheduled_at: recommendation.time,
          score: recommendation.score,
          reasoning: recommendation.reasoning,
        });
      }

      setScheduledItems(scheduled);
      setStep(2);
    } catch (error) {
      console.error('Auto-schedule failed:', error);
      alert('Failed to generate schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Confirm and save schedule
  const handleConfirm = async () => {
    setLoading(true);
    try {
      for (const item of scheduledItems) {
        await updatePost(item.draft.id, {
          scheduled_at: item.scheduled_at.toISOString(),
          status: 'scheduled',
        });
      }

      setStep(3);
      
      // Close after 2 seconds
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (error) {
      console.error('Failed to schedule posts:', error);
      alert('Failed to schedule some posts. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="modal-overlay" onClick={onClose} />

      {/* Modal */}
      <div className="bulk-schedule-modal">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2>Bulk Schedule</h2>
            <p className="modal-subtitle">
              Schedule multiple posts at optimal times
            </p>
          </div>
          <button className="btn-close" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {/* Step 1: Select Drafts */}
          {step === 1 && (
            <div className="bulk-step animate-fade-in">
              <div className="step-header">
                <h3>Select Posts to Schedule</h3>
                <span className="selection-count">
                  {selectedDrafts.length} selected
                </span>
              </div>

              {/* Draft Selection Grid */}
              <div className="drafts-selection-grid">
                {drafts.length === 0 ? (
                  <div className="empty-state-small">
                    <AlertCircle size={32} opacity={0.3} />
                    <p>No drafts available</p>
                    <span>Create content first to use bulk scheduling</span>
                  </div>
                ) : (
                  drafts.map(draft => {
                    const isSelected = selectedDrafts.includes(draft.id);
                    return (
                      <div
                        key={draft.id}
                        className={`draft-selection-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleDraft(draft.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            toggleDraft(draft.id);
                          }
                        }}
                      >
                        {/* Selection Checkbox */}
                        <div className={`selection-checkbox ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <Check size={14} />}
                        </div>

                        {/* Media Thumbnail */}
                        <div className="draft-thumbnail">
                          {draft.generations?.media_type === 'video' ? (
                            <video src={draft.generations?.storage_path} />
                          ) : (
                            <img src={draft.generations?.storage_path} alt="" />
                          )}
                        </div>

                        {/* Draft Info */}
                        <div className="draft-info">
                          <p className="draft-caption">
                            {draft.caption || draft.generations?.prompt || 'Untitled'}
                          </p>
                          <span className="draft-platform">
                            {draft.connected_accounts?.platform || 'No platform'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Schedule Mode Toggle */}
              {selectedDrafts.length > 0 && (
                <div className="schedule-mode-section">
                  <label>Schedule Mode:</label>
                  <div className="mode-toggle-group">
                    <button
                      className={scheduleMode === 'auto' ? 'active' : ''}
                      onClick={() => setScheduleMode('auto')}
                      type="button"
                    >
                      <Wand2 size={16} />
                      Auto (AI Suggests Times)
                    </button>
                    <button
                      className={scheduleMode === 'manual' ? 'active' : ''}
                      onClick={() => setScheduleMode('manual')}
                      disabled
                      title="Coming soon"
                      type="button"
                    >
                      <Calendar size={16} />
                      Manual (Pick Times)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Review Schedule */}
          {step === 2 && (
            <div className="bulk-step animate-fade-in">
              <div className="step-header">
                <h3>Review Schedule</h3>
                <p className="step-description">
                  AI has optimized posting times based on your audience engagement
                </p>
              </div>

              {/* Schedule Preview */}
              <div className="schedule-preview">
                {scheduledItems.map((item, idx) => (
                  <div key={idx} className="schedule-preview-item">
                    {/* Media Thumbnail */}
                    <div className="preview-thumbnail">
                      {item.draft.generations?.media_type === 'video' ? (
                        <video src={item.draft.generations?.storage_path} />
                      ) : (
                        <img src={item.draft.generations?.storage_path} alt="" />
                      )}
                    </div>

                    {/* Schedule Info */}
                    <div className="preview-info">
                      <div className="preview-caption">
                        {item.draft.caption?.slice(0, 60) || 'Untitled'}...
                      </div>
                      <div className="preview-platform">
                        {item.draft.connected_accounts?.platform || 'Unknown'}
                      </div>
                    </div>

                    {/* Time Display */}
                    <div className="preview-time">
                      <div className="time-display">
                        <Calendar size={14} />
                        <span>{formatDateTime(item.scheduled_at)}</span>
                      </div>
                      <div className="optimal-score">
                        {item.score}% optimal
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div className="preview-reasoning">
                      {item.reasoning}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="bulk-step animate-fade-in success-state">
              <div className="success-icon">
                <Check size={48} />
              </div>
              <h3>Successfully Scheduled!</h3>
              <p>
                {scheduledItems.length} posts have been added to your calendar
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-footer">
          {step === 1 && (
            <>
              <button className="btn-secondary" onClick={onClose} type="button">
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleAutoSchedule}
                disabled={selectedDrafts.length === 0 || loading}
                type="button"
              >
                {loading ? 'Generating Schedule...' : `Schedule ${selectedDrafts.length} Posts`}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button className="btn-secondary" onClick={() => setStep(1)} type="button">
                Back
              </button>
              <button
                className="btn-primary"
                onClick={handleConfirm}
                disabled={loading}
                type="button"
              >
                {loading ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Helper function
function formatDateTime(date) {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
