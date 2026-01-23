/**
 * SidebarMenuItem Component
 *
 * Individual menu item for GlassSidebar with icon, label, and active state
 * Part of GlassSidebar migration from StyleSheet to TailwindCSS
 *
 * Features:
 * - Emoji icon with label
 * - Active state highlighting
 * - Focus state for keyboard/TV navigation
 * - Mode enforcement support (disabled state)
 * - Active indicator bar (RTL-aware positioning)
 * - Touch target minimum 36x36pt (iOS HIG compliant)
 */

import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { platformClass } from '../../../utils/platformClass';

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
      className={platformClass(
        `flex-row items-center py-2 px-2 rounded-lg mb-1 relative ${
          isActive ? 'bg-purple-700/30' : ''
        } ${
          focusedItem === item.id
            ? 'bg-purple-700/30 border border-purple-500'
            : ''
        }`,
        `flex-row items-center py-2 px-2 rounded-lg mb-1 relative ${
          isActive ? 'bg-purple-700/30' : ''
        } ${
          focusedItem === item.id
            ? 'bg-purple-700/30 border border-purple-500'
            : ''
        }`
      )}
      style={{
        pointerEvents: isUIInteractionEnabled ? 'auto' : 'none',
        opacity: isUIInteractionEnabled ? 1 : 0.5,
      }}
    >
      <View
        className={platformClass(
          'justify-center items-center',
          'justify-center items-center'
        )}
        style={{
          width: iconSize,
          height: iconSize,
        }}
      >
        <Text style={{ fontSize: emojiSize }}>{item.icon}</Text>
      </View>
      {showLabels && (
        <Animated.Text
          style={{
            textAlign,
            marginStart: 8,
            opacity: opacityAnim,
            fontSize,
            flex: 1,
          }}
          className={platformClass(
            `${
              isActive
                ? 'text-purple-500 font-bold'
                : 'text-white font-normal'
            }`,
            `${
              isActive
                ? 'text-purple-500 font-bold'
                : 'text-white font-normal'
            }`
          )}
          numberOfLines={1}
        >
          {t(item.labelKey)}
        </Animated.Text>
      )}
      {isActive && (
        <View
          className={platformClass(
            `absolute top-1/2 -mt-3 w-1 h-6 bg-purple-500 rounded ${
              isRTL ? 'right-0' : 'left-0'
            }`,
            `absolute top-1/2 -mt-3 w-1 h-6 bg-purple-500 rounded ${
              isRTL ? 'right-0' : 'left-0'
            }`
          )}
        />
      )}
    </TouchableOpacity>
  );
}
