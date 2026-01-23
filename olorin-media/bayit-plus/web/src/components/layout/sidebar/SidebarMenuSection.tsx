/**
 * SidebarMenuSection Component
 *
 * Menu section for GlassSidebar with title and list of menu items
 * Part of GlassSidebar migration from StyleSheet to TailwindCSS
 *
 * Features:
 * - Optional section title (e.g., "Discover", "Favorites")
 * - Maps items to SidebarMenuItem components
 * - Section divider between sections
 * - Animated title fade-in/out
 */

import { View, Text, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import SidebarMenuItem from './SidebarMenuItem';
import { platformClass } from '../../../utils/platformClass';

const MenuItemSchema = z.object({
  id: z.string(),
  icon: z.string(),
  labelKey: z.string(),
  path: z.string().optional(),
});

const MenuSectionSchema = z.object({
  titleKey: z.string().optional(),
  items: z.array(MenuItemSchema),
});

const SidebarMenuSectionPropsSchema = z.object({
  section: MenuSectionSchema,
  sectionIndex: z.number(),
  totalSections: z.number(),
  showLabels: z.boolean(),
  isRTL: z.boolean(),
  opacityAnim: z.instanceof(Animated.Value),
  textAlign: z.enum(['left', 'right', 'center']).optional(),
  focusedItem: z.string().nullable(),
  isUIInteractionEnabled: z.boolean(),
  isActive: z.function().args(MenuItemSchema).returns(z.boolean()),
  onItemPress: z.function().args(MenuItemSchema).returns(z.void()),
  onFocus: z.function().args(z.string()).returns(z.void()),
  onBlur: z.function().returns(z.void()),
});

type SidebarMenuSectionProps = z.infer<typeof SidebarMenuSectionPropsSchema>;

export default function SidebarMenuSection({
  section,
  sectionIndex,
  totalSections,
  showLabels,
  isRTL,
  opacityAnim,
  textAlign = 'left',
  focusedItem,
  isUIInteractionEnabled,
  isActive,
  onItemPress,
  onFocus,
  onBlur,
}: SidebarMenuSectionProps) {
  const { t } = useTranslation();

  return (
    <View className={platformClass('mb-1', 'mb-1')}>
      {/* Section Title (only when expanded and has title) */}
      {section.titleKey && showLabels && (
        <Animated.Text
          style={{
            opacity: opacityAnim,
            textAlign,
          }}
          className={platformClass(
            'text-xs font-bold text-white/60 uppercase tracking-wider px-4 py-2 mt-2',
            'text-xs font-bold text-white/60 uppercase tracking-wider px-4 py-2 mt-2'
          )}
        >
          {t(section.titleKey)}
        </Animated.Text>
      )}

      {/* Menu Items */}
      {section.items.map((item) => (
        <SidebarMenuItem
          key={item.id}
          item={item}
          isActive={isActive(item)}
          isRTL={isRTL}
          showLabels={showLabels}
          opacityAnim={opacityAnim}
          textAlign={textAlign}
          focusedItem={focusedItem}
          isUIInteractionEnabled={isUIInteractionEnabled}
          onPress={onItemPress}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      ))}

      {/* Section Divider */}
      {sectionIndex < totalSections - 1 && (
        <View
          className={platformClass(
            'h-px bg-white/[0.08] my-4 mx-4',
            'h-px bg-white/[0.08] my-4 mx-4'
          )}
        />
      )}
    </View>
  );
}
