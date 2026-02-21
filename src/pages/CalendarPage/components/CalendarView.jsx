import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Instagram, Youtube, Video, Facebook } from 'lucide-react';
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import PostCard from './PostCard';
import GhostSlotCard from './GhostSlotCard';
import '../../../styles/CalendarV2.css';

/**
 * CalendarView - Main calendar grid with drag-and-drop support
 * Supports Month/Week/Day views
 */
export default function CalendarView({
  viewMode,
  selectedDate,
  posts,
  ghostSlots,
  onPostClick,
  onPostReschedule,
  onGhostSlotClick,
  onDateChange,
}) {
  const [activePost, setActivePost] = useState(null);

  // Generate calendar dates based on view mode
  const dates = generateCalendarDates(selectedDate, viewMode);

  // Navigation handlers
  const handlePrevious = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() - 1);
    }
    onDateChange(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    onDateChange(newDate);
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  // Get display title
  const getTitle = () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    
    if (viewMode === 'month') {
      return `${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
    } else if (viewMode === 'week') {
      const startOfWeek = getStartOfWeek(selectedDate);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      return `${monthNames[startOfWeek.getMonth()]} ${startOfWeek.getDate()} - ${endOfWeek.getDate()}, ${startOfWeek.getFullYear()}`;
    } else {
      return `${monthNames[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;
    }
  };

  // Drag and drop handlers
  const handleDragStart = (event) => {
    const post = posts.find(p => p.id === event.active.id);
    setActivePost(post);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      // Parse date from droppable ID (format: "date-YYYY-MM-DD")
      const dateStr = over.id.replace('date-', '');
      const newDate = new Date(dateStr);
      
      // Keep the original time, just change the date
      const post = posts.find(p => p.id === active.id);
      if (post && post.scheduled_at) {
        const originalTime = new Date(post.scheduled_at);
        newDate.setHours(originalTime.getHours());
        newDate.setMinutes(originalTime.getMinutes());
      } else {
        // Default to 12:00 PM if no time set
        newDate.setHours(12, 0, 0, 0);
      }
      
      onPostReschedule(active.id, newDate);
    }
    
    setActivePost(null);
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="calendar-view-container">
        {/* Calendar Navigation */}
        <div className="calendar-nav">
          <button className="btn-nav" onClick={handlePrevious}>
            <ChevronLeft size={20} />
          </button>
          
          <h2 className="calendar-title">{getTitle()}</h2>
          
          <button className="btn-nav" onClick={handleNext}>
            <ChevronRight size={20} />
          </button>
          
          <button className="btn-today" onClick={handleToday}>
            Today
          </button>
        </div>

        {/* Calendar Grid */}
        {viewMode === 'month' && (
          <MonthView
            dates={dates}
            posts={posts}
            ghostSlots={ghostSlots}
            onPostClick={onPostClick}
            onGhostSlotClick={onGhostSlotClick}
            selectedDate={selectedDate}
          />
        )}

        {viewMode === 'week' && (
          <WeekView
            dates={dates}
            posts={posts}
            ghostSlots={ghostSlots}
            onPostClick={onPostClick}
            onGhostSlotClick={onGhostSlotClick}
          />
        )}

        {viewMode === 'day' && (
          <DayView
            date={selectedDate}
            posts={posts}
            ghostSlots={ghostSlots}
            onPostClick={onPostClick}
            onGhostSlotClick={onGhostSlotClick}
          />
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activePost && (
          <div className="drag-overlay-post">
            <PostCard post={activePost} isDragging />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ============================================================================
// MONTH VIEW
// ============================================================================
function MonthView({ dates, posts, ghostSlots, onPostClick, onGhostSlotClick, selectedDate }) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();

  return (
    <div className="month-view">
      {/* Days Header */}
      <div className="calendar-header-row">
        {dayNames.map(day => (
          <div key={day} className="day-header">{day}</div>
        ))}
      </div>

      {/* Dates Grid */}
      <div className="calendar-grid">
        {dates.map((date, idx) => {
          const dayPosts = getPostsForDate(posts, date);
          const dayGhostSlots = getGhostSlotsForDate(ghostSlots, date);
          const isToday = isSameDay(date, today);
          const isOtherMonth = date.getMonth() !== selectedDate.getMonth();

          return (
            <CalendarDay
              key={idx}
              date={date}
              posts={dayPosts}
              ghostSlots={dayGhostSlots}
              isToday={isToday}
              isOtherMonth={isOtherMonth}
              onPostClick={onPostClick}
              onGhostSlotClick={onGhostSlotClick}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// WEEK VIEW
// ============================================================================
function WeekView({ dates, posts, ghostSlots, onPostClick, onGhostSlotClick }) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();

  return (
    <div className="week-view">
      <div className="week-grid">
        {dates.map((date, idx) => {
          const dayPosts = getPostsForDate(posts, date);
          const dayGhostSlots = getGhostSlotsForDate(ghostSlots, date);
          const isToday = isSameDay(date, today);

          return (
            <div key={idx} className={`week-column ${isToday ? 'today' : ''}`}>
              <div className="week-day-header">
                <span className="day-name">{dayNames[date.getDay()]}</span>
                <span className="day-number">{date.getDate()}</span>
              </div>
              
              <div className="week-day-content">
                {dayPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onClick={() => onPostClick(post)}
                    compact
                  />
                ))}
                
                {dayGhostSlots.map(slot => (
                  <GhostSlotCard
                    key={slot.id}
                    ghostSlot={slot}
                    onClick={() => onGhostSlotClick(slot)}
                    compact
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// DAY VIEW
// ============================================================================
function DayView({ date, posts, ghostSlots, onPostClick, onGhostSlotClick }) {
  const dayPosts = getPostsForDate(posts, date);
  const dayGhostSlots = getGhostSlotsForDate(ghostSlots, date);
  
  // Group by hour (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="day-view">
      <div className="timeline">
        {hours.map(hour => {
          const hourPosts = dayPosts.filter(p => {
            const postDate = new Date(p.scheduled_at);
            return postDate.getHours() === hour;
          });

          const hourGhostSlots = dayGhostSlots.filter(g => {
            const slotDate = new Date(g.suggested_date);
            return slotDate.getHours() === hour;
          });

          return (
            <div key={hour} className="timeline-hour">
              <div className="hour-label">
                {formatHour(hour)}
              </div>
              
              <div className="hour-content">
                {hourPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onClick={() => onPostClick(post)}
                    showTime
                  />
                ))}
                
                {hourGhostSlots.map(slot => (
                  <GhostSlotCard
                    key={slot.id}
                    ghostSlot={slot}
                    onClick={() => onGhostSlotClick(slot)}
                    showTime
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// CALENDAR DAY (Droppable Cell)
// ============================================================================
function CalendarDay({ date, posts, ghostSlots, isToday, isOtherMonth, onPostClick, onGhostSlotClick }) {
  const dateStr = date.toISOString().split('T')[0];
  const { setNodeRef, isOver } = useDroppable({
    id: `date-${dateStr}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`calendar-day ${isToday ? 'today' : ''} ${isOtherMonth ? 'other-month' : ''} ${isOver ? 'drop-target' : ''}`}
    >
      <div className="day-number">{date.getDate()}</div>
      
      <div className="day-posts">
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onClick={() => onPostClick(post)}
            draggable
          />
        ))}
        
        {ghostSlots.map(slot => (
          <GhostSlotCard
            key={slot.id}
            ghostSlot={slot}
            onClick={() => onGhostSlotClick(slot)}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateCalendarDates(selectedDate, viewMode) {
  if (viewMode === 'month') {
    // Generate 35 or 42 days for month view
    const firstDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const startDate = getStartOfWeek(firstDay);
    return Array.from({ length: 35 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      return date;
    });
  } else if (viewMode === 'week') {
    // Generate 7 days for week view
    const startDate = getStartOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      return date;
    });
  } else {
    // Single day for day view
    return [selectedDate];
  }
}

function getStartOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay()); // Go to Sunday
  d.setHours(0, 0, 0, 0);
  return d;
}

function getPostsForDate(posts, date) {
  return posts.filter(p => {
    if (!p.scheduled_at) return false;
    const pDate = new Date(p.scheduled_at);
    return isSameDay(pDate, date);
  });
}

function getGhostSlotsForDate(ghostSlots, date) {
  return ghostSlots.filter(g => {
    if (!g.suggested_date || g.status !== 'suggested') return false;
    const gDate = new Date(g.suggested_date);
    return isSameDay(gDate, date);
  });
}

function isSameDay(date1, date2) {
  return date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear();
}

function formatHour(hour) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${period}`;
}