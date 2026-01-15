import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { GlassView } from './ui';
import { colors, spacing, borderRadius } from '../theme';
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
      { id: 'help', icon: '❓', labelKey: 'nav.help', route: 'Help' },
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
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onToggle}
        />
      )}
      <Animated.View style={[
        styles.container,
        { width: widthAnim },
        isRTL ? { right: 0 } : { left: 0 },
      ]}>
        <GlassView intensity="low" style={[
          styles.sidebar,
          isRTL
            ? { borderLeftWidth: 1, borderLeftColor: colors.glassBorder }
            : { borderRightWidth: 1, borderRightColor: colors.glassBorder },
        ]}>
        {/* Toggle Button */}
        <TouchableOpacity
          onPress={onToggle}
          style={styles.toggleButton}
          onFocus={() => setFocusedItem('toggle')}
          onBlur={() => setFocusedItem(null)}
        >
          <View style={[
            styles.toggleIconContainer,
            focusedItem === 'toggle' && styles.toggleIconContainerFocused,
          ]}>
            <Text style={styles.toggleIcon}>{getToggleIcon()}</Text>
          </View>
        </TouchableOpacity>

        <ScrollView
          style={styles.menuContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.menuContent}
        >
          {menuSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              {/* Section Title (only when expanded and has title) */}
              {isExpanded && section.titleKey && (
                <Animated.Text
                  style={[
                    styles.sectionTitle,
                    { opacity: opacityAnim, textAlign },
                  ]}
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
                  style={[
                    styles.menuItem,
                    isActive(item) && styles.menuItemActive,
                    focusedItem === item.id && styles.menuItemFocused,
                  ]}
                >
                  <View style={styles.iconContainer}>
                    <Text style={[
                      styles.menuIcon,
                      isActive(item) && styles.menuIconActive,
                    ]}>
                      {item.icon}
                    </Text>
                  </View>
                  {isExpanded && (
                    <Animated.Text
                      style={[
                        styles.menuLabel,
                        { textAlign, marginStart: spacing.sm },
                        isActive(item) && styles.menuLabelActive,
                        { opacity: opacityAnim },
                      ]}
                      numberOfLines={1}
                    >
                      {t(item.labelKey)}
                    </Animated.Text>
                  )}
                  {isActive(item) && (
                    <View style={[
                      styles.activeIndicator,
                      isRTL ? { right: 0 } : { left: 0 },
                    ]} />
                  )}
                </TouchableOpacity>
              ))}

              {/* Section Divider (only when expanded) */}
              {isExpanded && sectionIndex < menuSections.length - 1 && (
                <View style={styles.divider} />
              )}
            </View>
          ))}
        </ScrollView>

        {/* App Version (when expanded) */}
        {isExpanded && (
          <Animated.View style={[styles.versionContainer, { opacity: opacityAnim }]}>
            <Text style={[styles.versionText, { textAlign }]}>{t('common.appVersion', 'Bayit+ v1.0.0')}</Text>
          </Animated.View>
        )}
      </GlassView>
    </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 99,
  },
  container: {
    height: '100%',
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 100,
  },
  sidebar: {
    flex: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  toggleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  toggleIconContainerFocused: {
    borderColor: colors.primary,
    borderWidth: 3,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  toggleIcon: {
    fontSize: 16,
    color: colors.text,
  },
  menuContainer: {
    flex: 1,
  },
  menuContent: {
    paddingHorizontal: spacing.sm,
  },
  section: {
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  menuItemFocused: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  iconContainer: {
    width: IS_TV_BUILD ? 48 : 36,
    height: IS_TV_BUILD ? 48 : 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: IS_TV_BUILD ? 24 : 18,
  },
  menuIconActive: {
    // Active state for icon
  },
  menuLabel: {
    fontSize: IS_TV_BUILD ? 16 : 14,
    color: colors.text,
    flex: 1,
  },
  menuLabelActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    top: '50%',
    marginTop: -12,
    width: 4,
    height: 24,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginVertical: spacing.md,
    marginHorizontal: spacing.md,
  },
  versionContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  versionText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

export default GlassSidebar;
