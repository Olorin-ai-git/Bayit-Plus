/**
 * GlassSidebar for Web (React Router version)
 *
 * Collapsible sidebar navigation with glassmorphism effect.
 * Uses React Router for navigation instead of React Navigation.
 * Supports TV remote control with focus states.
 */

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
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
      { id: 'widgets', icon: '🎯', labelKey: 'nav.widgets', path: '/widgets' },
    ],
  },
  {
    titleKey: 'nav.account',
    items: [
      { id: 'profile', icon: '👤', labelKey: 'nav.profile', path: '/profile' },
      { id: 'subscribe', icon: '💎', labelKey: 'nav.subscribe', path: '/subscribe' },
    ],
  },
  {
    titleKey: 'nav.settings',
    items: [
      { id: 'settings', icon: '⚙️', labelKey: 'nav.settings', path: '/settings' },
      { id: 'help', icon: '❓', labelKey: 'nav.help', path: '/help' },
    ],
  },
];

export const GlassSidebar: React.FC<GlassSidebarProps> = ({ isExpanded, onToggle }) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuthStore();
  const { isUIInteractionEnabled } = useModeEnforcement();

  // User display info
  const displayName = user?.name || t('account.guest', 'Guest');
  const displayInitial = displayName.charAt(0).toUpperCase();
  const subscriptionPlan = user?.subscription?.plan || 'basic';

  // Debug auth state
  console.log('[GlassSidebar] Auth state:', { isAuthenticated, user: user?.name, displayName });
  // Sidebar is always visible - collapsed shows icons only, expanded shows full menu
  const collapsedWidth = 80;
  const expandedWidth = 280;
  const widthAnim = useRef(new Animated.Value(isExpanded ? expandedWidth : collapsedWidth)).current;
  const opacityAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  // Debounce to prevent double-toggle from onPress + onClick firing together
  const lastToggleTime = useRef<number>(0);

  // Debounced toggle handler
  const handleToggle = useCallback(() => {
    const now = Date.now();
    if (now - lastToggleTime.current < 300) {
      return;
    }
    lastToggleTime.current = now;
    onToggle();
  }, [onToggle]);

  // Dynamically add Admin menu item if user is admin
  const menuSections = useMemo(() => {
    const isAdmin = user?.role === 'admin';
    if (!isAdmin) return baseMenuSections;

    // Add Admin to settings section (like TV app)
    return baseMenuSections.map(section => {
      if (section.titleKey === 'nav.settings') {
        return {
          ...section,
          items: [
            { id: 'admin', icon: '👨‍💼', labelKey: 'nav.admin', path: '/admin' },
            ...section.items,
          ],
        };
      }
      return section;
    });
  }, [user?.role]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(widthAnim, {
        toValue: isExpanded ? expandedWidth : collapsedWidth,
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
        handleToggle();
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
    <Animated.View style={[
      styles.container,
      { width: widthAnim },
      isRTL ? { right: 0, left: 'auto' } : { left: 0, right: 'auto' },
    ]}>
        <View style={[
          styles.sidebar,
          styles.glassEffect,
          isRTL
            ? { borderLeftWidth: 1, borderLeftColor: colors.glassBorder }
            : { borderRightWidth: 1, borderRightColor: colors.glassBorder },
        ]}>
          {/* Toggle Button */}
          <TouchableOpacity
            onPress={isUIInteractionEnabled ? handleToggle : undefined}
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

          {/* User Profile Section */}
          <TouchableOpacity
            onPress={() => {
              if (isAuthenticated) {
                navigate('/profile');
              } else {
                navigate('/login');
              }
            }}
            onFocus={() => setFocusedItem('profile-section')}
            onBlur={() => setFocusedItem(null)}
            style={[
              styles.userProfileSection,
              {
                justifyContent: isExpanded ? 'flex-start' : 'center',
                paddingHorizontal: isExpanded ? spacing.sm : 0,
              },
              focusedItem === 'profile-section' && styles.userProfileSectionFocused,
            ]}
          >
            <View style={[
              styles.userAvatar,
              isAuthenticated && styles.userAvatarAuthenticated,
            ]}>
              {user?.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={styles.userAvatarImage}
                />
              ) : (
                <Text style={styles.userAvatarText}>{displayInitial}</Text>
              )}
              {isAuthenticated && (
                <View style={styles.onlineBadge} />
              )}
            </View>
            {isExpanded && (
              <Animated.View style={[styles.userInfoContainer, { opacity: opacityAnim }]}>
                <Text style={[styles.userName, { textAlign }]} numberOfLines={1}>
                  {displayName}
                </Text>
                {isAuthenticated ? (
                  <View style={styles.subscriptionBadge}>
                    <Text style={styles.subscriptionText}>
                      {subscriptionPlan === 'premium' ? t('account.premium', 'Premium') : t('account.basic', 'Basic')}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.loginPrompt, { textAlign }]}>
                    {t('account.tapToLogin', 'Tap to login')}
                  </Text>
                )}
              </Animated.View>
            )}
          </TouchableOpacity>

          <View style={styles.profileDivider} />

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
        </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 100,
    overflow: 'hidden',
  },
  sidebar: {
    flex: 1,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  glassEffect: {
    backgroundColor: 'rgba(10, 10, 20, 0.3)',
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  } as any,
  toggleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    width: 80,
    alignSelf: 'center',
  },
  toggleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'transparent',
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
  userProfileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  userProfileSectionFocused: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderColor: colors.primary,
    borderWidth: 3,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
  },
  userAvatarAuthenticated: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  userAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: colors.background,
  },
  userInfoContainer: {
    flex: 1,
    marginStart: spacing.md,
    paddingEnd: spacing.sm,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
  },
  subscriptionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  subscriptionText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: 'bold',
  },
  loginPrompt: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  profileDivider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginVertical: spacing.sm,
    marginHorizontal: spacing.md,
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
