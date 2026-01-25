/**
 * useNotifications Hook Tests
 */

import { renderHook, act } from '@testing-library/react-native';
import { useNotifications, Notifications } from '../hooks/useNotifications';
import { useNotificationStore } from '../stores/notificationStore';

describe('useNotifications', () => {
  beforeEach(() => {
    // Clear store before each test
    const { result } = renderHook(() => useNotificationStore());
    act(() => {
      result.current.clear();
      result.current.setProviderMounted(true);
    });
  });

  describe('show method', () => {
    it('should show notification with custom options', () => {
      const { result } = renderHook(() => useNotifications());
      const storeResult = renderHook(() => useNotificationStore());

      act(() => {
        result.current.show({
          level: 'info',
          message: 'Custom notification',
          title: 'Custom',
          duration: 5000,
        });
      });

      expect(storeResult.result.current.notifications).toHaveLength(1);
      expect(storeResult.result.current.notifications[0].message).toBe(
        'Custom notification'
      );
      expect(storeResult.result.current.notifications[0].level).toBe('info');
      expect(storeResult.result.current.notifications[0].duration).toBe(5000);
    });
  });

  describe('convenience methods', () => {
    it('should show debug notification', () => {
      const { result } = renderHook(() => useNotifications());
      const storeResult = renderHook(() => useNotificationStore());

      act(() => {
        result.current.showDebug('Debug message', 'Debug Title');
      });

      expect(storeResult.result.current.notifications).toHaveLength(1);
      expect(storeResult.result.current.notifications[0].level).toBe('debug');
      expect(storeResult.result.current.notifications[0].message).toBe(
        'Debug message'
      );
    });

    it('should show info notification', () => {
      const { result } = renderHook(() => useNotifications());
      const storeResult = renderHook(() => useNotificationStore());

      act(() => {
        result.current.showInfo('Info message', 'Info Title');
      });

      expect(storeResult.result.current.notifications).toHaveLength(1);
      expect(storeResult.result.current.notifications[0].level).toBe('info');
    });

    it('should show warning notification', () => {
      const { result } = renderHook(() => useNotifications());
      const storeResult = renderHook(() => useNotificationStore());

      act(() => {
        result.current.showWarning('Warning message', 'Warning Title');
      });

      expect(storeResult.result.current.notifications).toHaveLength(1);
      expect(storeResult.result.current.notifications[0].level).toBe('warning');
    });

    it('should show success notification', () => {
      const { result } = renderHook(() => useNotifications());
      const storeResult = renderHook(() => useNotificationStore());

      act(() => {
        result.current.showSuccess('Success message', 'Success Title');
      });

      expect(storeResult.result.current.notifications).toHaveLength(1);
      expect(storeResult.result.current.notifications[0].level).toBe('success');
    });

    it('should show error notification', () => {
      const { result } = renderHook(() => useNotifications());
      const storeResult = renderHook(() => useNotificationStore());

      act(() => {
        result.current.showError('Error message', 'Error Title');
      });

      expect(storeResult.result.current.notifications).toHaveLength(1);
      expect(storeResult.result.current.notifications[0].level).toBe('error');
    });
  });

  describe('title parameter', () => {
    it('should work with title', () => {
      const { result } = renderHook(() => useNotifications());
      const storeResult = renderHook(() => useNotificationStore());

      act(() => {
        result.current.showError('Error message', 'Error Title');
      });

      expect(storeResult.result.current.notifications[0].title).toBe(
        'Error Title'
      );
    });

    it('should work without title', () => {
      const { result } = renderHook(() => useNotifications());
      const storeResult = renderHook(() => useNotificationStore());

      act(() => {
        result.current.showError('Error message');
      });

      expect(storeResult.result.current.notifications[0].title).toBeUndefined();
    });
  });

  describe('dismiss method', () => {
    it('should dismiss notification by id', () => {
      const { result } = renderHook(() => useNotifications());
      const storeResult = renderHook(() => useNotificationStore());

      let id: string;
      act(() => {
        id = result.current.showInfo('Test message');
      });

      expect(storeResult.result.current.notifications).toHaveLength(1);

      act(() => {
        result.current.dismiss(id);
      });

      expect(storeResult.result.current.notifications).toHaveLength(0);
    });
  });

  describe('clear method', () => {
    it('should clear all notifications', () => {
      const { result } = renderHook(() => useNotifications());
      const storeResult = renderHook(() => useNotificationStore());

      act(() => {
        result.current.showInfo('Info 1');
        result.current.showError('Error 1');
        result.current.showSuccess('Success 1');
      });

      expect(storeResult.result.current.notifications).toHaveLength(3);

      act(() => {
        result.current.clear();
      });

      expect(storeResult.result.current.notifications).toHaveLength(0);
    });
  });

  describe('clearByLevel method', () => {
    it('should clear notifications by level', () => {
      const { result } = renderHook(() => useNotifications());
      const storeResult = renderHook(() => useNotificationStore());

      act(() => {
        result.current.showInfo('Info 1');
        result.current.showError('Error 1');
        result.current.showError('Error 2');
      });

      expect(storeResult.result.current.notifications).toHaveLength(3);

      act(() => {
        result.current.clearByLevel('error');
      });

      expect(storeResult.result.current.notifications).toHaveLength(1);
      expect(storeResult.result.current.notifications[0].level).toBe('info');
    });
  });

  describe('notifications state access', () => {
    it('should provide access to notifications array', () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.showInfo('Info 1');
        result.current.showError('Error 1');
      });

      expect(result.current.notifications).toHaveLength(2);
    });
  });
});

