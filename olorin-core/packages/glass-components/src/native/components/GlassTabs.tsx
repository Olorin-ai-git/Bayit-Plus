/**
 * GlassTabs Component
 *
 * Glassmorphic tab navigation with multiple style variants.
 * Supports icons, badges, and TV focus navigation.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing } from '../../theme';
import { useTVFocus } from '../../hooks/useTVFocus';

export interface Tab {
  /** Unique tab identifier */
  id: string;
  /** Tab display label */
  label: string;
  /** Optional icon element */
  icon?: React.ReactNode;
  /** Optional badge text/number */
  badge?: string | number;
  /** Disable this tab */
  disabled?: boolean;
}

export type TabVariant = 'default' | 'pills' | 'underline';

export interface GlassTabsProps {
  /** Array of tab definitions */
  tabs: Tab[];
  /** Currently active tab ID */
  activeTab: string;
  /** Tab change handler */
  onChange: (tabId: string) => void;
  /** Visual variant */
  variant?: TabVariant;
  /** Test ID for testing */
  testID?: string;
}

interface TabButtonProps {
  tab: Tab;
  isActive: boolean;
  onPress: () => void;
  variant: TabVariant;
  isFirst: boolean;
}

const TabButton: React.FC<TabButtonProps> = ({
  tab,
  isActive,
  onPress,
  variant,
  isFirst,
}) => {
  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'button',
  });

  const getButtonStyles = () => {
    switch (variant) {
      case 'pills':
        return [styles.pillTab, isActive && styles.pillTabActive, isFocused ? focusStyle : undefined];
      case 'underline':
        return [styles.underlineTab, isActive && styles.underlineTabActive, isFocused ? focusStyle : undefined];
      default:
        return [styles.tab, isActive && styles.tabActive, isFocused ? focusStyle : undefined];
    }
  };

  const getTextStyles = () => {
    switch (variant) {
      case 'pills':
        return [styles.tabText, isActive ? styles.pillTabTextActive : styles.tabTextInactive];
      case 'underline':
        return [styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive];
      default:
        return [styles.tabText, isActive && styles.tabTextActive];
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={tab.disabled}
      activeOpacity={0.8}
      {...({ hasTVPreferredFocus: isFirst && isActive } as object)}
    >
      <Animated.View style={[getButtonStyles(), scaleTransform]}>
        {tab.icon && <View style={styles.icon}>{tab.icon}</View>}
        <Text style={getTextStyles()}>{tab.label}</Text>
        {tab.badge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{tab.badge}</Text>
          </View>
        )}
        {variant === 'underline' && isActive && <View style={styles.underlineIndicator} />}
      </Animated.View>
    </TouchableOpacity>
  );
};

/**
 * Glassmorphic tabs component with TV focus support
 */
export const GlassTabs: React.FC<GlassTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  testID,
}) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      testID={testID}
    >
      {variant === 'default' && (
        <GlassView style={styles.glassContainer} intensity="medium" noBorder>
          {tabs.map((tab, index) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onPress={() => onChange(tab.id)}
              variant={variant}
              isFirst={index === 0}
            />
          ))}
        </GlassView>
      )}

      {variant === 'pills' && (
        <View style={styles.pillsContainer}>
          {tabs.map((tab, index) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onPress={() => onChange(tab.id)}
              variant={variant}
              isFirst={index === 0}
            />
          ))}
        </View>
      )}

      {variant === 'underline' && (
        <View style={styles.underlineContainer}>
          {tabs.map((tab, index) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onPress={() => onChange(tab.id)}
              variant={variant}
              isFirst={index === 0}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  glassContainer: {
    flexDirection: 'row',
    padding: spacing.xs,
  },
  pillsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  underlineContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.glassPurpleLight,
  },
  pillTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  pillTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  underlineTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    position: 'relative',
  },
  underlineTabActive: {},
  underlineIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  pillTabTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  tabTextInactive: {
    color: colors.textSecondary,
  },
  icon: {
    marginLeft: spacing.sm,
  },
  badge: {
    backgroundColor: colors.glassPurpleLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
  },
});

export default GlassTabs;
