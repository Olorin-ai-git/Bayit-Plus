/**
 * Custom Glass-Themed Tab Bar
 * Bottom tab navigation with glassmorphism design using Glass UI components
 */

import React from 'react';
import { Text, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Home, Tv, Film, Radio, Mic, User } from 'lucide-react-native';
import { useDirection } from '@bayit/shared-hooks';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { GlassView } from '@olorin/glass-ui';
import { colors } from '@olorin/design-tokens';

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const ACTIVE_COLOR = colors?.primary || '#a855f7';
const INACTIVE_COLOR = colors?.textMuted || '#888888';

const TabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const icons: Record<string, React.ComponentType<{ size: number; color: string; strokeWidth: number }>> = {
    Home: Home,
    LiveTV: Tv,
    VOD: Film,
    Radio: Radio,
    Podcasts: Mic,
    Profile: User,
  };

  const tabLabels: Record<string, string> = {
    Home: t('nav.home') || 'Home',
    LiveTV: t('nav.liveTV') || 'Live TV',
    VOD: t('nav.vod') || 'VOD',
    Radio: t('nav.radio') || 'Radio',
    Podcasts: t('nav.podcasts') || 'Podcasts',
    Profile: t('nav.profile') || 'Profile',
  };

  const handlePress = (route: any, isFocused: boolean) => {
    ReactNativeHapticFeedback.trigger('selection', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });

    const event = navigation.emit({
      type: 'tabPress',
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate({ name: route.name, params: undefined } as never);
    }
  };

  return (
    <GlassView
      intensity="strong"
      className="border-t border-white/10 py-2 px-4"
      style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
    >
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const label = tabLabels[route.name] || route.name;
        const Icon = icons[route.name] || Home;

        return (
          <Pressable
            key={route.key}
            onPress={() => handlePress(route, isFocused)}
            className={`flex-1 items-center py-2 px-1 rounded-xl ${isFocused ? 'bg-[rgba(107,33,168,0.3)]' : ''}`}
            accessibilityRole="tab"
            accessibilityLabel={`${label} tab`}
            accessibilityHint={`Navigate to ${label}`}
            accessibilityState={{ selected: isFocused }}
            style={({ pressed }) => [
              { opacity: pressed ? 0.7 : 1 },
              { minHeight: 44, minWidth: 44 },
            ]}
            testID={`tab-${route.name.toLowerCase()}`}
          >
            <Icon
              size={24}
              color={isFocused ? ACTIVE_COLOR : INACTIVE_COLOR}
              strokeWidth={isFocused ? 2.5 : 2}
            />
            <Text
              className={`text-[12px] mt-1 ${isFocused ? 'font-semibold' : 'font-medium'}`}
              style={{ color: isFocused ? ACTIVE_COLOR : INACTIVE_COLOR }}
              numberOfLines={1}
              accessibilityElementsHidden
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </GlassView>
  );
};

export default TabBar;
