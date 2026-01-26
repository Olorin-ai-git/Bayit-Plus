/**
 * Custom Glass-Themed Tab Bar
 * Bottom tab navigation with glassmorphism design using Glass UI components
 */

import React from 'react';
import { Text, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Home, Tv, Film, Radio, Mic, User } from 'lucide-react-native';
import { useDirection } from '@bayit/shared-hooks';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { GlassView } from '@olorin/glass-ui';
import { ICON_REGISTRY } from '@olorin/shared-icons';
import { colors } from '@olorin/design-tokens';
import { useScaledFontSize } from '../../hooks/useScaledFontSize';

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

interface TabIconProps {
  name: string;
  color: string;
  isActive: boolean;
}

const iconComponentMap: Record<string, React.ComponentType<any>> = {
  home: Home,
  live: Tv,
  vod: Film,
  radio: Radio,
  podcasts: Mic,
  profile: User,
};

const TabIcon: React.FC<TabIconProps> = ({ name, color, isActive }) => {
  const IconComponent = iconComponentMap[name] || Home;

  return (
    <IconComponent
      size={24}
      color={color}
      strokeWidth={isActive ? 2.5 : 2}
    />
  );
};

const ACTIVE_COLOR = colors?.primary || '#a855f7';
const INACTIVE_COLOR = colors?.textMuted || '#888888';
const FOCUS_BACKGROUND = colors?.glass?.purpleLight || 'rgba(88, 28, 135, 0.35)';

const TabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const scaledFontSize = useScaledFontSize();
  const insets = useSafeAreaInsets();

  const iconNames: Record<string, string> = {
    Home: 'home',
    LiveTV: 'live',
    VOD: 'vod',
    Radio: 'radio',
    Podcasts: 'podcasts',
    Profile: 'profile',
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
      style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        paddingBottom: Math.max(8, insets.bottom),
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const label = tabLabels[route.name] || route.name;
        const iconName = iconNames[route.name] || 'home';
        const iconColor = isFocused ? ACTIVE_COLOR : INACTIVE_COLOR;

        return (
          <Pressable
            key={route.key}
            onPress={() => handlePress(route, isFocused)}
            className="flex-1 items-center py-2 px-1 rounded-xl"
            accessibilityRole="tab"
            accessibilityLabel={`${label} tab`}
            accessibilityHint={`Navigate to ${label}`}
            accessibilityState={{ selected: isFocused }}
            style={({ pressed }) => [
              { opacity: pressed ? 0.7 : 1 },
              { minHeight: 44, minWidth: 44 },
              isFocused && { backgroundColor: FOCUS_BACKGROUND },
            ]}
            testID={`tab-${route.name.toLowerCase()}`}
          >
            <TabIcon
              name={iconName}
              color={iconColor}
              isActive={isFocused}
            />
            <Text
              className={`mt-1 ${isFocused ? 'font-semibold' : 'font-medium'}`}
              style={{ color: iconColor, fontSize: scaledFontSize.xs }}
              numberOfLines={1}
              ellipsizeMode="tail"
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
