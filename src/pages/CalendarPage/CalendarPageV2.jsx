import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, Zap, Plus, BarChart3 } from 'lucide-react';
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

const COMPACT_LAYOUT_QUERY = '(max-width: 1180px)';

function isCompactLayoutDefault() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(COMPACT_LAYOUT_QUERY).matches;
}

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
    createPost,
    acceptGhostSlot,
  } = useCalendarStore();

  const [editingPost, setEditingPost] = useState(null);
  const [showOptimalTimes, setShowOptimalTimes] = useState(false);
  const [showBulkSchedule, setShowBulkSchedule] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(isCompactLayoutDefault);
  const [draftsOpen, setDraftsOpen] = useState(() => !isCompactLayoutDefault());

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

  // Keep drawer behavior predictable when crossing tablet/desktop widths.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const media = window.matchMedia(COMPACT_LAYOUT_QUERY);
    const syncLayout = (event) => {
      setIsCompactLayout(event.matches);
      setDraftsOpen(!event.matches);
    };

    syncLayout(media);
    media.addEventListener('change', syncLayout);
    return () => media.removeEventListener('change', syncLayout);
  }, []);

  const closeDraftsIfCompact = () => {
    if (isCompactLayout) {
      setDraftsOpen(false);
    }
  };

  // Handle post click from calendar
  const handlePostClick = (post) => {
    setEditingPost(post);
    closeDraftsIfCompact();
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
    <div className={`calendar-v2-shell ${draftsOpen ? 'drafts-open' : ''}`}>
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
          isCompact={isCompactLayout}
          isOpen={draftsOpen}
          onClose={() => setDraftsOpen(false)}
          onDraftClick={(draft) => {
            setEditingPost(draft);
            closeDraftsIfCompact();
          }}
        />
        {isCompactLayout && draftsOpen && (
          <button
            type="button"
            className="drafts-backdrop"
            aria-label="Close drafts panel"
            onClick={() => setDraftsOpen(false)}
          />
        )}

        {/* Main Calendar Area */}
        <main className="calendar-main-area">
          {/* Header Controls */}
          <div className="calendar-header">
            <div className="header-left">
              <h1>Content Calendar</h1>
              <p className="header-subtitle">
                {posts.length} scheduled | {drafts.length} drafts
                {calendarSettings?.ghost_slots_enabled && ghostSlots.length > 0 && (
                  <span className="ghost-badge">
                    <Zap size={12} />
                    {ghostSlots.length} AI suggestions
                  </span>
                )}
              </p>
            </div>

            <div className="header-actions">
              {isCompactLayout && (
                <button
                  className="btn-header-action"
                  onClick={() => setDraftsOpen((open) => !open)}
                  title={draftsOpen ? 'Hide drafts panel' : 'Open drafts panel'}
                  type="button"
                >
                  <Plus size={18} />
                  <span>{draftsOpen ? 'Hide Drafts' : `Drafts (${drafts.length})`}</span>
                </button>
              )}

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
                type="button"
              >
                <TrendingUp size={18} />
                <span>Best Times</span>
              </button>

              {/* Bulk Schedule Button */}
              <button
                className="btn-header-action"
                onClick={() => setShowBulkSchedule(true)}
                title="Schedule Multiple Posts"
                type="button"
              >
                <Calendar size={18} />
                <span>Bulk Schedule</span>
              </button>

              {/* View Mode Switcher */}
              <div className="view-mode-switcher">
                <button
                  className={viewMode === 'month' ? 'active' : ''}
                  onClick={() => setViewMode('month')}
                  type="button"
                >
                  Month
                </button>
                <button
                  className={viewMode === 'week' ? 'active' : ''}
                  onClick={() => setViewMode('week')}
                  type="button"
                >
                  Week
                </button>
                <button
                  className={viewMode === 'day' ? 'active' : ''}
                  onClick={() => setViewMode('day')}
                  type="button"
                >
                  Day
                </button>
              </div>

              {/* Quick Stats */}
              <button
                className="btn-icon-only"
                onClick={() => setShowOptimalTimes(true)}
                title="View posting-time insights"
                type="button"
              >
                <BarChart3 size={20} />
              </button>
            </div>
            {isCompactLayout && (
              <p className="touch-reflow-note">
                Drag-and-drop is disabled on touch layouts. Tap any post to reschedule.
              </p>
            )}
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
              onGhostSlotDismiss={() => fetchGhostSlots()}
              onDateChange={setSelectedDate}
              allowDragDrop={!isCompactLayout}
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
          onSave={async (payload) => {
            try {
              if (payload.id) {
                await updatePost(payload.id, {
                  caption: payload.caption ?? null,
                  scheduled_at: payload.scheduled_at,
                  status: 'scheduled',
                });
              } else if (payload.ghost_slot_id) {
                await acceptGhostSlot(payload.ghost_slot_id, {
                  caption: payload.caption ?? '',
                  scheduled_at: payload.scheduled_at,
                  status: 'scheduled',
                  platform: payload.platform || 'instagram',
                  generation_id: payload.generation_id || null,
                });
              } else {
                await createPost({
                  caption: payload.caption ?? '',
                  scheduled_at: payload.scheduled_at,
                  status: 'scheduled',
                  platform: payload.platform || 'instagram',
                  generation_id: payload.generation_id || null,
                });
              }
            } catch (error) {
              console.error('Failed to save schedule:', error);
            } finally {
              setEditingPost(null);
              await Promise.all([fetchPosts(), fetchDrafts(), fetchGhostSlots()]);
            }
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

