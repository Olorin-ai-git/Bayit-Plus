/**
 * Hook: useAccessibilityProps
 *
 * Factory for creating consistent accessibility properties for interactive elements
 * Generates standardized accessibility labels, hints, and states
 *
 * Usage:
 * const accessibilityProps = useAccessibilityProps({
 *   label: 'Play video',
 *   hint: 'Double tap to play the selected video',
 *   role: 'button',
 *   state: { disabled: false }
 * });
 * <Pressable {...accessibilityProps}>Play</Pressable>
 */

import { AccessibilityRole as RNAccessibilityRole } from 'react-native';

type AccessibilityRoleType = 'button' | 'switch' | 'tab' | 'slider' | 'image' | 'header' | 'text';

interface AccessibilityState {
  checked?: boolean;
  disabled?: boolean;
  selected?: boolean;
  expanded?: boolean;
  busy?: boolean;
}

interface AccessibilityPropsConfig {
  label: string;
  hint?: string;
  role?: AccessibilityRoleType;
  state?: AccessibilityState;
}

interface AccessibilityProps {
  accessible: boolean;
  accessibilityRole: AccessibilityRoleType;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityState: Required<AccessibilityState>;
}

export const useAccessibilityProps = (config: AccessibilityPropsConfig): AccessibilityProps => {
  return {
    accessible: true,
    accessibilityRole: (config.role || 'button') as AccessibilityRoleType,
    accessibilityLabel: config.label,
    accessibilityHint: config.hint,
    accessibilityState: {
      checked: config.state?.checked ?? false,
      disabled: config.state?.disabled ?? false,
      selected: config.state?.selected ?? false,
      expanded: config.state?.expanded ?? false,
      busy: config.state?.busy ?? false,
    },
  };
};
