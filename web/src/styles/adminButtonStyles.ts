/**
 * Shared glassmorphic button styles for admin pages
 * Purple/Black theme with consistent glassmorphic styling
 */

import { StyleSheet } from 'react-native';
import { colors } from '@bayit/shared/theme';

export const adminButtonStyles = StyleSheet.create({
  // Primary action button (Create, Add, etc.) - Purple
  primaryButton: {
    backgroundColor: colors.glassPurpleLight,  // rgba(107, 33, 168, 0.3)
    borderColor: colors.glassBorderStrong,     // rgba(168, 85, 247, 0.4)
    borderWidth: 1,
  },

  // Secondary action button (Edit, View, etc.) - Glass
  secondaryButton: {
    backgroundColor: colors.glassLight,         // rgba(10, 10, 10, 0.5)
    borderColor: colors.glassBorder,           // rgba(168, 85, 247, 0.2)
    borderWidth: 1,
  },

  // Destructive action button (Delete, Remove, Cancel, etc.)
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
  },

  // Info/View button - Purple tint
  infoButton: {
    backgroundColor: colors.glassPurple,        // rgba(59, 7, 100, 0.4)
    borderColor: colors.glassBorder,           // rgba(168, 85, 247, 0.2)
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
    backgroundColor: colors.glassLight,         // rgba(10, 10, 10, 0.5)
    borderColor: colors.glassBorderLight,      // rgba(168, 85, 247, 0.1)
    borderWidth: 1,
  },

  // Selected state for buttons (radio/toggle style) - Purple
  selectedButton: {
    backgroundColor: colors.glassPurpleLight,   // rgba(107, 33, 168, 0.3)
    borderColor: colors.glassBorderFocus,      // rgba(168, 85, 247, 0.6)
    borderWidth: 1,
  },

  // Unselected state for buttons (radio/toggle style)
  unselectedButton: {
    backgroundColor: colors.glassLight,         // rgba(10, 10, 10, 0.5)
    borderColor: colors.glassBorderLight,      // rgba(168, 85, 247, 0.1)
    borderWidth: 1,
  },

  // Button text color
  buttonText: {
    color: '#FFFFFF',
    textAlign: 'center',
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
