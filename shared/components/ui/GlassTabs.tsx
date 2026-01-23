import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing, fontSize } from '../theme';
import { isTV } from '../utils/platform';
import { useTVFocus } from '../hooks/useTVFocus';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

type TabVariant = 'default' | 'pills' | 'underline';

interface GlassTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: TabVariant;
}

export const GlassTabs: React.FC<GlassTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
}) => {
  const renderTabs = () => (
    tabs.map((tab, index) => (
      <TabButton
        key={tab.id}
        tab={tab}
        isActive={activeTab === tab.id}
        onPress={() => onChange(tab.id)}
        variant={variant}
        isFirst={index === 0}
      />
    ))
  );

  if (variant === 'default') {
    return (
      <GlassView style={styles.defaultContainer} intensity="medium" noBorder>
        <View style={styles.tabRow}>
          {renderTabs()}
        </View>
      </GlassView>
    );
  }

  if (variant === 'pills') {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.pillsContainer}>
          {renderTabs()}
        </View>
      </ScrollView>
    );
  }

  // underline variant
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={styles.underlineContainer}>
        {renderTabs()}
      </View>
    </ScrollView>
  );
};

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

  const getButtonStyle = () => {
    const baseStyle = variant === 'pills'
      ? styles.pillButton
      : variant === 'underline'
      ? styles.underlineButton
      : styles.defaultButton;

    const activeStyle = variant === 'pills'
      ? (isActive ? styles.pillButtonActive : styles.pillButtonInactive)
      : variant === 'underline'
      ? undefined
      : (isActive ? styles.defaultButtonActive : undefined);

    return [baseStyle, activeStyle, focusStyle];
  };

  const getTextColor = () => {
    if (variant === 'pills') {
      return isActive ? '#000000' : colors.textSecondary;
    }
    return isActive ? colors.primary : colors.textSecondary;
  };

  const getTextWeight = (): '500' | '600' | '700' => {
    if (variant === 'pills' && isActive) return '700';
    if (isActive) return '600';
    return '500';
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={tab.disabled}
      activeOpacity={0.8}
      // @ts-ignore - TV focus
      hasTVPreferredFocus={isFirst && isActive}
    >
      <Animated.View style={[getButtonStyle(), scaleTransform]}>
        {tab.icon && <View style={styles.iconWrapper}>{tab.icon}</View>}
        <Text style={[styles.tabText, { color: getTextColor(), fontWeight: getTextWeight() }]}>
          {tab.label}
        </Text>
        {tab.badge !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{tab.badge}</Text>
          </View>
        )}
        {variant === 'underline' && isActive && (
          <View style={styles.underlineIndicator} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: 'row',
  },
  defaultContainer: {
    padding: spacing.xs,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  defaultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  defaultButtonActive: {
    backgroundColor: colors.glassPurpleLight,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  pillButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillButtonInactive: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
  },
  underlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    position: 'relative',
  },
  tabText: {
    fontSize: isTV ? fontSize.lg : fontSize.sm,
  },
  iconWrapper: {
    marginRight: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.glassPurpleLight,
    marginLeft: spacing.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  underlineIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
  },
});

export default GlassTabs;
