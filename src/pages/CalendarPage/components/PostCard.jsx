import React from 'react';
import { Instagram, Youtube, Video, Facebook, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import '../../../styles/CalendarV2.css';

/**
 * PostCard - Individual post card with platform icon and status
 * Supports drag-and-drop for rescheduling
 */
export default function PostCard({ post, onClick, draggable = true, compact = false, showTime = false, isDragging = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging: isDrag } = useDraggable({
    id: post.id,
    disabled: !draggable,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Get platform icon
  const getPlatformIcon = () => {
    const platform = post.connected_accounts?.platform || post.platform;
    switch (platform) {
      case 'instagram':
        return <Instagram size={14} />;
      case 'youtube':
        return <Youtube size={14} />;
      case 'tiktok':
        return <Video size={14} />;
      case 'facebook':
        return <Facebook size={14} />;
      default:
        return null;
    }
  };

  // Get platform color
  const getPlatformColor = () => {
    const platform = post.connected_accounts?.platform || post.platform;
    switch (platform) {
      case 'instagram':
        return '#E4405F';
      case 'youtube':
        return '#FF0000';
      case 'tiktok':
        return '#000000';
      case 'facebook':
        return '#1877F2';
      default:
        return '#6b7280';
    }
  };

  // Get status badge
  const getStatusBadge = () => {
    switch (post.status) {
      case 'published':
        return (
          <div className="status-badge success">
            <CheckCircle2 size={10} />
            <span>Posted</span>
          </div>
        );
      case 'failed':
        return (
          <div className="status-badge error">
            <AlertCircle size={10} />
            <span>Failed</span>
          </div>
        );
      case 'publishing':
        return (
          <div className="status-badge pending">
            <div className="spinner-tiny" />
            <span>Publishing...</span>
          </div>
        );
      default:
        return null;
    }
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
      ref={setNodeRef}
      style={style}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`post-card ${compact ? 'compact' : ''} ${isDrag || isDragging ? 'dragging' : ''}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label="Open post details"
    >
      {/* Media Thumbnail */}
      {post.generations?.storage_path && (
        <div className="post-thumbnail">
          {post.generations.media_type === 'video' ? (
            <video src={post.generations.storage_path} />
          ) : (
            <img src={post.generations.storage_path} alt="Post media preview" />
          )}
        </div>
      )}

      {/* Post Content */}
      <div className="post-content">
        {/* Platform Badge */}
        <div className="platform-badge" style={{ color: getPlatformColor() }}>
          {getPlatformIcon()}
          {!compact && <span>{post.connected_accounts?.platform || post.platform}</span>}
        </div>

        {/* Caption Preview */}
        {!compact && (
          <p className="post-caption">
            {post.caption?.slice(0, 60) || post.generations?.prompt?.slice(0, 60) || 'No caption'}
            {(post.caption?.length > 60 || post.generations?.prompt?.length > 60) && '...'}
          </p>
        )}

        {/* Time Display */}
        {showTime && post.scheduled_at && (
          <div className="post-time">
            <Clock size={12} />
            <span>{formatTime(post.scheduled_at)}</span>
          </div>
        )}

        {/* Status Badge */}
        {getStatusBadge()}

        {/* Optimal Time Indicator */}
        {post.optimal_time_score > 70 && (
          <div className="optimal-badge" title={`${post.optimal_time_score}% optimal time`}>
            <span>🎯</span>
          </div>
        )}
      </div>
    </div>
  );
}
