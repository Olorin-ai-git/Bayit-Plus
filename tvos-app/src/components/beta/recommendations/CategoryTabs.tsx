/**
 * CategoryTabs - Horizontal category filter for AI recommendations
 *
 * TV-optimized tab bar with Pressable items and focus states
 * for Siri Remote D-pad navigation.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@olorin/design-tokens';

interface CategoryTabsProps {
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
}

interface TabItemProps {
  category: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
  isFirst: boolean;
}

const TabItem: React.FC<TabItemProps> = ({
  category,
  label,
  isActive,
  onPress,
  isFirst,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      hasTVPreferredFocus={isFirst && isActive}
      style={[
        styles.tab,
        isActive && styles.tabActive,
        isFocused && styles.tabFocused,
      ]}
      accessible
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.tabText,
          isActive && styles.tabTextActive,
          isFocused && styles.tabTextFocused,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

export const CategoryTabs: React.FC<CategoryTabsProps> = ({
  activeCategory,
  onCategoryChange,
  categories,
}) => {
  const { t } = useTranslation();

  const getCategoryLabel = useCallback(
    (category: string): string => {
      return t(`tvos.aiRecommendations.categories.${category}`);
    },
    [t]
  );

  const renderTab = useCallback(
    ({ item, index }: { item: string; index: number }) => (
      <TabItem
        category={item}
        label={getCategoryLabel(item)}
        isActive={activeCategory === item}
        onPress={() => onCategoryChange(item)}
        isFirst={index === 0}
      />
    ),
    [activeCategory, onCategoryChange, getCategoryLabel]
  );

  const keyExtractor = useCallback((item: string) => item, []);

  return (
    <View style={styles.container} accessibilityRole="tablist">
      <FlatList
        data={categories}
        renderItem={renderTab}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
  },
  tabList: {
    gap: spacing[4],
  },
  tab: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.25)',
    borderColor: '#A855F7',
  },
  tabFocused: {
    borderColor: '#A855F7',
    transform: [{ scale: 1.08 }],
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  tabText: {
    fontSize: 26,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  tabTextFocused: {
    color: colors.white,
  },
});
