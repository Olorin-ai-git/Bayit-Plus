/**
 * SidebarMenuItem Component
 *
 * Individual menu item for GlassSidebar with icon, label, and active state
 * Part of GlassSidebar - StyleSheet implementation for RN Web compatibility
 *
 * Features:
 * - Emoji icon with label
 * - Active state highlighting
 * - Focus state for keyboard/TV navigation
 * - Mode enforcement support (disabled state)
 * - Active indicator bar (RTL-aware positioning)
 * - Touch target minimum 36x36pt (iOS HIG compliant)
 */

import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';

// Check if this is a TV build
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

const MenuItemSchema = z.object({
  id: z.string(),
  icon: z.string(),
  labelKey: z.string(),
  path: z.string().optional(),
});

const SidebarMenuItemPropsSchema = z.object({
  item: MenuItemSchema,
  isActive: z.boolean(),
  isRTL: z.boolean(),
  showLabels: z.boolean(),
  opacityAnim: z.instanceof(Animated.Value),
  textAlign: z.enum(['left', 'right', 'center']).optional(),
  focusedItem: z.string().nullable(),
  isUIInteractionEnabled: z.boolean(),
  onPress: z.function().args(MenuItemSchema).returns(z.void()),
  onFocus: z.function().args(z.string()).returns(z.void()),
  onBlur: z.function().returns(z.void()),
});

type SidebarMenuItemProps = z.infer<typeof SidebarMenuItemPropsSchema>;

export default function SidebarMenuItem({
  item,
  isActive,
  isRTL,
  showLabels,
  opacityAnim,
  textAlign = 'left',
  focusedItem,
  isUIInteractionEnabled,
  onPress,
  onFocus,
  onBlur,
}: SidebarMenuItemProps) {
  const { t } = useTranslation();

  const iconSize = IS_TV_BUILD ? 48 : 36;
  const fontSize = IS_TV_BUILD ? 16 : 14;
  const emojiSize = IS_TV_BUILD ? 24 : 18;

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      disabled={!isUIInteractionEnabled}
      onFocus={() => onFocus(item.id)}
      onBlur={onBlur}
      style={[
        styles.container,
        isActive && styles.containerActive,
        focusedItem === item.id && styles.containerFocused,
        {
          pointerEvents: isUIInteractionEnabled ? 'auto' : 'none',
          opacity: isUIInteractionEnabled ? 1 : 0.5,
        },
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          {
            width: iconSize,
            height: iconSize,
          },
        ]}
      >
        <Text style={{ fontSize: emojiSize }}>{item.icon}</Text>
      </View>
      {showLabels && (
        <Animated.Text
          style={[
            styles.label,
            isActive && styles.labelActive,
            {
              textAlign,
              marginStart: spacing.sm,
              opacity: opacityAnim,
              fontSize,
            },
          ]}
          numberOfLines={1}
        >
          {t(item.labelKey)}
        </Animated.Text>
      )}
      {isActive && (
        <View
          style={[
            styles.activeIndicator,
            isRTL ? styles.activeIndicatorRTL : styles.activeIndicatorLTR,
          ]}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    position: 'relative',
  },
  containerActive: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  containerFocused: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    color: colors.text,
    flex: 1,
  },
  labelActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    top: '50%',
    marginTop: -12,
    width: 4,
    height: 24,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  activeIndicatorLTR: {
    left: 0,
  },
  activeIndicatorRTL: {
    right: 0,
  },
});
