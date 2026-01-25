/**
 * Admin Button Styles
 * Shared glassmorphic button styles for admin interface consistency across all platforms
 *
 * Usage (React Native):
 * ```typescript
 * import { adminButtonStyles } from '@olorin/design-tokens';
 * <GlassButton
 *   variant="secondary"
 *   style={adminButtonStyles.primaryButton}
 *   textStyle={adminButtonStyles.buttonText}
 * />
 * ```
 */

/**
 * Button style definitions using glassmorphic design with subtle transparency
 */
export const adminButtonStyles = {
  // Action Buttons
  primaryButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },

  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },

  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },

  infoButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },

  warningButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },

  successButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },

  cancelButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },

  // Toggle Button States
  selectedButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },

  unselectedButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },

  // Text Styles
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
} as const;
