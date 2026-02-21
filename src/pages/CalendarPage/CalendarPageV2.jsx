import React, { useState, useEffect } from 'react';
import { Calendar, Clock, TrendingUp, Zap, Settings, Plus, BarChart3 } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import UserNavbar from '../../components/User/UserNavbar';
import UserSidebar from '../../components/User/UserSidebar';
import CalendarView from './components/CalendarView';
import DraftsSidebar from './components/DraftsSidebar';
import ScheduleModal from './components/ScheduleModal';
import OptimalTimesPanel from './components/OptimalTimesPanel';
import GhostSlotsToggle from './components/GhostSlotsToggle';
import BulkScheduleModal from './components/BulkScheduleModal';
import useCalendarStore from '../../stores/CalendarStore';
import '../../styles/CalendarV2.css';

/**
 * CalendarPageV2 - Main scheduling and content management hub
 * Features:
 * - Month/Week/Day views
 * - Drag-and-drop rescheduling
 * - Ghost Slots (AI suggestions)
 * - Optimal time recommendations
 * - Multi-platform posting
 */
export default function CalendarPageV2() {
  const {
    posts,
    drafts,
    ghostSlots,
    calendarSettings,
    viewMode,
    selectedDate,
    loading,
    fetchPosts,
    fetchDrafts,
    fetchGhostSlots,
    fetchCalendarSettings,
    setViewMode,
    setSelectedDate,
    updatePost,
  } = useCalendarStore();

  const [editingPost, setEditingPost] = useState(null);
  const [showOptimalTimes, setShowOptimalTimes] = useState(false);
  const [showBulkSchedule, setShowBulkSchedule] = useState(false);

  // Initial data load
  useEffect(() => {
    fetchPosts();
    fetchDrafts();
    fetchCalendarSettings();
  }, []);

  // Load ghost slots if enabled
  useEffect(() => {
    if (calendarSettings?.ghost_slots_enabled) {
      fetchGhostSlots();
    }
  }, [calendarSettings?.ghost_slots_enabled]);

  // Handle post click from calendar
  const handlePostClick = (post) => {
    setEditingPost(post);
  };

  // Handle drag and drop reschedule
  const handlePostReschedule = async (postId, newDate) => {
    try {
      await updatePost(postId, { scheduled_at: newDate.toISOString() });
    } catch (error) {
      console.error('Failed to reschedule:', error);
    }
  };

  // Handle ghost slot acceptance
  const handleAcceptGhostSlot = (ghostSlot) => {
    // Open schedule modal with pre-filled data
    setEditingPost({
      ghost_slot_id: ghostSlot.id,
      caption: ghostSlot.suggested_prompt,
      scheduled_at: ghostSlot.suggested_date,
      platform: ghostSlot.platform,
    });
  };

  return (
    <div className="calendar-v2-shell">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'var(--panel-bg)',
            color: 'var(--text-main)',
            border: '1px solid var(--border-color)',
          },
        }}
      />

      <UserNavbar />

      <div className="calendar-v2-layout">
        {/* Global App Sidebar */}
        <UserSidebar />

        {/* Drafts Sidebar (Left) */}
        <DraftsSidebar
          drafts={drafts}
          onDraftClick={(draft) => setEditingPost({
            generation_id: draft.generation_id,
            caption: draft.caption,
            media_type: draft.generations?.media_type,
            storage_path: draft.generations?.storage_path,
          })}
        />

        {/* Main Calendar Area */}
        <main className="calendar-main-area">
          {/* Header Controls */}
          <div className="calendar-header">
            <div className="header-left">
              <h1>Content Calendar</h1>
              <p className="header-subtitle">
                {posts.length} scheduled • {drafts.length} drafts
                {calendarSettings?.ghost_slots_enabled && ghostSlots.length > 0 && (
                  <span className="ghost-badge">
                    <Zap size={12} />
                    {ghostSlots.length} AI suggestions
                  </span>
                )}
              </p>
            </div>

            <div className="header-actions">
              {/* Ghost Slots Toggle */}
              <GhostSlotsToggle
                enabled={calendarSettings?.ghost_slots_enabled}
                ghostCount={ghostSlots.length}
              />

              {/* Optimal Times Button */}
              <button
                className="btn-header-action"
                onClick={() => setShowOptimalTimes(!showOptimalTimes)}
                title="View Optimal Posting Times"
              >
                <TrendingUp size={18} />
                <span>Best Times</span>
              </button>

              {/* Bulk Schedule Button */}
              <button
                className="btn-header-action"
                onClick={() => setShowBulkSchedule(true)}
                title="Schedule Multiple Posts"
              >
                <Calendar size={18} />
                <span>Bulk Schedule</span>
              </button>

              {/* View Mode Switcher */}
              <div className="view-mode-switcher">
                <button
                  className={viewMode === 'month' ? 'active' : ''}
                  onClick={() => setViewMode('month')}
                >
                  Month
                </button>
                <button
                  className={viewMode === 'week' ? 'active' : ''}
                  onClick={() => setViewMode('week')}
                >
                  Week
                </button>
                <button
                  className={viewMode === 'day' ? 'active' : ''}
                  onClick={() => setViewMode('day')}
                >
                  Day
                </button>
              </div>

              {/* Quick Stats */}
              <button
                className="btn-icon-only"
                onClick={() => alert('Analytics coming soon!')}
                title="View Analytics"
              >
                <BarChart3 size={20} />
              </button>
            </div>
          </div>

          {/* Calendar View */}
          {loading ? (
            <div className="calendar-loading">
              <div className="loading-spinner" />
              <span>Loading calendar...</span>
            </div>
          ) : (
            <CalendarView
              viewMode={viewMode}
              selectedDate={selectedDate}
              posts={posts}
              ghostSlots={ghostSlots}
              onPostClick={handlePostClick}
              onPostReschedule={handlePostReschedule}
              onGhostSlotClick={handleAcceptGhostSlot}
              onDateChange={setSelectedDate}
            />
          )}

          {/* Optimal Times Overlay Panel */}
          {showOptimalTimes && (
            <OptimalTimesPanel onClose={() => setShowOptimalTimes(false)} />
          )}
        </main>
      </div>

      {/* Schedule Modal */}
      {editingPost && (
        <ScheduleModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={() => {
            setEditingPost(null);
            fetchPosts();
            fetchDrafts();
          }}
        />
      )}

      {/* Bulk Schedule Modal */}
      {showBulkSchedule && (
        <BulkScheduleModal
          onClose={() => setShowBulkSchedule(false)}
          onComplete={() => {
            setShowBulkSchedule(false);
            fetchPosts();
            fetchDrafts();
          }}
        />
      )}
    </div>
  );
}