describe('Notifications (imperative API)', () => {
  beforeEach(() => {
    // Clear store before each test
    act(() => {
      useNotificationStore.getState().clear();
      useNotificationStore.getState().setProviderMounted(true);
    });
  });

  describe('convenience methods', () => {
    it('should show debug notification', () => {
      act(() => {
        Notifications.showDebug('Debug message', 'Debug Title');
      });

      const notifications = useNotificationStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].level).toBe('debug');
      expect(notifications[0].message).toBe('Debug message');
    });

    it('should show info notification', () => {
      act(() => {
        Notifications.showInfo('Info message');
      });

      const notifications = useNotificationStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].level).toBe('info');
    });

    it('should show warning notification', () => {
      act(() => {
        Notifications.showWarning('Warning message');
      });

      const notifications = useNotificationStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].level).toBe('warning');
    });

    it('should show success notification', () => {
      act(() => {
        Notifications.showSuccess('Success message');
      });

      const notifications = useNotificationStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].level).toBe('success');
    });

    it('should show error notification', () => {
      act(() => {
        Notifications.showError('Error message');
      });

      const notifications = useNotificationStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].level).toBe('error');
    });
  });

  describe('dismiss method', () => {
    it('should dismiss notification by id', () => {
      let id: string;
      act(() => {
        id = Notifications.showInfo('Test message');
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(1);

      act(() => {
        Notifications.dismiss(id);
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });
  });

  describe('clear method', () => {
    it('should clear all notifications', () => {
      act(() => {
        Notifications.showInfo('Info 1');
        Notifications.showError('Error 1');
        Notifications.showSuccess('Success 1');
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(3);

      act(() => {
        Notifications.clear();
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });
  });

  describe('clearByLevel method', () => {
    it('should clear notifications by level', () => {
      act(() => {
        Notifications.showInfo('Info 1');
        Notifications.showError('Error 1');
        Notifications.showError('Error 2');
      });

      expect(useNotificationStore.getState().notifications).toHaveLength(3);

      act(() => {
        Notifications.clearByLevel('error');
      });

      const notifications = useNotificationStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].level).toBe('info');
    });
  });

  describe('use outside React components', () => {
    it('should work in non-React context (error handler simulation)', () => {
      // Simulate using in error handler or API interceptor
      const handleError = (error: Error) => {
        Notifications.showError(error.message, 'Error');
      };

      act(() => {
        handleError(new Error('API call failed'));
      });

      const notifications = useNotificationStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe('API call failed');
      expect(notifications[0].level).toBe('error');
    });
  });
});
