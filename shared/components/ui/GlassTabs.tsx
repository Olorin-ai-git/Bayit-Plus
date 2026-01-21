import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, borderRadius, spacing } from '../theme';
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
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="flex-row"
    >
      {variant === 'default' && (
        <GlassView className="flex-row p-1" intensity="medium" noBorder>
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
        <View className="flex-row gap-2">
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
        <View className="flex-row border-b" style={{ borderBottomColor: colors.glassBorder }}>
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
  const { isFocused, handleFocus, handleBlur, scaleTransform, focusStyle } = useTVFocus({
    styleType: 'button',
  });

  const getButtonClass = () => {
    switch (variant) {
      case 'pills':
        return `flex-row items-center px-6 py-2 rounded-full border ${isActive ? '' : ''}`;
      case 'underline':
        return 'flex-row items-center px-4 py-4 relative';
      default:
        return `flex-row items-center px-4 py-2 rounded-lg ${isActive ? '' : ''}`;
    }
  };

  const getButtonStyle = () => {
    switch (variant) {
      case 'pills':
        return [
          {
            backgroundColor: isActive ? colors.primary : colors.glass,
            borderColor: isActive ? colors.primary : colors.glassBorder,
          },
          focusStyle,
        ];
      case 'underline':
        return focusStyle;
      default:
        return [
          { backgroundColor: isActive ? colors.glassPurpleLight : 'transparent' },
          focusStyle,
        ];
    }
  };

  const getTextColor = () => {
    if (variant === 'pills') {
      return isActive ? '#000000' : colors.textSecondary;
    }
    return isActive ? colors.primary : colors.textSecondary;
  };

  const getTextWeight = () => {
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
      <Animated.View className={getButtonClass()} style={[getButtonStyle(), scaleTransform]}>
        {tab.icon && <View className="ml-2">{tab.icon}</View>}
        <Text className="text-sm" style={{ color: getTextColor(), fontWeight: getTextWeight() }}>
          {tab.label}
        </Text>
        {tab.badge !== undefined && (
          <View className="px-2 py-0.5 rounded-full mr-2" style={{ backgroundColor: colors.glassPurpleLight }}>
            <Text className="text-[10px] font-semibold" style={{ color: colors.primary }}>{tab.badge}</Text>
          </View>
        )}
        {variant === 'underline' && isActive && (
          <View className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: colors.primary }} />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default GlassTabs;
