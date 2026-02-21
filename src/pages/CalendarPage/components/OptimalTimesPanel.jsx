import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Clock, BarChart3, Info, Instagram, Youtube, Video, Facebook } from 'lucide-react';
import { supabase } from '../../../services/supabaseClient';
import '../../../styles/CalendarV2.css';

/**
 * OptimalTimesPanel - Displays AI-analyzed best posting times
 * Shows per-platform recommendations with confidence scores
 */
export default function OptimalTimesPanel({ onClose }) {
  const [optimalTimes, setOptimalTimes] = useState([]);
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOptimalTimes();
  }, []);

  const fetchOptimalTimes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('optimal_posting_times')
        .select('*')
        .eq('user_id', user.id)
        .gte('sample_size', 3) // Only show times with enough data
        .order('score', { ascending: false });

      if (error) throw error;

      setOptimalTimes(data || []);
    } catch (error) {
      console.error('Failed to fetch optimal times:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group by platform
  const groupedTimes = optimalTimes.reduce((acc, time) => {
    if (!acc[time.platform]) {
      acc[time.platform] = [];
    }
    acc[time.platform].push(time);
    return acc;
  }, {});

  // Filter by selected platform
  const displayData = selectedPlatform === 'all' 
    ? groupedTimes 
    : { [selectedPlatform]: groupedTimes[selectedPlatform] || [] };

  // Get platform icon
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'instagram': return <Instagram size={20} />;
      case 'youtube': return <Youtube size={20} />;
      case 'tiktok': return <Video size={20} />;
      case 'facebook': return <Facebook size={20} />;
      default: return null;
    }
  };

  // Get platform color
  const getPlatformColor = (platform) => {
    switch (platform) {
      case 'instagram': return '#E4405F';
      case 'youtube': return '#FF0000';
      case 'tiktok': return '#000000';
      case 'facebook': return '#1877F2';
      default: return 'var(--brand-primary)';
    }
  };

  // Format day name
  const getDayName = (day) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day];
  };

  // Format hour
  const formatHour = (hour) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  };

  // Get score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 60) return 'var(--warning)';
    return 'var(--text-muted)';
  };

  return (
    <>
      {/* Overlay */}
      <div className="modal-overlay" onClick={onClose} />

      {/* Panel */}
      <div className="optimal-times-panel">
        {/* Header */}
        <div className="panel-header">
          <div className="header-title-group">
            <TrendingUp size={24} />
            <div>
              <h2>Best Posting Times</h2>
              <p className="header-subtitle">AI-analyzed optimal times based on your performance</p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {/* Platform Filter */}
        <div className="platform-filter">
          <button
            className={`filter-btn ${selectedPlatform === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedPlatform('all')}
            type="button"
          >
            All Platforms
          </button>
          {Object.keys(groupedTimes).map(platform => (
            <button
              key={platform}
              className={`filter-btn ${selectedPlatform === platform ? 'active' : ''}`}
              onClick={() => setSelectedPlatform(platform)}
              style={{ 
                borderColor: selectedPlatform === platform ? getPlatformColor(platform) : undefined,
                color: selectedPlatform === platform ? getPlatformColor(platform) : undefined,
              }}
              type="button"
            >
              {getPlatformIcon(platform)}
              <span style={{ textTransform: 'capitalize' }}>{platform}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="panel-content-scroll">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <span>Analyzing your posting history...</span>
            </div>
          ) : optimalTimes.length === 0 ? (
            <div className="empty-state">
              <BarChart3 size={48} opacity={0.3} />
              <h3>No Data Yet</h3>
              <p>Publish at least 5 posts with engagement data to see optimal posting times.</p>
              <div className="info-box">
                <Info size={16} />
                <span>Our AI will analyze your post performance and learn the best times for your audience.</span>
              </div>
            </div>
          ) : (
            <div className="platforms-grid">
              {Object.entries(displayData).map(([platform, times]) => (
                <div key={platform} className="platform-section">
                  {/* Platform Header */}
                  <div className="platform-section-header">
                    <div className="platform-badge-large" style={{ color: getPlatformColor(platform) }}>
                      {getPlatformIcon(platform)}
                      <span>{platform}</span>
                    </div>
                    <span className="data-points">
                      {times.reduce((sum, t) => sum + t.sample_size, 0)} posts analyzed
                    </span>
                  </div>

                  {/* Time Slots */}
                  <div className="time-slots-grid">
                    {times.slice(0, 6).map((time, idx) => (
                      <div key={idx} className="time-slot-card">
                        {/* Rank Badge */}
                        {idx < 3 && (
                          <div className={`rank-badge rank-${idx + 1}`}>
                            #{idx + 1}
                          </div>
                        )}

                        {/* Time Info */}
                        <div className="time-info">
                          <div className="day-name">
                            {getDayName(time.day_of_week)}
                          </div>
                          <div className="hour-display">
                            <Clock size={16} />
                            <span>{formatHour(time.hour_of_day)}</span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className="score-display">
                          <div 
                            className="score-bar"
                            style={{ 
                              width: `${time.score}%`,
                              backgroundColor: getScoreColor(time.score),
                            }}
                          />
                          <span 
                            className="score-value"
                            style={{ color: getScoreColor(time.score) }}
                          >
                            {Math.round(time.score)}%
                          </span>
                        </div>

                        {/* Sample Size */}
                        <div className="sample-size">
                          Based on {time.sample_size} {time.sample_size === 1 ? 'post' : 'posts'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Platform Insights */}
                  <div className="platform-insights">
                    <div className="insight-badge">
                      <TrendingUp size={14} />
                      <span>
                        Best day: <strong>{getDayName(times[0].day_of_week)}</strong>
                      </span>
                    </div>
                    <div className="insight-badge">
                      <Clock size={14} />
                      <span>
                        Peak time: <strong>{formatHour(times[0].hour_of_day)}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {optimalTimes.length > 0 && (
          <div className="panel-footer">
            <div className="info-box">
              <Info size={16} />
              <span>
                Times are updated daily based on your post performance. The more you post, the smarter the recommendations become.
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
