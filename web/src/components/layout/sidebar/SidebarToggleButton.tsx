/**
 * SidebarToggleButton Component
 *
 * Collapse/expand button for GlassSidebar with RTL support
 * Part of GlassSidebar - StyleSheet implementation for RN Web compatibility
 *
 * Features:
 * - GlassButton with custom styling
 * - RTL-aware positioning and icon direction
 * - Mode enforcement support (disabled state)
 * - 44x44pt touch target (iOS HIG compliant)
 */

import { View, StyleSheet } from 'react-native';
import { z } from 'zod';
import { GlassButton } from '@bayit/shared/ui';
import { colors, spacing } from '@olorin/design-tokens';

const SidebarToggleButtonPropsSchema = z.object({
  isExpanded: z.boolean(),
  isRTL: z.boolean(),
  isUIInteractionEnabled: z.boolean(),
  onToggle: z.function().returns(z.void()),
});

type SidebarToggleButtonProps = z.infer<typeof SidebarToggleButtonPropsSchema>;

export default function SidebarToggleButton({
  isExpanded,
  isRTL,
  isUIInteractionEnabled,
  onToggle,
}: SidebarToggleButtonProps) {
  // Toggle icon based on direction and expanded state
  const getToggleIcon = () => {
    if (isRTL) {
      return isExpanded ? '◀' : '▶';
    }
    return isExpanded ? '▶' : '◀';
  };

  return (
    <View style={[
      styles.container,
      isRTL ? styles.containerRTL : styles.containerLTR,
    ]}>
      <GlassButton
        title={getToggleIcon()}
        onPress={isUIInteractionEnabled ? onToggle : undefined}
        variant="secondary"
        size="sm"
        style={styles.button}
        disabled={!isUIInteractionEnabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: spacing.xl * 2,
    zIndex: 9999,
  },
  containerLTR: {
    right: -20,
  },
  containerRTL: {
    left: -20,
  },
  button: {
    width: 44,
    height: 44,
    minWidth: 44,
    paddingHorizontal: 0,
    opacity: 0.5,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
  },
});
