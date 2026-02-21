// src/components/Generate/SessionHistoryRail.jsx
import React, { useEffect } from 'react';
import { Plus, MessageSquare, Clock, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useSessionStore from '../../stores/SessionStore';
import '../../styles/GenerateV2.css';

/**
 * SessionHistoryRail
 * Overlays from the left on the generate canvas.
 * Props:
 *   isOpen  - whether the rail is visible
 *   onClose - callback to close
 *   onOpen  - callback to open
 */
export default function SessionHistoryRail({ isOpen, onClose, onOpen }) {
  const {
    sessions,
    activeSession,
    fetchSessions,
    createSession,
    switchSession,
    deleteSession,
  } = useSessionStore();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleNewSession = async () => {
    try {
      await createSession('New Session');
      onClose?.(); // Close rail after creating so canvas is visible
    } catch (err) {
      toast.error('Could not create session');
    }
  };

  const handleSelect = (sessionId) => {
    switchSession(sessionId);
    onClose?.(); // Close rail after selecting - canvas takes focus
  };

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this session and all its generations?')) return;
    try {
      await deleteSession(sessionId);
      toast.success('Session deleted');
    } catch {
      toast.error('Could not delete session');
    }
  };

  const formatRelative = (dateString) => {
    const date    = new Date(dateString);
    const diffMs  = Date.now() - date.getTime();
    const mins    = Math.floor(diffMs / 60000);
    const hours   = Math.floor(diffMs / 3600000);
    const days    = Math.floor(diffMs / 86400000);

    if (mins  < 1)  return 'Just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 7)  return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Backdrop - tap to close on mobile */}
      {isOpen && (
        <div
          className="session-rail-backdrop"
          onClick={onClose}
          aria-hidden="true"
          style={{
            position:   'absolute',
            inset:      0,
            zIndex:     39,
            background: 'rgba(0,0,0,0.2)',
          }}
        />
      )}

      <aside
        className={`session-history-rail ${isOpen ? '' : 'collapsed'}`}
        aria-label="Session history"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="rail-header">
          <span className="rail-title">Sessions</span>

          <button
            className="btn-new-session"
            onClick={handleNewSession}
            aria-label="New session"
          >
            <Plus size={14} aria-hidden="true" />
            <span>New</span>
          </button>

          <button
            onClick={onClose}
            aria-label="Close session history"
            style={{
              width:          '28px',
              height:         '28px',
              background:     'none',
              border:         '1px solid var(--gen-border)',
              borderRadius:   '7px',
              color:          'var(--gen-text-3)',
              cursor:         'pointer',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              flexShrink:     0,
              transition:     'background 0.15s, color 0.15s',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Sessions list */}
        <div className="sessions-list" role="list">
          {sessions.length === 0 ? (
            <div className="session-empty" role="listitem">
              <MessageSquare size={28} aria-hidden="true" />
              <p>No sessions yet</p>
              <span>Start generating to create one</span>
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = activeSession?.id === session.id;
              return (
                <div
                  key={session.id}
                  className={`session-item ${isActive ? 'active' : ''}`}
                  role="listitem"
                  onClick={() => handleSelect(session.id)}
                  aria-current={isActive ? 'true' : undefined}
                  title={session.title}
                >
                  <div className="session-icon" aria-hidden="true">
                    <MessageSquare size={15} />
                  </div>

                  <div className="session-content">
                    <span className="session-title">{session.title || 'Untitled'}</span>
                    <span className="session-time">
                      <Clock size={10} aria-hidden="true" />
                      {formatRelative(session.updated_at || session.created_at)}
                    </span>
                  </div>

                  <button
                    className="session-delete-btn"
                    onClick={(e) => handleDelete(e, session.id)}
                    aria-label={`Delete session "${session.title}"`}
                    title="Delete session"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Tab toggle on left edge */}
      <button
        className={`rail-toggle-tab ${isOpen ? 'rail-open' : 'rail-closed'}`}
        onClick={isOpen ? onClose : onOpen}
        aria-label={isOpen ? 'Close session history' : 'Open session history'}
        style={{ pointerEvents: 'auto', opacity: 1 }}
      >
        {isOpen ? (
          <ChevronLeft size={14} aria-hidden="true" />
        ) : (
          <ChevronRight size={14} aria-hidden="true" />
        )}
      </button>
    </>
  );
}
