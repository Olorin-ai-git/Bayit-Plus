/**
 * Notification Store Tests
 */

import { renderHook, act } from '@testing-library/react-native';
import { useNotificationStore } from '../stores/notificationStore';

describe('notificationStore', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useNotificationStore());
    act(() => {
      result.current.clear();
      result.current.setProviderMounted(false);
    });
  });

  it('should add notification', () => {
    const { result } = renderHook(() => useNotificationStore());

    act(() => {
      result.current.setProviderMounted(true);
    });

    act(() => {
      result.current.add({
        level: 'info',
        message: 'Test message',
        title: 'Test',
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].message).toBe('Test message');
    expect(result.current.notifications[0].level).toBe('info');
  });

  it('should remove notification by id', () => {
    const { result } = renderHook(() => useNotificationStore());

    act(() => {
      result.current.setProviderMounted(true);
    });

    let id: string;
    act(() => {
      id = result.current.add({
        level: 'success',
        message: 'Success message',
      });
    });

    expect(result.current.notifications).toHaveLength(1);

    act(() => {
      result.current.remove(id);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should deduplicate notifications', () => {
    const { result } = renderHook(() => useNotificationStore());

    act(() => {
      result.current.setProviderMounted(true);
    });

    act(() => {
      result.current.add({
        level: 'error',
        message: 'Same error',
      });

      result.current.add({
        level: 'error',
        message: 'Same error',
      });
    });

    // Should only have 1 notification due to deduplication
    expect(result.current.notifications).toHaveLength(1);
  });

  it('should prioritize errors over info', () => {
    const { result } = renderHook(() => useNotificationStore());

    act(() => {
      result.current.setProviderMounted(true);
    });

    act(() => {
      result.current.add({ level: 'info', message: 'Info' });
      result.current.add({ level: 'error', message: 'Error' });
    });

    // Error should be first
    expect(result.current.notifications[0].level).toBe('error');
    expect(result.current.notifications[1].level).toBe('info');
  });

  it('should enforce max queue size', () => {
    const { result } = renderHook(() => useNotificationStore());

    act(() => {
      result.current.setProviderMounted(true);
    });

    act(() => {
      // Add 12 notifications (max is 10)
      for (let i = 0; i < 12; i++) {
        result.current.add({
          level: 'info',
          message: `Message ${i}`,
        });
      }
    });

    // Should only have 10 notifications
    expect(result.current.notifications).toHaveLength(10);
  });

  it('should defer notifications when provider not mounted', () => {
    const { result } = renderHook(() => useNotificationStore());

    // Provider not mounted
    act(() => {
      result.current.add({
        level: 'warning',
        message: 'Deferred warning',
      });
    });

    // Should be in deferred queue, not notifications
    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.deferredQueue).toHaveLength(1);

    // Mount provider
    act(() => {
      result.current.setProviderMounted(true);
    });

    // Should process deferred queue
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.deferredQueue).toHaveLength(0);
  });

  it('should clear all notifications', () => {
    const { result } = renderHook(() => useNotificationStore());

    act(() => {
      result.current.setProviderMounted(true);
      result.current.add({ level: 'info', message: 'Info 1' });
      result.current.add({ level: 'error', message: 'Error 1' });
    });

    expect(result.current.notifications).toHaveLength(2);

    act(() => {
      result.current.clear();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should clear notifications by level', () => {
    const { result } = renderHook(() => useNotificationStore());

    act(() => {
      result.current.setProviderMounted(true);
      result.current.add({ level: 'info', message: 'Info' });
      result.current.add({ level: 'error', message: 'Error' });
    });

    act(() => {
      result.current.clearByLevel('error');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].level).toBe('info');
  });

  it('should set default duration based on level', () => {
    const { result } = renderHook(() => useNotificationStore());

    act(() => {
      result.current.setProviderMounted(true);
    });

    act(() => {
      result.current.add({ level: 'error', message: 'Error' });
      result.current.add({ level: 'info', message: 'Info' });
    });

    // Error duration: 5000ms, Info duration: 3000ms
    expect(result.current.notifications[0].duration).toBe(5000);
    expect(result.current.notifications[1].duration).toBe(3000);
  });
});
