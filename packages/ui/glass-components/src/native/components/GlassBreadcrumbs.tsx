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
  Pressable,
  ScrollView,
  Platform,
  I18nManager,
  ViewStyle,
  StyleProp,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, fontSize } from '../../theme';

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
      contentContainerStyle={{ alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs, flexDirection }}
    >
      {displayItems.map((item, index) => {
        const isLast = index === displayItems.length - 1;
        const isFirst = index === 0;

        return (
          <View key={`${item.path}-${index}`} className="flex-row items-center" style={{ flexDirection }}>
            <Pressable
              onPress={() => !isLast && onNavigate(item.path)}
              className="flex-row items-center px-2 py-1 rounded-md max-w-[180px]"
              style={({ pressed }) => [
                isLast && {
                  backgroundColor: colors.glassPurpleLight,
                  borderWidth: 1,
                  borderColor: colors.glassBorderFocus,
                },
                pressed && !isLast && { backgroundColor: colors.glassBorderWhite },
              ]}
              disabled={isLast}
            >
              {isFirst && (
                <Text className="text-xs" style={isRTL ? { marginLeft: 6 } : { marginRight: 6 }}>🏠</Text>
              )}
              <Text
                className={isLast ? 'font-semibold' : 'font-medium'}
                style={{
                  fontSize: fontSize.sm,
                  color: isLast ? colors.text : !isLast ? colors.primary : colors.textSecondary,
                }}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>

            {!isLast && (
              <View className="px-1">
                <Text className="text-base font-semibold opacity-70" style={{ color: colors.primary }}>{chevron}</Text>
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
        className="glass-light px-4 py-2 border-b"
        style={[
          {
            borderBottomColor: colors.glassBorder,
            backgroundColor: colors.glassMedium,
          },
          style,
        ]}
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
      style={[
        {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.glassBorder,
          backgroundColor: colors.glassMedium,
        },
        style,
      ]}
      {...({ testID } as object)}
    >
      {renderContent()}
    </LinearGradient>
  );
};

export default GlassBreadcrumbs;
