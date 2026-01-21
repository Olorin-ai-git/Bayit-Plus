import React, { useState, useCallback } from 'react';
import { SimpleNotificationToast, NotificationToast } from './SimpleNotificationToast';

interface SimpleNotificationContainerProps {
  className?: string;
}

export const SimpleNotificationContainer: React.FC<SimpleNotificationContainerProps> = ({
  className = ''
}) => {
  const [notifications, setNotifications] = useState<NotificationToast[]>([]);

  const addNotification = useCallback((notification: Omit<NotificationToast, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification: NotificationToast = {
      id,
      ...notification
    };
    setNotifications(prev => [...prev, newNotification]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Expose methods globally for easy access
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).addNotification = addNotification;
      (window as any).clearAllNotifications = clearAllNotifications;
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).addNotification;
        delete (window as any).clearAllNotifications;
      }
    };
  }, [addNotification, clearAllNotifications]);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 space-y-2 pointer-events-none max-h-screen overflow-y-auto ${className}`}
      style={{ maxWidth: '420px' }}
    >
      {notifications.map((notification) => (
        <SimpleNotificationToast
          key={notification.id}
          notification={notification}
          onClose={removeNotification}
          className="pointer-events-auto"
        />
      ))}

      {/* Clear All Button (when multiple notifications) */}
      {notifications.length > 1 && (
        <div className="flex justify-end mt-2">
          <button
            onClick={clearAllNotifications}
            className="pointer-events-auto px-3 py-1 text-xs bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Clear All ({notifications.length})
          </button>
        </div>
      )}
    </div>
  );
};