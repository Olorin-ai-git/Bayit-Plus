import React from 'react';
import { View, Text, Pressable, ScrollView, Platform, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { colors, spacing } from '../theme';

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

  const renderContent = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[
        styles.scrollContent,
        isRTL && styles.scrollContentRTL,
      ]}
    >
      {displayItems.map((item, index) => {
        const isLast = index === displayItems.length - 1;
        const isFirst = index === 0;

        return (
          <View
            key={`${item.path}-${index}`}
            style={[styles.itemContainer, isRTL && styles.itemContainerRTL]}
          >
            <Pressable
              onPress={() => !isLast && onNavigate(item.path)}
              style={[
                styles.itemButton,
                isRTL && styles.itemButtonRTL,
                isLast && styles.itemButtonActive,
              ]}
              disabled={isLast}
            >
              {isFirst && (
                <Text style={[styles.homeIcon, isRTL ? styles.homeIconRTL : styles.homeIconLTR]}>
                  🏠
                </Text>
              )}
              <Text
                style={[
                  styles.itemText,
                  isLast ? styles.itemTextActive : styles.itemTextInactive,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>

            {!isLast && (
              <View style={styles.chevronContainer}>
                <Text style={styles.chevronText}>{chevron}</Text>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );

  // Web: Use backdrop-filter
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.containerWeb, styles.glassLight]}>
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
      style={styles.containerNative}
    >
      {renderContent()}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  containerWeb: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  glassLight: {
    // @ts-ignore - Web CSS for glassmorphism
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  containerNative: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  scrollContentRTL: {
    flexDirection: 'row-reverse',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemContainerRTL: {
    flexDirection: 'row-reverse',
  },
  itemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: 180,
  },
  itemButtonRTL: {
    flexDirection: 'row-reverse',
  },
  itemButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  homeIcon: {
    fontSize: 12,
  },
  homeIconLTR: {
    marginRight: 6,
  },
  homeIconRTL: {
    marginLeft: 6,
  },
  itemText: {
    fontSize: 14,
  },
  itemTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  itemTextInactive: {
    color: colors.primary,
    fontWeight: '500',
  },
  chevronContainer: {
    paddingHorizontal: 4,
  },
  chevronText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    opacity: 0.7,
  },
});

export default GlassBreadcrumbs;
