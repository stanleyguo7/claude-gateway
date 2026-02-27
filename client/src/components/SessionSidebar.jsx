import { useState } from 'react';
import './SessionSidebar.css';

function SessionSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  isOpen,
  onToggle
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartRename = (e, session) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleFinishRename = (sessionId) => {
    if (editTitle.trim()) {
      onRenameSession(sessionId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const handleKeyDown = (e, sessionId) => {
    if (e.key === 'Enter') {
      handleFinishRename(sessionId);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditTitle('');
    }
  };

  const handleDelete = (e, sessionId) => {
    e.stopPropagation();
    onDeleteSession(sessionId);
  };

  return (
    <>
      <button className="sidebar-toggle" onClick={onToggle}>
        {isOpen ? '\u2715' : '\u2630'}
      </button>
      <aside className={`session-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Chats</h2>
          <button className="new-session-btn" onClick={onNewSession}>
            + New
          </button>
        </div>

        <div className="session-list">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
              onClick={() => onSelectSession(session.id)}
            >
              {editingId === session.id ? (
                <input
                  className="session-rename-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleFinishRename(session.id)}
                  onKeyDown={(e) => handleKeyDown(e, session.id)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <>
                  <span className="session-title">{session.title}</span>
                  <div className="session-actions">
                    <button
                      className="session-action-btn"
                      onClick={(e) => handleStartRename(e, session)}
                      title="Rename"
                    >
                      &#9998;
                    </button>
                    <button
                      className="session-action-btn delete"
                      onClick={(e) => handleDelete(e, session.id)}
                      title="Delete"
                    >
                      &#128465;
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {sessions.length === 0 && (
            <div className="no-sessions">No conversations yet</div>
          )}
        </div>
      </aside>
    </>
  );
}

export default SessionSidebar;
