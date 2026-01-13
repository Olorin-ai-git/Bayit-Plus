/**
 * Shared glassmorphic button styles for admin pages
 * Ensures consistent styling across all admin interfaces
 */

import { StyleSheet } from 'react-native';

export const adminButtonStyles = StyleSheet.create({
  // Primary action button (Create, Add, etc.)
  primaryButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderWidth: 1,
  },

  // Secondary action button (Edit, View, etc.)
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
  },

  // Destructive action button (Delete, Remove, Cancel, etc.)
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
  },

  // Info/View button
  infoButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 1,
  },

  // Warning/Caution button
  warningButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderWidth: 1,
  },

  // Success/Confirm button
  successButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderWidth: 1,
  },

  // Cancel/Dismiss button
  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },

  // Selected state for buttons (radio/toggle style)
  selectedButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.4)',
    borderWidth: 1,
  },

  // Unselected state for buttons (radio/toggle style)
  unselectedButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },

  // Button text color
  buttonText: {
    color: '#FFFFFF',
  },

  // Disabled button text
  disabledButtonText: {
    color: 'rgba(255, 255, 255, 0.4)',
  },
});

/**
 * Get button style based on action type
 * @param actionType - Type of action: 'primary', 'secondary', 'danger', 'info', 'warning', 'success', 'cancel'
 * @returns Style object
 */
export const getButtonStyle = (actionType: 'primary' | 'secondary' | 'danger' | 'info' | 'warning' | 'success' | 'cancel') => {
  switch (actionType) {
    case 'primary':
      return adminButtonStyles.primaryButton;
    case 'secondary':
      return adminButtonStyles.secondaryButton;
    case 'danger':
      return adminButtonStyles.dangerButton;
    case 'info':
      return adminButtonStyles.infoButton;
    case 'warning':
      return adminButtonStyles.warningButton;
    case 'success':
      return adminButtonStyles.successButton;
    case 'cancel':
      return adminButtonStyles.cancelButton;
    default:
      return adminButtonStyles.secondaryButton;
  }
};

/**
 * Get toggle button style based on selected state
 * @param isSelected - Whether button is selected
 * @returns Style object
 */
export const getToggleButtonStyle = (isSelected: boolean) => {
  return isSelected ? adminButtonStyles.selectedButton : adminButtonStyles.unselectedButton;
};
