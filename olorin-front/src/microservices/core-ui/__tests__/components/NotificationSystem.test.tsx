import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationSystem } from '../../components/NotificationSystem';

// Mock EventBus
const mockEventBus = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn(),
};

jest.mock('../../../shared/services/EventBus', () => ({
  useEventListener: jest.fn((eventType, handler) => {
    // Simulate event listener setup
    if (eventType === 'system:notification') {
      // Store handler for manual triggering
      (window as any).mockNotificationHandler = handler;
    }
  }),
  useEventEmitter: () => ({
    emitNotification: jest.fn(),
  }),
}));

describe('NotificationSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when no notifications', () => {
    const { container } = render(<NotificationSystem />);
    expect(container.firstChild).toBeNull();
  });

  it('displays notification when event is triggered', async () => {
    render(<NotificationSystem />);

    // Trigger a system notification event
    const handler = (window as any).mockNotificationHandler;
    if (handler) {
      handler({
        type: 'success',
        message: 'Test notification',
        duration: 5000,
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Test notification')).toBeInTheDocument();
    });
  });

  it('auto-dismisses notification after duration', async () => {
    jest.useFakeTimers();
    render(<NotificationSystem />);

    // Trigger notification
    const handler = (window as any).mockNotificationHandler;
    if (handler) {
      handler({
        type: 'info',
        message: 'Auto dismiss test',
        duration: 1000,
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Auto dismiss test')).toBeInTheDocument();
    });

    // Fast-forward time
    jest.advanceTimersByTime(1300); // 1000ms + 300ms for animation

    await waitFor(() => {
      expect(screen.queryByText('Auto dismiss test')).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('allows manual dismissal', async () => {
    render(<NotificationSystem />);

    // Trigger notification
    const handler = (window as any).mockNotificationHandler;
    if (handler) {
      handler({
        type: 'warning',
        message: 'Manual dismiss test',
        persistent: true,
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Manual dismiss test')).toBeInTheDocument();
    });

    // Click dismiss button
    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('Manual dismiss test')).not.toBeInTheDocument();
    });
  });

  it('displays different notification types with correct styling', async () => {
    render(<NotificationSystem />);

    const handler = (window as any).mockNotificationHandler;
    if (handler) {
      handler({
        type: 'error',
        message: 'Error notification',
        persistent: true,
      });
    }

    await waitFor(() => {
      const notification = screen.getByRole('alert');
      expect(notification).toHaveClass('bg-red-50', 'border-red-200');
      expect(screen.getByText('Error notification')).toBeInTheDocument();
    });
  });

  it('displays notification with actions', async () => {
    render(<NotificationSystem />);

    const mockAction = jest.fn();
    const handler = (window as any).mockNotificationHandler;
    if (handler) {
      handler({
        type: 'info',
        message: 'Notification with action',
        actions: [
          {
            label: 'Test Action',
            onClick: mockAction,
            variant: 'primary'
          }
        ],
        persistent: true,
      });
    }

    await waitFor(() => {
      expect(screen.getByText('Notification with action')).toBeInTheDocument();
      expect(screen.getByText('Test Action')).toBeInTheDocument();
    });

    // Click action button
    fireEvent.click(screen.getByText('Test Action'));
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('respects maxNotifications limit', async () => {
    render(<NotificationSystem maxNotifications={2} />);

    const handler = (window as any).mockNotificationHandler;
    if (handler) {
      // Add 3 notifications
      handler({ type: 'info', message: 'Notification 1', persistent: true });
      handler({ type: 'info', message: 'Notification 2', persistent: true });
      handler({ type: 'info', message: 'Notification 3', persistent: true });
    }

    await waitFor(() => {
      expect(screen.getByText('Notification 2')).toBeInTheDocument();
      expect(screen.getByText('Notification 3')).toBeInTheDocument();
      expect(screen.queryByText('Notification 1')).not.toBeInTheDocument();
    });
  });

  it('shows clear all button when multiple notifications', async () => {
    render(<NotificationSystem />);

    const handler = (window as any).mockNotificationHandler;
    if (handler) {
      handler({ type: 'info', message: 'First notification', persistent: true });
      handler({ type: 'info', message: 'Second notification', persistent: true });
    }

    await waitFor(() => {
      expect(screen.getByText(/Clear all \(2\)/)).toBeInTheDocument();
    });

    // Click clear all
    fireEvent.click(screen.getByText(/Clear all \(2\)/));

    await waitFor(() => {
      expect(screen.queryByText('First notification')).not.toBeInTheDocument();
      expect(screen.queryByText('Second notification')).not.toBeInTheDocument();
    });
  });
});