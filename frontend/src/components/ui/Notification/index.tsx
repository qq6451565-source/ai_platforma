import React from 'react';
import { Badge } from '../Badge';
import './styles.css';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  unread?: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
  icon?: React.ReactNode;
}

interface NotificationProps {
  notifications: NotificationItem[];
  onNotificationClick?: (id: string) => void;
  onMarkAllRead?: () => void;
}

export const NotificationPanel: React.FC<NotificationProps> = ({
  notifications,
  onNotificationClick,
  onMarkAllRead,
}) => {
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="notification-panel">
      <div className="notification-header">
        <h3 className="notification-title">
          Notifications
          {unreadCount > 0 && (
            <Badge variant="primary" size="sm" className="ml-2">
              {unreadCount}
            </Badge>
          )}
        </h3>
        {unreadCount > 0 && (
          <button type="button" className="notification-mark-all" onClick={onMarkAllRead}>
            Mark all read
          </button>
        )}
      </div>
      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="notification-empty">
            <span className="notification-empty-icon">🔔</span>
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${notification.unread ? 'unread' : ''}`}
              onClick={() => onNotificationClick?.(notification.id)}
            >
              {notification.icon && (
                <div className={`notification-icon notification-icon-${notification.type || 'info'}`}>
                  {notification.icon}
                </div>
              )}
              <div className="notification-content">
                <div className="notification-item-title">{notification.title}</div>
                <div className="notification-message">{notification.message}</div>
                <div className="notification-time">{notification.time}</div>
              </div>
              {notification.unread && <div className="notification-unread-dot" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
