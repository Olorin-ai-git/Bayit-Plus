/**
 * SidebarMenuSection Component
 *
 * Menu section for GlassSidebar with title and list of menu items
 * Part of GlassSidebar - StyleSheet implementation for RN Web compatibility
 *
 * Features:
 * - Optional section title (e.g., "Discover", "Favorites")
 * - Maps items to SidebarMenuItem components
 * - Section divider between sections
 * - Animated title fade-in/out
 */

import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import SidebarMenuItem from './SidebarMenuItem';
import { colors, spacing } from '@bayit/shared/theme';

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
    <View style={styles.container}>
      {/* Section Title (only when expanded and has title) */}
      {section.titleKey && showLabels && (
        <Animated.Text
          style={[
            styles.sectionTitle,
            {
              opacity: opacityAnim,
              textAlign,
            },
          ]}
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
        <View style={styles.divider} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginVertical: spacing.md,
    marginHorizontal: spacing.md,
  },
});
