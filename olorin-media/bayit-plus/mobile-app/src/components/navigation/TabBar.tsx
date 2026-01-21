/**
 * Custom Glass-Themed Tab Bar
 * Bottom tab navigation with glassmorphism design
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
            style={[styles.tab, isFocused && styles.tabFocused]}
            activeOpacity={0.7}
          >
            <Icon
              size={24}
              color={isFocused ? '#a855f7' : '#888888'}
              strokeWidth={isFocused ? 2.5 : 2}
            />
            <Text style={[styles.label, isFocused && styles.labelFocused]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(10, 10, 20, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    // Glass effect
    // @ts-ignore - Web CSS properties
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  tabFocused: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  label: {
    fontSize: 11,
    color: '#888888',
    marginTop: 4,
    fontWeight: '500',
  },
  labelFocused: {
    color: '#a855f7',
    fontWeight: '600',
  },
});

export default TabBar;
