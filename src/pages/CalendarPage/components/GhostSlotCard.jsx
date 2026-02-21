import React from 'react';
import { Sparkles, TrendingUp, Lightbulb, X } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import '../../../styles/CalendarV2.css';

/**
 * GhostSlotCard - AI-suggested content slot
 * Shows recommended topics and optimal posting times
 */
export default function GhostSlotCard({ ghostSlot, onClick, onDismiss, compact = false, showTime = false }) {
  
  // Handle dismiss
  const handleDismiss = async (e) => {
    e.stopPropagation();
    
    try {
      await supabase
        .from('ghost_slots')
        .update({ status: 'dismissed' })
        .eq('id', ghostSlot.id);

      onDismiss?.(ghostSlot.id);
    } catch (error) {
      console.error('Failed to dismiss ghost slot:', error);
    }
  };

  // Get confidence color
  const getConfidenceColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--text-muted)';
  };

  // Format time
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const handleKeyDown = (event) => {
    if (!onClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`ghost-slot-card ${compact ? 'compact' : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label="Open AI slot suggestion"
    >
      {/* Ghost Icon */}
      <div className="ghost-icon">
        <Sparkles size={compact ? 14 : 18} />
      </div>

      {/* Content */}
      <div className="ghost-content">
        {/* Topic */}
        <div className="ghost-topic">
          <span className="topic-label">AI Suggests:</span>
          <span className="topic-text">{ghostSlot.suggested_topic}</span>
        </div>

        {/* Platform */}
        {ghostSlot.platform && (
          <div className="ghost-platform">
            <span>{ghostSlot.platform}</span>
          </div>
        )}

        {/* Reasoning (only in expanded mode) */}
        {!compact && ghostSlot.reasoning && (
          <div className="ghost-reasoning">
            <Lightbulb size={12} />
            <span>{ghostSlot.reasoning}</span>
          </div>
        )}

        {/* Time Display */}
        {showTime && ghostSlot.suggested_date && (
          <div className="ghost-time">
            <TrendingUp size={12} />
            <span>Best time: {formatTime(ghostSlot.suggested_date)}</span>
          </div>
        )}

        {/* Confidence Score */}
        {ghostSlot.confidence_score && (
          <div className="confidence-badge" style={{ color: getConfidenceColor(ghostSlot.confidence_score) }}>
            {Math.round(ghostSlot.confidence_score)}% match
          </div>
        )}
      </div>

      {/* Dismiss Button */}
      <button
        className="ghost-dismiss"
        onClick={handleDismiss}
        title="Dismiss suggestion"
        type="button"
        aria-label="Dismiss AI suggestion"
      >
        <X size={14} />
      </button>
    </div>
  );
}
