import React, { useState, useEffect, useCallback } from 'react';
import { useEventListener } from '@shared/events/UnifiedEventBus';
import { investigationApiService } from '../../../shared/services/InvestigationApiService';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
  timestamp: Date;
}

export interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const handleDismiss = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300);
  }, [notification.id, onDismiss]);

  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!notification.persistent && notification.duration !== 0) {
      const duration = notification.duration || 5000;
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [notification.duration, notification.persistent, handleDismiss]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-corporate-success" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />;
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-corporate-error" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-blue-400" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-900/30 border-green-500 shadow-lg shadow-green-500/20';
      case 'warning':
        return 'bg-amber-900/20 border-amber-500 shadow-lg shadow-amber-500/20';
      case 'error':
        return 'bg-red-900/30 border-red-500 shadow-lg shadow-red-500/20';
      default:
        return 'bg-cyan-900/30 border-cyan-500 shadow-lg shadow-cyan-500/20';
    }
  };

  const getTextColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-200';
      case 'warning':
        return 'text-amber-200';
      case 'error':
        return 'text-red-200';
      default:
        return 'text-cyan-200';
    }
  };

  const getIconColor = () => {
    switch (notification.type) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-amber-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-cyan-400';
    }
  };

  return (
    <div
      className={`
        relative flex items-start p-4 mb-3 border rounded-lg shadow-sm transition-all duration-300 ease-in-out
        ${getBackgroundColor()}
        ${isVisible && !isLeaving ? 'transform translate-x-0 opacity-100' : 'transform translate-x-full opacity-0'}
        ${isLeaving ? 'transform translate-x-full opacity-0' : ''}
      `}
      role="alert"
    >
      <div className="flex-shrink-0 mr-3 mt-0.5">
        {getIcon()}
      </div>

      <div className="flex-1 min-w-0">
        {notification.title && (
          <h4 className={`text-sm font-medium ${getTextColor()} mb-1`}>
            {notification.title}
          </h4>
        )}
        <p className={`text-sm ${getTextColor()}`}>
          {notification.message}
        </p>

        {notification.actions && notification.actions.length > 0 && (
          <div className="mt-3 flex space-x-2">
            {notification.actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`
                  text-xs font-medium px-3 py-1 rounded transition-colors duration-150
                  ${action.variant === 'primary'
                    ? `${notification.type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white`
                    : `${getTextColor()} hover:bg-opacity-20 hover:bg-gray-500`
                  }
                `}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        <div className="mt-2 text-xs text-gray-500">
          {notification.timestamp.toLocaleTimeString()}
        </div>
      </div>

      <div className="flex-shrink-0 ml-3">
        <button
          onClick={handleDismiss}
          className={`
            inline-flex rounded-md p-1.5 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2
            ${notification.type === 'error' ? 'text-corporate-error hover:bg-red-100 focus:ring-red-500' :
              notification.type === 'warning' ? 'text-yellow-400 hover:bg-yellow-100 focus:ring-yellow-500' :
              notification.type === 'success' ? 'text-corporate-success hover:bg-green-100 focus:ring-green-500' :
              'text-blue-400 hover:bg-blue-100 focus:ring-blue-500'
            }
          `}
          aria-label="Dismiss notification"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

interface NotificationSystemProps {
  maxNotifications?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  maxNotifications = 5,
  position = 'top-right'
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Debug: Log when component mounts
  React.useEffect(() => {
    // Component mounted and ready
    return () => {
      // Component unmounting
    };
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      return updated.slice(0, maxNotifications);
    });
  }, [maxNotifications]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Listen for UI notification events
  useEventListener('ui:notification:show', (event) => {
    // Received notification event
    if (event.notification) {
      // Adding notification
      addNotification(event.notification);
    } else {
      // Event received but no notification data
    }
  });

  // Listen for investigation events
  useEventListener('investigation:created', (event) => {
    addNotification({
      type: 'success',
      title: 'Investigation Created',
      message: `${event.type} investigation started`,
      actions: [
        {
          label: 'View',
          onClick: async () => {
            window.location.href = `/${event.type}/${event.id}`;
          },
          variant: 'primary'
        }
      ]
    });
  });

  useEventListener('investigation:completed', (event) => {
    addNotification({
      type: 'success',
      title: 'Investigation Completed',
      message: 'Investigation analysis finished successfully',
      actions: [
        {
          label: 'View Results',
          onClick: async () => {
            window.location.href = `/investigation/${event.id}`;
          },
          variant: 'primary'
        }
      ]
    });
  });

  useEventListener('investigation:error', (event) => {
    addNotification({
      type: 'error',
      title: 'Investigation Error',
      message: event.error,
      persistent: true,
      actions: [
        {
          label: 'Retry',
          onClick: async () => {
            await investigationApiService.retryInvestigation({ investigationId: event.id });
          },
          variant: 'primary'
        }
      ]
    });
  });

  // Listen for agent events
  useEventListener('agent:completed', (event) => {
    addNotification({
      type: 'info',
      title: 'Agent Analysis Complete',
      message: `Agent ${event.agentId} finished analysis`,
    });
  });

  useEventListener('agent:error', (event) => {
    addNotification({
      type: 'error',
      title: 'Agent Error',
      message: `Agent ${event.agentId}: ${event.error}`,
    });
  });

  // Listen for report events
  useEventListener('report:generation-completed', (event) => {
    addNotification({
      type: 'success',
      title: 'Report Ready',
      message: 'Your report has been generated successfully',
      actions: [
        {
          label: 'Download',
          onClick: async () => {
            window.open(event.downloadUrl, '_blank');
          },
          variant: 'primary'
        }
      ]
    });
  });

  useEventListener('report:generation-error', (event) => {
    addNotification({
      type: 'error',
      title: 'Report Generation Failed',
      message: event.error,
      persistent: true,
    });
  });

  // Listen for WebSocket connection events
  useEventListener('system:websocket-connected', () => {
    addNotification({
      type: 'success',
      message: 'Real-time connection established',
      duration: 3000,
    });
  });

  useEventListener('system:websocket-disconnected', (event) => {
    addNotification({
      type: 'warning',
      title: 'Connection Lost',
      message: event.reason || 'Real-time connection lost',
      persistent: true,
    });
  });

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed z-50 w-96 max-w-sm space-y-2 ${getPositionClasses()}`}
      role="region"
      aria-label="Notifications"
    >
      {notifications.length > 1 && (
        <div className="flex justify-end mb-2">
          <button
            onClick={clearAllNotifications}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear all ({notifications.length})
          </button>
        </div>
      )}

      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={dismissNotification}
        />
      ))}
    </div>
  );
};