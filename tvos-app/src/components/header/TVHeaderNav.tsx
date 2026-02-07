/**
 * TVHeaderNav - Navigation section for TV Header
 * Extracted from TVHeader.tsx for file size compliance
 */

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NativeIcon } from '@olorin/shared-icons/native';

// Navigation links - matching web app navigation with TV-specific additions
// Maps to unified icon registry names
export const navLinkKeys = [
  { route: 'Home', key: 'nav.home', iconName: 'home' },
  { route: 'LiveTV', key: 'nav.liveTV', iconName: 'live' },
  { route: 'EPG', key: 'nav.epg', iconName: 'epg' },
  { route: 'VOD', key: 'nav.vod', iconName: 'vod' },
  { route: 'Radio', key: 'nav.radio', iconName: 'radio' },
  { route: 'Podcasts', key: 'nav.podcasts', iconName: 'podcasts' },
  { route: 'Flows', key: 'nav.flows', iconName: 'discover' },
  { route: 'Judaism', key: 'nav.judaism', iconName: 'judaism' },
  { route: 'Children', key: 'nav.children', iconName: 'children' },
  { route: 'BetaAI', key: 'nav.betaAI', iconName: 'ai' },
];

interface TVHeaderNavProps {
  currentRoute: string;
  focusedNav: string | null;
  onNavigate: (route: string) => void;
  onFocus: (route: string) => void;
  onBlur: () => void;
}

export const TVHeaderNav: React.FC<TVHeaderNavProps> = ({
  currentRoute,
  focusedNav,
  onNavigate,
  onFocus,
  onBlur,
}) => {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center gap-2">
      {navLinkKeys.map((link) => {
        const isActive = currentRoute === link.route;
        const isFocused = focusedNav === link.route;
        const iconColor = isActive ? '#ffffff' : '#a0a0a0';
        return (
          <Pressable
            key={link.route}
            onPress={() => onNavigate(link.route)}
            onFocus={() => onFocus(link.route)}
            onBlur={onBlur}
            className={`px-4 py-2.5 rounded-lg border-2 flex-row items-center gap-2 ${
              isActive ? 'bg-purple-500' : 'bg-white/5'
            } ${
              isFocused ? 'border-purple-500 bg-purple-500/30 scale-105' : 'border-transparent'
            }`}
          >
            <NativeIcon
              name={link.iconName}
              size="lg"
              color={iconColor}
              variant={isActive ? 'colored' : 'monochrome'}
            />
            <Text className={`text-xl font-medium ${
              isActive ? 'text-white font-semibold' : 'text-gray-400'
            }`}>
              {t(link.key)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};
