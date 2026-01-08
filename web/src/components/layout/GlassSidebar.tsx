/**
 * GlassSidebar for Web (React Router version)
 *
 * Collapsible sidebar navigation with glassmorphism effect.
 * Uses React Router for navigation instead of React Navigation.
 * Supports TV remote control with focus states.
 */

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
import { useNavigate, useLocation } from 'react-router-dom';
import { GlassView } from '@bayit/shared/ui';
import { useModeEnforcement } from '@bayit/shared-hooks';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { useDirection } from '@/hooks/useDirection';
import { useAuthStore } from '@bayit/shared-stores/authStore';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

interface GlassSidebarProps {
  isExpanded: boolean;
  onToggle: () => void;
}

interface MenuItem {
  id: string;
  icon: string;
  labelKey: string;
  path?: string;
}

interface MenuSection {
  titleKey?: string;
  items: MenuItem[];
}

// Base menu sections (without admin - that's added dynamically based on user role)
const baseMenuSections: MenuSection[] = [
  {
    items: [
      { id: 'home', icon: '🏠', labelKey: 'nav.home', path: '/' },
      { id: 'liveTV', icon: '📺', labelKey: 'nav.liveTV', path: '/live' },
      { id: 'vod', icon: '🎬', labelKey: 'nav.vod', path: '/vod' },
      { id: 'radio', icon: '📻', labelKey: 'nav.radio', path: '/radio' },
      { id: 'podcasts', icon: '🎙️', labelKey: 'nav.podcasts', path: '/podcasts' },
    ],
  },
  {
    titleKey: 'nav.discover',
    items: [
      { id: 'flows', icon: '✨', labelKey: 'nav.flows', path: '/flows' },
      { id: 'judaism', icon: '✡️', labelKey: 'nav.judaism', path: '/judaism' },
      { id: 'children', icon: '👶', labelKey: 'nav.children', path: '/children' },
    ],
  },
  {
    titleKey: 'nav.favorites',
    items: [
      { id: 'favorites', icon: '⭐', labelKey: 'nav.favorites', path: '/favorites' },
      { id: 'watchlist', icon: '📋', labelKey: 'nav.watchlist', path: '/watchlist' },
      { id: 'downloads', icon: '⬇️', labelKey: 'nav.downloads', path: '/downloads' },
    ],
  },
  {
    titleKey: 'nav.account',
    items: [
      { id: 'profile', icon: '👤', labelKey: 'nav.profile', path: '/profile' },
      { id: 'subscribe', icon: '💎', labelKey: 'nav.subscribe', path: '/subscribe' },
    ],
  },
];

export const GlassSidebar: React.FC<GlassSidebarProps> = ({ isExpanded, onToggle }) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { isUIInteractionEnabled } = useModeEnforcement();
  const widthAnim = useRef(new Animated.Value(isExpanded ? 280 : 80)).current;
  const opacityAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  const [focusedItem, setFocusedItem] = useState<string | null>(null);

  // Dynamically add Admin menu item if user is admin
  const menuSections = useMemo(() => {
    const isAdmin = user?.role === 'admin';
    if (!isAdmin) return baseMenuSections;

    // Add Admin to account section
    return [
      ...baseMenuSections.slice(0, -1),
      {
        titleKey: 'nav.account',
        items: [
          { id: 'admin', icon: '👨‍💼', labelKey: 'nav.admin', path: '/admin' },
          ...baseMenuSections[baseMenuSections.length - 1].items,
        ],
      },
    ];
  }, [user?.role]);

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
  }, [isExpanded, widthAnim, opacityAnim]);

  const handleItemPress = (item: MenuItem) => {
    // Respect mode enforcement - only allow clicks in allowed modes
    if (!isUIInteractionEnabled) {
      return;
    }
    if (item.path) {
      navigate(item.path);
      // Collapse sidebar after navigation on TV
      if (IS_TV_BUILD && isExpanded) {
        onToggle();
      }
    }
  };

  const isActive = (item: MenuItem) => {
    if (!item.path) return false;
    if (item.path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(item.path);
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
            onPress={isUIInteractionEnabled ? onToggle : undefined}
            disabled={!isUIInteractionEnabled}
            style={[
              styles.toggleButton,
              !isUIInteractionEnabled && { pointerEvents: 'none' },
            ]}
            onFocus={() => setFocusedItem('toggle')}
            onBlur={() => setFocusedItem(null)}
          >
            <View style={[
              styles.toggleIconContainer,
              focusedItem === 'toggle' && styles.toggleIconContainerFocused,
              !isUIInteractionEnabled && { opacity: 0.5 },
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
                    disabled={!isUIInteractionEnabled}
                    onFocus={() => setFocusedItem(item.id)}
                    onBlur={() => setFocusedItem(null)}
                    style={[
                      styles.menuItem,
                      { flexDirection: isRTL ? 'row' : 'row-reverse' },
                      isActive(item) && styles.menuItemActive,
                      focusedItem === item.id && styles.menuItemFocused,
                      !isUIInteractionEnabled && {
                        pointerEvents: 'none',
                        opacity: 0.5,
                      },
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
