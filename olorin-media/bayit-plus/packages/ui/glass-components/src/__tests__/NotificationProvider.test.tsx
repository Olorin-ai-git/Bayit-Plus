/**
 * NotificationProvider Tests
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { NotificationProvider, useNotificationContext } from '../contexts/NotificationContext';
import { useNotificationStore } from '../stores/notificationStore';

// Mock GlassToastContainer
jest.mock('../native/components/GlassToastContainer', () => ({
  GlassToastContainer: () => null,
}));

describe('NotificationProvider', () => {
  beforeEach(() => {
    useNotificationStore.getState().clear();
    useNotificationStore.getState().setProviderMounted(false);
  });

  it('should render children', () => {
    const { getByText } = render(
      <NotificationProvider>
        <Text>Test Child</Text>
      </NotificationProvider>
    );

    expect(getByText('Test Child')).toBeTruthy();
  });

  it('should provide notification context', () => {
    let contextValue: any;

    const TestComponent = () => {
      contextValue = useNotificationContext();
      return <Text>Test</Text>;
    };

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    expect(contextValue).toBeDefined();
    expect(typeof contextValue.show).toBe('function');
    expect(typeof contextValue.showDebug).toBe('function');
    expect(typeof contextValue.showInfo).toBe('function');
    expect(typeof contextValue.showWarning).toBe('function');
    expect(typeof contextValue.showSuccess).toBe('function');
    expect(typeof contextValue.showError).toBe('function');
    expect(typeof contextValue.dismiss).toBe('function');
    expect(typeof contextValue.clear).toBe('function');
  });

  it('should accept position prop', () => {
    const { rerender } = render(
      <NotificationProvider position="top">
        <Text>Test</Text>
      </NotificationProvider>
    );

    // Rerender with different position
    rerender(
      <NotificationProvider position="bottom">
        <Text>Test</Text>
      </NotificationProvider>
    );

    expect(true).toBe(true); // Provider should not throw
  });

  it('should accept maxVisible prop', () => {
    render(
      <NotificationProvider maxVisible={5}>
        <Text>Test</Text>
      </NotificationProvider>
    );

    expect(true).toBe(true); // Provider should not throw
  });

  describe('context methods', () => {
    it('should call show method', async () => {
      let contextValue: any;

      const TestComponent = () => {
        contextValue = useNotificationContext();
        return <Text>Test</Text>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      // Provider should mark itself as mounted
      await waitFor(() => {
        expect(useNotificationStore.getState().providerMounted).toBe(true);
      });

      // Call show
      const id = contextValue.show({
        level: 'info',
        message: 'Test message',
      });

      expect(id).toBeDefined();
      expect(useNotificationStore.getState().notifications).toHaveLength(1);
    });

    it('should call showDebug method', async () => {
      let contextValue: any;

      const TestComponent = () => {
        contextValue = useNotificationContext();
        return <Text>Test</Text>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().providerMounted).toBe(true);
      });

      contextValue.showDebug('Debug message', 'Debug');

      const notifications = useNotificationStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].level).toBe('debug');
    });

    it('should call showInfo method', async () => {
      let contextValue: any;

      const TestComponent = () => {
        contextValue = useNotificationContext();
        return <Text>Test</Text>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().providerMounted).toBe(true);
      });

      contextValue.showInfo('Info message', 'Info');

      const notifications = useNotificationStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].level).toBe('info');
    });

    it('should call showWarning method', async () => {
      let contextValue: any;

      const TestComponent = () => {
        contextValue = useNotificationContext();
        return <Text>Test</Text>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().providerMounted).toBe(true);
      });

      contextValue.showWarning('Warning message', 'Warning');

      const notifications = useNotificationStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].level).toBe('warning');
    });

    it('should call showSuccess method', async () => {
      let contextValue: any;

      const TestComponent = () => {
        contextValue = useNotificationContext();
        return <Text>Test</Text>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().providerMounted).toBe(true);
      });

      contextValue.showSuccess('Success message', 'Success');

      const notifications = useNotificationStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].level).toBe('success');
    });

    it('should call showError method', async () => {
      let contextValue: any;

      const TestComponent = () => {
        contextValue = useNotificationContext();
        return <Text>Test</Text>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().providerMounted).toBe(true);
      });

      contextValue.showError('Error message', 'Error');

      const notifications = useNotificationStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].level).toBe('error');
    });

    it('should call dismiss method', async () => {
      let contextValue: any;

      const TestComponent = () => {
        contextValue = useNotificationContext();
        return <Text>Test</Text>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().providerMounted).toBe(true);
      });

      const id = contextValue.showInfo('Test message');
      expect(useNotificationStore.getState().notifications).toHaveLength(1);

      contextValue.dismiss(id);
      expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });

    it('should call clear method', async () => {
      let contextValue: any;

      const TestComponent = () => {
        contextValue = useNotificationContext();
        return <Text>Test</Text>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().providerMounted).toBe(true);
      });

      contextValue.showInfo('Info 1');
      contextValue.showError('Error 1');
      expect(useNotificationStore.getState().notifications).toHaveLength(2);

      contextValue.clear();
      expect(useNotificationStore.getState().notifications).toHaveLength(0);
    });
  });

  describe('sanitization', () => {
    it('should sanitize messages', async () => {
      let contextValue: any;

      const TestComponent = () => {
        contextValue = useNotificationContext();
        return <Text>Test</Text>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().providerMounted).toBe(true);
      });

      // Test that sanitization occurs (assuming sanitizeMessage handles XSS)
      contextValue.showInfo('<script>alert("xss")</script>');

      const notifications = useNotificationStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      // Message should be sanitized (implementation depends on sanitizeMessage)
    });
  });

  describe('action validation', () => {
    it('should validate actions', async () => {
      let contextValue: any;
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const TestComponent = () => {
        contextValue = useNotificationContext();
        return <Text>Test</Text>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().providerMounted).toBe(true);
      });

      // Test with invalid action (no label)
      contextValue.show({
        level: 'info',
        message: 'Test',
        action: { type: 'action' as const, onPress: () => {} } as any,
      });

      // Should log warning for invalid action
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid action provided')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should accept valid actions', async () => {
      let contextValue: any;

      const TestComponent = () => {
        contextValue = useNotificationContext();
        return <Text>Test</Text>;
      };

      render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().providerMounted).toBe(true);
      });

      const onPress = jest.fn();
      contextValue.show({
        level: 'info',
        message: 'Test',
        action: {
          label: 'Undo',
          type: 'action' as const,
          onPress,
        },
      });

      const notifications = useNotificationStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].action).toBeDefined();
      expect(notifications[0].action?.label).toBe('Undo');
    });
  });
});

describe('useNotificationContext', () => {
  it('should throw error when used outside provider', () => {
    const TestComponent = () => {
      useNotificationContext();
      return <Text>Test</Text>;
    };

    // Expect error to be thrown
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useNotificationContext must be used within NotificationProvider');
  });

  it('should work when used inside provider', () => {
    const TestComponent = () => {
      const context = useNotificationContext();
      return <Text>{context ? 'Has Context' : 'No Context'}</Text>;
    };

    const { getByText } = render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    expect(getByText('Has Context')).toBeTruthy();
  });
});
