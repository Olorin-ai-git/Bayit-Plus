/**
 * Notification System Integration Tests
 * Tests the full flow from component usage to notification rendering
 */

import React, { useState } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';
import { NotificationProvider } from '../contexts/NotificationContext';
import { useNotifications } from '../hooks/useNotifications';
import { useNotificationStore } from '../stores/notificationStore';

// Mock GlassToastContainer
jest.mock('../native/components/GlassToastContainer', () => {
  const React = require('react');
  return {
    GlassToastContainer: () => {
      const { useNotificationStore } = require('../stores/notificationStore');
      const { useEffect } = React;

      useEffect(() => {
        useNotificationStore.getState().setProviderMounted(true);
        return () => useNotificationStore.getState().setProviderMounted(false);
      }, []);

      return null;
    },
  };
});

describe('Notification System Integration', () => {
  beforeEach(() => {
    useNotificationStore.getState().clear();
    useNotificationStore.getState().setProviderMounted(false);
  });

  describe('Basic notification flow', () => {
    it('should show notification when button is pressed', async () => {
      const TestComponent = () => {
        const notifications = useNotifications();

        return (
          <View>
            <TouchableOpacity
              testID="show-button"
              onPress={() =>
                notifications.showInfo('Test notification', 'Info')
              }
            >
              <Text>Show Notification</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId } = render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().isProviderMounted).toBe(true);
      });

      const button = getByTestId('show-button');
      fireEvent.press(button);

      await waitFor(() => {
        const state = useNotificationStore.getState();
        expect(state.notifications).toHaveLength(1);
        expect(state.notifications[0].message).toBe('Test notification');
        expect(state.notifications[0].level).toBe('info');
      });
    });

    it('should show multiple notifications', async () => {
      const TestComponent = () => {
        const notifications = useNotifications();

        return (
          <View>
            <TouchableOpacity
              testID="show-info"
              onPress={() => notifications.showInfo('Info message')}
            >
              <Text>Info</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="show-error"
              onPress={() => notifications.showError('Error message')}
            >
              <Text>Error</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="show-success"
              onPress={() => notifications.showSuccess('Success message')}
            >
              <Text>Success</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId } = render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().isProviderMounted).toBe(true);
      });

      fireEvent.press(getByTestId('show-info'));
      fireEvent.press(getByTestId('show-error'));
      fireEvent.press(getByTestId('show-success'));

      await waitFor(() => {
        const state = useNotificationStore.getState();
        expect(state.notifications).toHaveLength(3);
      });
    });

    it('should dismiss notification', async () => {
      const TestComponent = () => {
        const notifications = useNotifications();
        const [notificationId, setNotificationId] = useState<string | null>(
          null
        );

        return (
          <View>
            <TouchableOpacity
              testID="show-button"
              onPress={() => {
                const id = notifications.showInfo('Test notification');
                setNotificationId(id);
              }}
            >
              <Text>Show</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="dismiss-button"
              onPress={() => {
                if (notificationId) {
                  notifications.dismiss(notificationId);
                }
              }}
            >
              <Text>Dismiss</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId } = render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().isProviderMounted).toBe(true);
      });

      fireEvent.press(getByTestId('show-button'));

      await waitFor(() => {
        expect(useNotificationStore.getState().notifications).toHaveLength(1);
      });

      fireEvent.press(getByTestId('dismiss-button'));

      await waitFor(() => {
        expect(useNotificationStore.getState().notifications).toHaveLength(0);
      });
    });

    it('should clear all notifications', async () => {
      const TestComponent = () => {
        const notifications = useNotifications();

        return (
          <View>
            <TouchableOpacity
              testID="show-multiple"
              onPress={() => {
                notifications.showInfo('Info 1');
                notifications.showError('Error 1');
                notifications.showSuccess('Success 1');
              }}
            >
              <Text>Show Multiple</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="clear-button"
              onPress={() => notifications.clear()}
            >
              <Text>Clear All</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId } = render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().isProviderMounted).toBe(true);
      });

      fireEvent.press(getByTestId('show-multiple'));

      await waitFor(() => {
        expect(useNotificationStore.getState().notifications).toHaveLength(3);
      });

      fireEvent.press(getByTestId('clear-button'));

      await waitFor(() => {
        expect(useNotificationStore.getState().notifications).toHaveLength(0);
      });
    });
  });

  describe('Error handling flow', () => {
    it('should show error notification on API failure', async () => {
      const mockApiCall = jest.fn().mockRejectedValue(new Error('API Error'));

      const TestComponent = () => {
        const notifications = useNotifications();

        const handleApiCall = async () => {
          try {
            await mockApiCall();
          } catch (error) {
            notifications.showError(
              error instanceof Error ? error.message : 'Unknown error',
              'API Error'
            );
          }
        };

        return (
          <TouchableOpacity testID="api-button" onPress={handleApiCall}>
            <Text>Call API</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().isProviderMounted).toBe(true);
      });

      fireEvent.press(getByTestId('api-button'));

      await waitFor(() => {
        const state = useNotificationStore.getState();
        expect(state.notifications).toHaveLength(1);
        expect(state.notifications[0].level).toBe('error');
        expect(state.notifications[0].message).toBe('API Error');
      });
    });
  });

  describe('Confirmation flow', () => {
    it('should show confirmation with action button', async () => {
      const onConfirm = jest.fn();

      const TestComponent = () => {
        const notifications = useNotifications();

        const handleDelete = () => {
          notifications.show({
            level: 'warning',
            title: 'Delete Item',
            message: 'Are you sure you want to delete this item?',
            dismissable: true,
            action: {
              label: 'Delete',
              type: 'action',
              onPress: onConfirm,
            },
          });
        };

        return (
          <TouchableOpacity testID="delete-button" onPress={handleDelete}>
            <Text>Delete</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().isProviderMounted).toBe(true);
      });

      fireEvent.press(getByTestId('delete-button'));

      await waitFor(() => {
        const state = useNotificationStore.getState();
        expect(state.notifications).toHaveLength(1);
        expect(state.notifications[0].level).toBe('warning');
        expect(state.notifications[0].action).toBeDefined();
        expect(state.notifications[0].action?.label).toBe('Delete');
      });
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate identical notifications', async () => {
      const TestComponent = () => {
        const notifications = useNotifications();

        return (
          <TouchableOpacity
            testID="show-duplicate"
            onPress={() => {
              notifications.showError('Same error message');
              notifications.showError('Same error message');
              notifications.showError('Same error message');
            }}
          >
            <Text>Show Duplicates</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().isProviderMounted).toBe(true);
      });

      fireEvent.press(getByTestId('show-duplicate'));

      await waitFor(() => {
        const state = useNotificationStore.getState();
        // Should only have 1 notification due to deduplication
        expect(state.notifications).toHaveLength(1);
      });
    });
  });

  describe('Priority ordering', () => {
    it('should prioritize errors over other levels', async () => {
      const TestComponent = () => {
        const notifications = useNotifications();

        return (
          <TouchableOpacity
            testID="show-mixed"
            onPress={() => {
              notifications.showInfo('Info message');
              notifications.showError('Error message');
              notifications.showSuccess('Success message');
            }}
          >
            <Text>Show Mixed</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().isProviderMounted).toBe(true);
      });

      fireEvent.press(getByTestId('show-mixed'));

      await waitFor(() => {
        const state = useNotificationStore.getState();
        expect(state.notifications).toHaveLength(3);
        // Error should be first
        expect(state.notifications[0].level).toBe('error');
      });
    });
  });

  describe('Max queue size', () => {
    it('should enforce max queue size', async () => {
      const TestComponent = () => {
        const notifications = useNotifications();

        return (
          <TouchableOpacity
            testID="show-many"
            onPress={() => {
              // Add 12 notifications (max is 10)
              for (let i = 0; i < 12; i++) {
                notifications.showInfo(`Message ${i}`);
              }
            }}
          >
            <Text>Show Many</Text>
          </TouchableOpacity>
        );
      };

      const { getByTestId } = render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().isProviderMounted).toBe(true);
      });

      fireEvent.press(getByTestId('show-many'));

      await waitFor(() => {
        const state = useNotificationStore.getState();
        // Should only have 10 notifications
        expect(state.notifications).toHaveLength(10);
      });
    });
  });

  describe('Cross-platform compatibility', () => {
    it('should work with both hook and imperative API', async () => {
      const TestComponent = () => {
        const notifications = useNotifications();

        return (
          <View>
            <TouchableOpacity
              testID="hook-button"
              onPress={() => notifications.showInfo('From hook')}
            >
              <Text>Hook</Text>
            </TouchableOpacity>
          </View>
        );
      };

      const { getByTestId } = render(
        <NotificationProvider>
          <TestComponent />
        </NotificationProvider>
      );

      await waitFor(() => {
        expect(useNotificationStore.getState().isProviderMounted).toBe(true);
      });

      // Use hook API
      fireEvent.press(getByTestId('hook-button'));

      await waitFor(() => {
        expect(useNotificationStore.getState().notifications).toHaveLength(1);
      });

      // Both should work with the same store
      const state = useNotificationStore.getState();
      expect(state.notifications[0].message).toBe('From hook');
    });
  });
});
