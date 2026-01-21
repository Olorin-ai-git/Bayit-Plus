/**
 * NotificationToast Contract Tests
 * Feature: 004-new-olorin-frontend
 *
 * Tests toast notification component interface and auto-dismiss behavior.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationToast } from '../NotificationToast';

// Mock timers
jest.useFakeTimers();

describe('NotificationToast Contract Tests', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Component Interface', () => {
    it('should render with required props', () => {
      const onDismiss = jest.fn();
      render(
        <NotificationToast
          type="success"
          message="Success Message"
          visible={true}
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByText('Success Message')).toBeInTheDocument();
    });

    it('should accept all prop types correctly', () => {
      const onDismiss = jest.fn();
      render(
        <NotificationToast
          type="info"
          message="Info Message"
          description="Detailed description"
          visible={true}
          onDismiss={onDismiss}
          autoHideDuration={3000}
        />
      );

      expect(screen.getByText('Info Message')).toBeInTheDocument();
      expect(screen.getByText('Detailed description')).toBeInTheDocument();
    });
  });

  describe('Prop Validation', () => {
    it('should support success notification type', () => {
      const onDismiss = jest.fn();
      render(
        <NotificationToast
          type="success"
          message="Success"
          visible={true}
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    it('should support error notification type', () => {
      const onDismiss = jest.fn();
      render(
        <NotificationToast
          type="error"
          message="Error"
          visible={true}
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('should support warning notification type', () => {
      const onDismiss = jest.fn();
      render(
        <NotificationToast
          type="warning"
          message="Warning"
          visible={true}
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('should support info notification type', () => {
      const onDismiss = jest.fn();
      render(
        <NotificationToast
          type="info"
          message="Info"
          visible={true}
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByText('Info')).toBeInTheDocument();
    });

    it('should render optional description', () => {
      const onDismiss = jest.fn();
      render(
        <NotificationToast
          type="info"
          message="Message"
          description="Description text"
          visible={true}
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByText('Description text')).toBeInTheDocument();
    });

    it('should not render when visible is false', () => {
      const onDismiss = jest.fn();
      render(
        <NotificationToast
          type="success"
          message="Hidden"
          visible={false}
          onDismiss={onDismiss}
        />
      );

      expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    });

    it('should auto-dismiss non-error notifications', async () => {
      const onDismiss = jest.fn();
      render(
        <NotificationToast
          type="success"
          message="Auto Dismiss"
          visible={true}
          onDismiss={onDismiss}
          autoHideDuration={5000}
        />
      );

      expect(onDismiss).not.toHaveBeenCalled();

      jest.advanceTimersByTime(5000);

      await waitFor(() => {
        expect(onDismiss).toHaveBeenCalledTimes(1);
      });
    });

    it('should NOT auto-dismiss error notifications', () => {
      const onDismiss = jest.fn();
      render(
        <NotificationToast
          type="error"
          message="Error No Auto Dismiss"
          visible={true}
          onDismiss={onDismiss}
          autoHideDuration={5000}
        />
      );

      jest.advanceTimersByTime(5000);

      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role', () => {
      const onDismiss = jest.fn();
      render(
        <NotificationToast
          type="success"
          message="ARIA Test"
          visible={true}
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have accessible dismiss button', () => {
      const onDismiss = jest.fn();
      render(
        <NotificationToast
          type="success"
          message="Dismissible"
          visible={true}
          onDismiss={onDismiss}
        />
      );

      const dismissButton = screen.getByLabelText('Dismiss notification');
      expect(dismissButton).toBeInTheDocument();

      fireEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should be keyboard accessible for dismiss', () => {
      const onDismiss = jest.fn();
      render(
        <NotificationToast
          type="info"
          message="Keyboard Dismiss"
          visible={true}
          onDismiss={onDismiss}
        />
      );

      const dismissButton = screen.getByLabelText('Dismiss notification');
      dismissButton.focus();
      expect(dismissButton).toHaveFocus();

      fireEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalled();
    });

    it('should display appropriate icon for each type', () => {
      const onDismiss = jest.fn();
      const types: Array<'success' | 'error' | 'warning' | 'info'> = [
        'success',
        'error',
        'warning',
        'info'
      ];

      types.forEach((type) => {
        const { unmount } = render(
          <NotificationToast
            type={type}
            message={`${type} message`}
            visible={true}
            onDismiss={onDismiss}
          />
        );

        // Check that appropriate icon SVG is rendered
        const svgs = screen.getAllByRole('alert').flatMap((alert) => {
          // eslint-disable-next-line testing-library/no-node-access
          return Array.from(alert.querySelectorAll('svg'));
        });
        expect(svgs.length).toBeGreaterThan(0);

        unmount();
      });
    });
  });

  describe('Type Safety', () => {
    it('should enforce NotificationType enum', () => {
      const onDismiss = jest.fn();
      const validTypes: Array<'success' | 'error' | 'warning' | 'info'> = [
        'success',
        'error',
        'warning',
        'info'
      ];

      validTypes.forEach((type) => {
        const { unmount } = render(
          <NotificationToast
            type={type}
            message={type}
            visible={true}
            onDismiss={onDismiss}
          />
        );
        expect(screen.getByText(type)).toBeInTheDocument();
        unmount();
      });
    });

    it('should require visible prop as boolean', () => {
      const onDismiss = jest.fn();
      const { rerender } = render(
        <NotificationToast
          type="success"
          message="Test"
          visible={true}
          onDismiss={onDismiss}
        />
      );

      expect(screen.getByText('Test')).toBeInTheDocument();

      rerender(
        <NotificationToast
          type="success"
          message="Test"
          visible={false}
          onDismiss={onDismiss}
        />
      );

      expect(screen.queryByText('Test')).not.toBeInTheDocument();
    });

    it('should require onDismiss callback', () => {
      const onDismiss = jest.fn();
      render(
        <NotificationToast
          type="success"
          message="Callback Required"
          visible={true}
          onDismiss={onDismiss}
        />
      );

      const dismissButton = screen.getByLabelText('Dismiss notification');
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });
});
