/**
 * Mock for @olorin/glass-ui/hooks
 * Used in tests for notification system
 */

export const useNotifications = jest.fn(() => ({
  show: jest.fn(),
  showSuccess: jest.fn(),
  showError: jest.fn(),
  showWarning: jest.fn(),
  showInfo: jest.fn(),
  dismiss: jest.fn(),
  dismissAll: jest.fn(),
}))

export default {
  useNotifications,
}
