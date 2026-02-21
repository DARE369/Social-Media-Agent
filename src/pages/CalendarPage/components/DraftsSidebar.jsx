// src/pages/CalendarPage/components/DraftsSidebar.jsx
import React from "react";
import { Calendar } from "lucide-react";

export default function DraftsSidebar({ drafts, onDraftClick }) {
  return (
    <aside className="drafts-sidebar">
      <div className="drafts-header">
        <h3>Unscheduled Drafts</h3>
        <span className="drafts-count">{drafts.length}</span>
      </div>
      <p className="drafts-subtitle">Drag to calendar or click to schedule</p>

      <div className="drafts-list">
        {drafts.length === 0 ? (
          <div className="drafts-empty">
            <Calendar size={32} opacity={0.3} />
            <p>No drafts</p>
            <span>Create content in Generate page</span>
          </div>
        ) : (
          drafts.map((draft) => (
            <div 
              key={draft.id} 
              className="draft-card"
              onClick={() => onDraftClick(draft)}
            >
              {/* Thumbnail */}
              <div className="draft-thumbnail">
                {draft.generations?.media_type === 'video' ? (
                  <video src={draft.generations?.storage_path} />
                ) : (
                  <img src={draft.generations?.storage_path} alt="" />
                )}
                <span className="media-badge">
                  {draft.generations?.media_type || 'IMAGE'}
                </span>
              </div>

              {/* Caption */}
              <p className="draft-caption">
                {draft.caption || draft.generations?.prompt || 'Untitled Draft'}
              </p>

              {/* Platform */}
              {draft.connected_accounts?.platform && (
                <span className="draft-platform">
                  {draft.connected_accounts.platform}
                </span>
              )}

              {/* CTA */}
              <button 
                className="btn-schedule-draft"
                onClick={(e) => {
                  e.stopPropagation();
                  onDraftClick(draft);
                }}
              >
                <Calendar size={14} />
                Schedule
              </button>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}