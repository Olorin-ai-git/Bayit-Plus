/**
 * Custom Glass-Themed Tab Bar
 * Bottom tab navigation with glassmorphism design
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Home, Tv, Film, Radio, Mic, User } from 'lucide-react-native';
import { useDirection } from '@bayit/shared-hooks';

interface TabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const TabBar: React.FC<TabBarProps> = ({ state, descriptors, navigation }) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const icons: Record<string, any> = {
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

  return (
    <View
      className="bg-[rgba(10,10,20,0.95)] border-t border-white/10 py-2 px-4 backdrop-blur-xl"
      style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
    >
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const label = tabLabels[route.name] || route.name;
        const Icon = icons[route.name] || Home;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            // Use navigate with screen name and params for tab navigation
            navigation.navigate({ name: route.name, params: undefined } as never);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            className={`flex-1 items-center py-2 px-1 rounded-xl ${isFocused ? 'bg-[rgba(107,33,168,0.3)]' : ''}`}
            activeOpacity={0.7}
          >
            <Icon
              size={24}
              color={isFocused ? '#a855f7' : '#888888'}
              strokeWidth={isFocused ? 2.5 : 2}
            />
            <Text className={`text-[11px] mt-1 ${isFocused ? 'text-[#a855f7] font-semibold' : 'text-[#888888] font-medium'}`}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default TabBar;
