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
  Animated,
} from 'react-native';
import { GlassView } from './GlassView';
import { colors, spacing } from '../../theme';
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

  const getButtonClassName = () => {
    let className = 'flex-row items-center';

    switch (variant) {
      case 'pills':
        className += ' px-6 py-2 rounded-full border';
        className += isActive ? ' bg-primary border-primary' : ' bg-glass border-glassBorder';
        break;
      case 'underline':
        className += ' px-4 py-4 relative';
        break;
      default:
        className += ' px-4 py-2 rounded-lg';
        className += isActive ? ' bg-glassPurpleLight' : '';
        break;
    }

    return className;
  };

  const getTextColor = () => {
    switch (variant) {
      case 'pills':
        return isActive ? '#000000' : colors.textSecondary;
      case 'underline':
        return isActive ? colors.primary.DEFAULT : colors.textSecondary;
      default:
        return isActive ? colors.primary.DEFAULT : colors.text;
    }
  };

  const getTextClassName = () => {
    let className = 'text-sm';

    switch (variant) {
      case 'pills':
        className += isActive ? ' font-bold' : ' font-medium';
        break;
      case 'underline':
        className += isActive ? ' font-semibold' : ' font-medium';
        break;
      default:
        className += isActive ? ' font-semibold' : ' font-medium';
        break;
    }

    return className;
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
      <Animated.View className={getButtonClassName()} style={[isFocused ? focusStyle : undefined, scaleTransform]}>
        {tab.icon && <View className="ml-2">{tab.icon}</View>}
        <Text className={getTextClassName()} style={{ color: getTextColor() }}>{tab.label}</Text>
        {tab.badge !== undefined && (
          <View className="bg-glassPurpleLight px-2 py-0.5 rounded-full mr-2">
            <Text className="text-[10px] font-semibold" style={{ color: colors.primary.DEFAULT }}>{tab.badge}</Text>
          </View>
        )}
        {variant === 'underline' && isActive && (
          <View className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: colors.primary.DEFAULT }} />
        )}
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
      contentContainerClassName="flex-row"
      testID={testID}
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

export default GlassTabs;
