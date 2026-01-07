import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing } from '../../theme';
import { isTV } from '../../utils/platform';

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
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
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
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    if (isTV || Platform.OS !== 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (isTV || Platform.OS !== 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const getButtonStyles = () => {
    switch (variant) {
      case 'pills':
        return [
          styles.pillTab,
          isActive && styles.pillTabActive,
          isFocused && styles.tabFocused,
        ];
      case 'underline':
        return [
          styles.underlineTab,
          isActive && styles.underlineTabActive,
          isFocused && styles.tabFocused,
        ];
      default:
        return [
          styles.tab,
          isActive && styles.tabActive,
          isFocused && styles.tabFocused,
        ];
    }
  };

  const getTextStyles = () => {
    switch (variant) {
      case 'underline':
        return [
          styles.tabText,
          isActive ? styles.tabTextActive : styles.tabTextInactive,
        ];
      default:
        return [
          styles.tabText,
          isActive && styles.tabTextActive,
        ];
    }
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
      <Animated.View style={[getButtonStyles(), { transform: [{ scale: scaleAnim }] }]}>
        {tab.icon && <View style={styles.icon}>{tab.icon}</View>}
        <Text style={getTextStyles()}>{tab.label}</Text>
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
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
  },
  tabFocused: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
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
  tabTextInactive: {
    color: colors.textSecondary,
  },
  icon: {
    marginLeft: spacing.sm,
  },
  badge: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
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
