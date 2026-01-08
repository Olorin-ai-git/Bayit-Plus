import React, { useState, useRef, useEffect } from 'react';
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

const menuSections: MenuSection[] = [
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
  const widthAnim = useRef(new Animated.Value(isExpanded ? 280 : 80)).current;
  const opacityAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const [currentRoute, setCurrentRoute] = useState<string>(activeRoute || 'Home');

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
        toValue: isExpanded ? 280 : 80,
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
              {section.titleKey && isExpanded && (
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
                    { flexDirection: isRTL ? 'row' : 'row-reverse' },
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
                        { textAlign, marginRight: isRTL ? 0 : spacing.sm, marginLeft: isRTL ? spacing.sm : 0 },
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

              {/* Section Divider */}
              {sectionIndex < menuSections.length - 1 && (
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
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
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
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
    position: 'relative',
  },
  menuItemActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  menuItemFocused: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  iconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
  },
  menuIconActive: {
    // Active state for icon
  },
  menuLabel: {
    fontSize: 16,
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
