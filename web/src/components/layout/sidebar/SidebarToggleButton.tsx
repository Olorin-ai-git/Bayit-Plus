/**
 * SidebarToggleButton Component
 *
 * Collapse/expand button for GlassSidebar with RTL support
 * Part of GlassSidebar migration from StyleSheet to TailwindCSS
 *
 * Features:
 * - GlassButton with custom styling
 * - RTL-aware positioning and icon direction
 * - Mode enforcement support (disabled state)
 * - 44x44pt touch target (iOS HIG compliant)
 */

import { View } from 'react-native';
import { z } from 'zod';
import { GlassButton } from '@bayit/shared/ui';
import { platformClass } from '../../../utils/platformClass';

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
    <View
      className={platformClass(
        `absolute top-20 z-[9999] ${isRTL ? '-left-5' : '-right-5'}`,
        `absolute top-20 z-[9999] ${isRTL ? '-left-5' : '-right-5'}`
      )}
    >
      <GlassButton
        title={getToggleIcon()}
        onPress={isUIInteractionEnabled ? onToggle : undefined}
        variant="secondary"
        size="sm"
        style={{
          width: 44,
          height: 44,
          minWidth: 44,
          paddingHorizontal: 0,
          opacity: 0.5,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: '#a855f7', // colors.primary
        }}
        disabled={!isUIInteractionEnabled}
      />
    </View>
  );
}
