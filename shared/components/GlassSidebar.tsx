import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { GlassView } from './ui';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import { useDirection } from '../hooks/useDirection';
import { useAuthStore } from '../stores/authStore';
import { useTVFocus } from './hooks/useTVFocus';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

// TV sidebar is wider for 10-foot UI, web sidebar is narrower
const EXPANDED_WIDTH = IS_TV_BUILD ? 280 : 220;
const COLLAPSED_WIDTH = IS_TV_BUILD ? 80 : 64;

interface GlassSidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
  activeRoute?: string;
}

interface MenuItem {
  id: string;
  icon: string;
  labelKey: string;
  route?: string;
}

interface MenuSection {
  titleKey?: string;
  items: MenuItem[];
}

// Base menu sections (without admin - that's added dynamically based on user role)
const baseMenuSections: MenuSection[] = [
  {
    items: [
      { id: 'home', icon: '🏠', labelKey: 'nav.home', route: 'Home' },
      { id: 'liveTV', icon: '📺', labelKey: 'nav.liveTV', route: 'LiveTV' },
      { id: 'vod', icon: '🎬', labelKey: 'nav.vod', route: 'VOD' },
      { id: 'radio', icon: '📻', labelKey: 'nav.radio', route: 'Radio' },
      { id: 'podcasts', icon: '🎙️', labelKey: 'nav.podcasts', route: 'Podcasts' },
    ],
  },
  {
    titleKey: 'nav.discover',
    items: [
      { id: 'flows', icon: '✨', labelKey: 'nav.flows', route: 'Flows' },
      { id: 'judaism', icon: '✡️', labelKey: 'nav.judaism', route: 'Judaism' },
      { id: 'children', icon: '👶', labelKey: 'nav.children', route: 'Children' },
    ],
  },
  {
    titleKey: 'nav.favorites',
    items: [
      { id: 'favorites', icon: '⭐', labelKey: 'nav.favorites', route: 'Favorites' },
      { id: 'watchlist', icon: '📋', labelKey: 'nav.watchlist', route: 'Watchlist' },
      { id: 'downloads', icon: '⬇️', labelKey: 'nav.downloads', route: 'Downloads' },
    ],
  },
  {
    titleKey: 'nav.account',
    items: [
      { id: 'profile', icon: '👤', labelKey: 'nav.profile', route: 'Profile' },
      { id: 'subscribe', icon: '💎', labelKey: 'nav.subscribe', route: 'Subscribe' },
    ],
  },
  {
    titleKey: 'nav.settings',
    items: [
      { id: 'settings', icon: '⚙️', labelKey: 'nav.settings', route: 'Settings' },
      { id: 'support', icon: '🎧', labelKey: 'nav.support', route: 'Support' },
    ],
  },
];

