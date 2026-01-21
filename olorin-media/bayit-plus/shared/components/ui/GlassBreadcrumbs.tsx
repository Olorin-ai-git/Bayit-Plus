import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing, borderRadius, fontSize } from '../theme';

interface BreadcrumbItem {
  path: string;
  label: string;
}

interface GlassBreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (path: string) => void;
  isRTL?: boolean;
  maxItems?: number;
}

export const GlassBreadcrumbs: React.FC<GlassBreadcrumbsProps> = ({
  items,
  onNavigate,
  isRTL = false,
  maxItems = 10,
}) => {
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
        // @ts-ignore - Web-specific className
        className="glass-light"
        style={styles.container}
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
      style={styles.container}
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
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(12px)',
    // @ts-ignore - Web CSS
    WebkitBackdropFilter: 'blur(12px)',
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
