// src/pages/CalendarPage/components/CalendarGrid.jsx
import React from "react";

export default function CalendarGrid({ posts, onPostClick }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  
  // Generate a static 35-day grid for the MVP (starts from last Sunday)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - today.getDay()); // Go back to Sunday
  
  const dates = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    return d;
  });

  // Helper to find posts for a specific day
  const getPostsForDate = (dateObj) => {
    return posts.filter(p => {
      if (!p.scheduled_at) return false;
      const pDate = new Date(p.scheduled_at);
      return pDate.getDate() === dateObj.getDate() && 
             pDate.getMonth() === dateObj.getMonth() &&
             pDate.getFullYear() === dateObj.getFullYear();
    });
  };

  return (
    <div className="calendar-container" style={{ 
      background: "#111317", 
      border: "1px solid #2a2f38", 
      borderRadius: "12px", 
      display: "flex", 
      flexDirection: "column",
      height: "100%" 
    }}>
      {/* Days Header */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(7, 1fr)", 
        borderBottom: "1px solid #2a2f38", 
        background: "#1a1d23" 
      }}>
        {days.map(d => (
          <div key={d} style={{ padding: "12px", textAlign: "center", color: "#6b7280", fontSize: "0.85rem", fontWeight: "600" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Dates Grid */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(7, 1fr)", 
        flex: 1, 
        gridAutoRows: "1fr" 
      }}>
        {dates.map((date, idx) => {
          const dayPosts = getPostsForDate(date);
          const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
          const isDifferentMonth = date.getMonth() !== today.getMonth();

          return (
            <div key={idx} style={{ 
              borderRight: "1px solid #2a2f38", 
              borderBottom: "1px solid #2a2f38", 
              padding: "8px", 
              minHeight: "100px",
              background: isDifferentMonth ? "#0d0f13" : "transparent",
              position: "relative"
            }}>
              {/* Date Number */}
              <span style={{ 
                fontSize: "0.85rem", 
                fontWeight: "500", 
                color: isToday ? "#4f46e5" : (isDifferentMonth ? "#333" : "#ccc"),
                display: "block",
                marginBottom: "6px"
              }}>
                {date.getDate()}
              </span>

              {/* Post Pills */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {dayPosts.map(post => (
                  <div 
                    key={post.id} 
                    onClick={() => onPostClick(post)}
                    style={{ 
                      background: "#252932", 
                      border: "1px solid #2a2f38",
                      borderRadius: "6px", 
                      padding: "4px", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: "6px",
                      cursor: "pointer",
                      overflow: "hidden"
                    }}
                  >
                    {/* Thumbnail */}
                    <div style={{ width: "20px", height: "20px", borderRadius: "4px", overflow: "hidden", flexShrink: 0, background: "#000" }}>
                       {post.generations?.media_type === 'video' ? (
                         <video src={post.generations?.storage_path} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                       ) : (
                         <img src={post.generations?.storage_path} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                       )}
                    </div>
                    {/* Platform Icon / Name */}
                    <span style={{ fontSize: "0.7rem", color: "#fff", whiteSpace: "nowrap" }}>
                      {post.connected_accounts?.platform || "Post"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}