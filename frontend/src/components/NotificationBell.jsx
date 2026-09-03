import { useEffect, useRef } from 'react';
import { Bell, AlertCircle } from 'lucide-react';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(diff / 86400000);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

export default function NotificationBell({
  notifications, open, onToggle, onClose, triggerClassName, placement = 'topbar',
}) {
  const { items, unread_count: unreadCount } = notifications;
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleOutsideClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open, onClose]);

  return (
    <div className="notification-bell" ref={wrapperRef}>
      <button
        className={triggerClassName}
        onClick={onToggle}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={`notification-panel notification-panel-${placement}`}>
          <div className="notification-panel-header">
            <span>Notifications</span>
            <span className="notification-panel-subtitle">Your latest job matches</span>
          </div>
          {items.length === 0 ? (
            <p className="notification-empty">No alerts yet - matches will show up here even if the email doesn't arrive.</p>
          ) : (
            <ul className="notification-list">
              {items.map((n) => (
                <li key={n.id} className="notification-item">
                  <a href={n.job_url} target="_blank" rel="noreferrer" className="notification-item-link">
                    <span className="notification-title">{n.job_title}</span>
                    <span className="notification-company">{n.job_company}</span>
                  </a>
                  <div className="notification-item-footer">
                    <span className="notification-time">{timeAgo(n.sent_at)}</span>
                    {!n.email_sent && (
                      <span className="notification-flag">
                        <AlertCircle size={12} />
                        Email failed
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
