/**
 * GlassBreadcrumbs Component
 *
 * Navigation breadcrumb trail with glassmorphic styling.
 * Shows path hierarchy with clickable navigation items.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  I18nManager,
  ViewStyle,
  StyleProp,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

export interface BreadcrumbItem {
  /** Path identifier for navigation */
  path: string;
  /** Display label */
  label: string;
}

export interface GlassBreadcrumbsProps {
  /** Breadcrumb items array */
  items: BreadcrumbItem[];
  /** Navigation callback when item is pressed */
  onNavigate: (path: string) => void;
  /** Force RTL layout */
  isRTL?: boolean;
  /** Maximum items to display */
  maxItems?: number;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Glassmorphic breadcrumbs navigation component
 */
export const GlassBreadcrumbs: React.FC<GlassBreadcrumbsProps> = ({
  items,
  onNavigate,
  isRTL: forceRTL,
  maxItems = 10,
  style,
  testID,
}) => {
  const isRTL = forceRTL ?? I18nManager.isRTL;

  // Don't render if only one item or empty
  if (items.length <= 1) {
    return null;
  }

  const displayItems = items.slice(-maxItems);
  const chevron = isRTL ? '‹' : '›';
  const flexDirection = isRTL ? 'row-reverse' : 'row';

  const renderContent = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, { flexDirection }]}
    >
      {displayItems.map((item, index) => {
        const isLast = index === displayItems.length - 1;
        const isFirst = index === 0;

        return (
          <View key={`${item.path}-${index}`} style={[styles.itemContainer, { flexDirection }]}>
            <Pressable
              onPress={() => !isLast && onNavigate(item.path)}
              style={({ pressed }) => [
                styles.breadcrumb,
                isLast && styles.breadcrumbActive,
                pressed && !isLast && styles.breadcrumbPressed,
              ]}
              disabled={isLast}
            >
              {isFirst && (
                <Text style={[styles.homeIcon, isRTL && styles.homeIconRTL]}>🏠</Text>
              )}
              <Text
                style={[
                  styles.breadcrumbText,
                  isLast && styles.breadcrumbTextActive,
                  !isLast && styles.breadcrumbTextClickable,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>

            {!isLast && (
              <View style={styles.separatorContainer}>
                <Text style={styles.separator}>{chevron}</Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );

  // Web: Use CSS backdrop-filter
  if (Platform.OS === 'web') {
    return (
      <View
        // @ts-expect-error - Web-specific className
        className="glass-light"
        style={[styles.container, style]}
        testID={testID}
      >
        {renderContent()}
      </View>
    );
  }

  // Native: Use gradient fallback
  return (
    <LinearGradient
      colors={[colors.glass, colors.glassStrong]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={StyleSheet.flatten([styles.container, style])}
      {...({ testID } as object)}
    >
      {renderContent()}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
    backgroundColor: colors.glassMedium,
  },
  scrollContent: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    maxWidth: 180,
  },
  breadcrumbActive: {
    backgroundColor: colors.glassPurpleLight,
    borderWidth: 1,
    borderColor: colors.glassBorderFocus,
  },
  breadcrumbPressed: {
    backgroundColor: colors.glassBorderWhite,
  },
  homeIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  homeIconRTL: {
    marginRight: 0,
    marginLeft: 6,
  },
  breadcrumbText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  breadcrumbTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  breadcrumbTextClickable: {
    color: colors.primary,
    fontWeight: '500',
  },
  separatorContainer: {
    paddingHorizontal: 4,
  },
  separator: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    opacity: 0.7,
  },
});

export default GlassBreadcrumbs;