export const GlassSidebar: React.FC<GlassSidebarProps> = ({ isExpanded, onToggle, activeRoute }) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigation = useNavigation<any>();
  const { user, logout } = useAuthStore();
  const widthAnim = useRef(new Animated.Value(isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH)).current;
  const opacityAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState<string>(activeRoute || 'Home');

  // Dynamically add Admin menu item if user is admin
  const menuSections = useMemo(() => {
    const isAdmin = user?.role === 'admin';
    if (!isAdmin) return baseMenuSections;

    // Add Admin to Settings section
    return baseMenuSections.map(section => {
      if (section.titleKey === 'nav.settings') {
        return {
          ...section,
          items: [
            { id: 'admin', icon: '👨‍💼', labelKey: 'nav.admin', route: 'Admin' },
            ...section.items,
          ],
        };
      }
      return section;
    });
  }, [user?.role]);

  // Update current route when activeRoute prop changes
  useEffect(() => {
    if (activeRoute) {
      setCurrentRoute(activeRoute);
    }
  }, [activeRoute]);

  // Listen to navigation state changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e: any) => {
      const state = e.data?.state;
      if (state?.routes) {
        const route = state.routes[state.index];
        // Handle nested navigators (e.g., Main tabs)
        if (route.state?.routes) {
          setCurrentRoute(route.state.routes[route.state.index]?.name || 'Home');
        } else {
          setCurrentRoute(route.name);
        }
      }
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(widthAnim, {
        toValue: isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
        friction: 8,
        tension: 65,
        useNativeDriver: false,
      }),
      Animated.timing(opacityAnim, {
        toValue: isExpanded ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isExpanded]);

  const handleItemPress = (item: MenuItem) => {
    if (item.route) {
      setCurrentRoute(item.route);
      // Main navigation screens are inside the Main tab navigator
      const mainTabScreens = ['Home', 'LiveTV', 'VOD', 'Radio', 'Podcasts', 'Profile'];
      if (mainTabScreens.includes(item.route)) {
        // Navigate to Main first, then to the specific tab
        navigation.navigate('Main', { screen: item.route });
      } else {
        // For other screens (Favorites, Watchlist, Settings, etc.), navigate directly
        navigation.navigate(item.route);
      }
    }
  };

  const isActive = (item: MenuItem) => {
    return currentRoute === item.route;
  };

  // Toggle icon based on direction and expanded state
  const getToggleIcon = () => {
    if (isRTL) {
      return isExpanded ? '▶' : '◀';
    } else {
      return isExpanded ? '◀' : '▶';
    }
  };

  return (
    <>
      {/* Backdrop overlay when expanded */}
      {isExpanded && (
        <TouchableOpacity
          className="absolute inset-0 bg-black/50 z-[99]"
          activeOpacity={1}
          onPress={onToggle}
        />
      )}
      <Animated.View style={[
        { width: widthAnim },
        isRTL ? { right: 0 } : { left: 0 },
      ]} className="h-full absolute top-0 bottom-0 z-[100]">
        <GlassView intensity="low" style={
          isRTL
            ? { borderLeftWidth: 1, borderLeftColor: colors.glassBorder }
            : { borderRightWidth: 1, borderRightColor: colors.glassBorder }
        } className="flex-1 pt-4 pb-3">
        {/* Toggle Button */}
        <TouchableOpacity
          onPress={onToggle}
          className="items-center py-2 mb-3"
          onFocus={() => setFocusedItem('toggle')}
          onBlur={() => setFocusedItem(null)}
        >
          <View className={`w-10 h-10 rounded-full bg-white/5 justify-center items-center border ${
            focusedItem === 'toggle' ? 'border-primary border-[3px] bg-primary/30' : 'border-transparent'
          }`}>
            <Text className="text-base text-white">{getToggleIcon()}</Text>
          </View>
        </TouchableOpacity>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.sm }}
        >
          {menuSections.map((section, sectionIndex) => (
            <View key={sectionIndex} className="mb-1">
              {/* Section Title (only when expanded and has title) */}
              {isExpanded && section.titleKey && (
                <Animated.Text
                  style={{ opacity: opacityAnim, textAlign }}
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 py-2 mt-2"
                >
                  {t(section.titleKey)}
                </Animated.Text>
              )}

              {/* Menu Items */}
              {section.items.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => handleItemPress(item)}
                  onFocus={() => setFocusedItem(item.id)}
                  onBlur={() => setFocusedItem(null)}
                  className={`flex-row items-center py-2 px-2 rounded-lg mb-1 relative ${
                    isActive(item) ? 'bg-primary/30' : ''
                  } ${focusedItem === item.id ? 'bg-primary/30 border-[3px] border-primary' : ''}`}
                >
                  <View className={`${IS_TV_BUILD ? 'w-12 h-12' : 'w-9 h-9'} justify-center items-center`}>
                    <Text className={`${IS_TV_BUILD ? 'text-2xl' : 'text-lg'}`}>
                      {item.icon}
                    </Text>
                  </View>
                  {isExpanded && (
                    <Animated.Text
                      style={{
                        textAlign,
                        marginStart: spacing.sm,
                        opacity: opacityAnim
                      }}
                      className={`${IS_TV_BUILD ? 'text-base' : 'text-sm'} text-white flex-1 ${
                        isActive(item) ? 'text-primary font-bold' : ''
                      }`}
                      numberOfLines={1}
                    >
                      {t(item.labelKey)}
                    </Animated.Text>
                  )}
                  {isActive(item) && (
                    <View
                      className="absolute top-1/2 w-1 h-6 bg-primary rounded -mt-3"
                      style={isRTL ? { right: 0 } : { left: 0 }}
                    />
                  )}
                </TouchableOpacity>
              ))}

              {/* Section Divider (only when expanded) */}
              {isExpanded && sectionIndex < menuSections.length - 1 && (
                <View
                  className="h-px my-3 mx-3"
                  style={{ backgroundColor: colors.glassBorder }}
                />
              )}
            </View>
          ))}
        </ScrollView>

        {/* App Version (when expanded) */}
        {isExpanded && (
          <Animated.View
            style={{ opacity: opacityAnim }}
            className="px-4 py-2 border-t"
            style={{ borderTopColor: colors.glassBorder }}
          >
            <Text style={{ textAlign }} className="text-xs text-gray-400">
              {t('common.appVersion', 'Bayit+ v1.0.0')}
            </Text>
          </Animated.View>
        )}
      </GlassView>
    </Animated.View>
    </>
  );
};

export default GlassSidebar;
