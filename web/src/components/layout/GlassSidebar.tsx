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
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useModeEnforcement } from '@bayit/shared-hooks';
import { GlassButton } from '@bayit/shared/ui';
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
      { id: 'plans', icon: '💎', labelKey: 'nav.plans', path: '/subscribe' },
      { id: 'liveTV', icon: '📺', labelKey: 'nav.liveTV', path: '/live' },
      { id: 'epg', icon: '📅', labelKey: 'nav.epg', path: '/epg' },
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
      { id: 'games', icon: '🎮', labelKey: 'nav.games', path: '/games' },
      { id: 'friends', icon: '👥', labelKey: 'nav.friends', path: '/friends' },
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
    ],
  },
  {
    titleKey: 'nav.settings',
    items: [
      { id: 'settings', icon: '⚙️', labelKey: 'nav.settings', path: '/settings' },
      { id: 'support', icon: '🎧', labelKey: 'nav.support', path: '/support' },
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

  // Sidebar is always visible - collapsed shows icons only, expanded shows full menu
  // Web uses narrower sidebar than TV
  const collapsedWidth = IS_TV_BUILD ? 80 : 64;
  const expandedWidth = IS_TV_BUILD ? 280 : 220;
  const minWidth = collapsedWidth;
  const maxWidth = IS_TV_BUILD ? 350 : 300;

  const [customWidth, setCustomWidth] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);

  const currentWidth = customWidth ?? (isExpanded ? expandedWidth : collapsedWidth);
  const widthAnim = useRef(new Animated.Value(currentWidth)).current;
  const opacityAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  const sloganOpacityAnim = useRef(new Animated.Value(0)).current;
  const [focusedItem, setFocusedItem] = useState<string | null>(null);
  const [pageLoaded, setPageLoaded] = useState(false);
  // Debounce to prevent double-toggle from onPress + onClick firing together
  const lastToggleTime = useRef<number>(0);

  // Handle drag to resize (web only)
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (IS_TV_BUILD) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = customWidth ?? (isExpanded ? expandedWidth : collapsedWidth);
  }, [customWidth, isExpanded, expandedWidth, collapsedWidth]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = isRTL ? (dragStartX.current - e.clientX) : (e.clientX - dragStartX.current);
      const newWidth = Math.min(maxWidth, Math.max(minWidth, dragStartWidth.current + delta));
      setCustomWidth(newWidth);
      widthAnim.setValue(newWidth);

      // Update opacity based on width
      const opacity = newWidth > collapsedWidth + 20 ? 1 : 0;
      opacityAnim.setValue(opacity);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Snap to collapsed or expanded if close to those values
      if (customWidth !== null) {
        if (customWidth < collapsedWidth + 30) {
          setCustomWidth(null);
          if (isExpanded) onToggle();
        } else if (customWidth > expandedWidth - 30 && customWidth < expandedWidth + 30) {
          setCustomWidth(null);
          if (!isExpanded) onToggle();
        }
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isRTL, customWidth, isExpanded, onToggle, widthAnim, opacityAnim, collapsedWidth, expandedWidth, minWidth, maxWidth]);

  // Debounced toggle handler
  const handleToggle = useCallback(() => {
    const now = Date.now();
    if (now - lastToggleTime.current < 300) {
      return;
    }
    lastToggleTime.current = now;
    onToggle();
  }, [onToggle]);

  // Dynamically add menu items based on user role and subscription
  const menuSections = useMemo(() => {
    const isAdmin = user?.role === 'admin';
    const isPremium = user?.subscription?.plan === 'premium' || user?.subscription?.plan === 'family';

    let sections = baseMenuSections.map(section => {
      // Add My Recordings to favorites section (premium only)
      if (section.titleKey === 'nav.favorites' && isPremium) {
        // Add recordings after downloads
        const downloadIndex = section.items.findIndex(item => item.id === 'downloads');
        const newItems = [...section.items];
        newItems.splice(downloadIndex + 1, 0, {
          id: 'recordings',
          icon: '⏺️',
          labelKey: 'nav.recordings',
          path: '/recordings'
        });
        return {
          ...section,
          items: newItems,
        };
      }

      // Add Admin to settings section (admin only)
      if (section.titleKey === 'nav.settings' && isAdmin) {
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

    return sections;
  }, [user?.role, user?.subscription?.plan]);

  // Show slogan after page loads
  useEffect(() => {
    const handleLoad = () => {
      setTimeout(() => {
        setPageLoaded(true);
        Animated.timing(sloganOpacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      }, 500); // Show slogan 500ms after page load
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [sloganOpacityAnim]);

  // Reset custom width when toggling
  useEffect(() => {
    if (!isDragging) {
      setCustomWidth(null);
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
    }
  }, [isExpanded]);

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
      return isExpanded ? '◀' : '▶';
    } else {
      return isExpanded ? '▶' : '◀';
    }
  };

  // Show labels when width is large enough
  const showLabels = customWidth !== null ? customWidth > collapsedWidth + 40 : isExpanded;

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

          {/* Draggable Splitter (web only) */}
          {!IS_TV_BUILD && (
            <div
              onMouseDown={handleDragStart as any}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                [isRTL ? 'left' : 'right']: 0,
                width: 6,
                cursor: isDragging ? 'grabbing' : 'col-resize',
                zIndex: 200,
                backgroundColor: isDragging ? 'rgba(168, 85, 247, 0.6)' : 'transparent',
                transition: isDragging ? 'none' : 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isDragging) (e.target as HTMLDivElement).style.backgroundColor = 'rgba(107, 33, 168, 0.3)';
              }}
              onMouseLeave={(e) => {
                if (!isDragging) (e.target as HTMLDivElement).style.backgroundColor = 'transparent';
              }}
            />
          )}

          {/* Toggle Button - Glass Button at edge, half overflowing */}
          <View style={[
            styles.toggleButtonContainer,
            isRTL ? { left: -20 } : { right: -20 },
          ]}>
            <GlassButton
              title={getToggleIcon()}
              onPress={isUIInteractionEnabled ? handleToggle : undefined}
              variant="secondary"
              size="sm"
              style={styles.toggleGlassButton}
              disabled={!isUIInteractionEnabled}
            />
          </View>

          {/* Logo Section - placeholder maintained when collapsed */}
          <View style={styles.logoSection}>
            {showLabels ? (
              <>
                <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Image
                    source={{ uri: '/assets/images/logos/logo-transparent.png' }}
                    style={[
                      styles.houseLogo,
                      styles.houseLogoExpanded,
                    ]}
                    resizeMode="cover"
                  />
                </Link>
                <Animated.View
                  style={[
                    styles.sloganContainer,
                    { opacity: sloganOpacityAnim },
                  ]}
                >
                  <Text style={styles.sloganText}>
                    {t('common.slogan', 'Your Home. Anywhere.')}
                  </Text>
                </Animated.View>
              </>
            ) : (
              <View style={styles.logoPlaceholder} />
            )}
          </View>

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
                justifyContent: showLabels ? 'flex-start' : 'center',
                paddingHorizontal: showLabels ? spacing.sm : 0,
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
            {showLabels && (
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
                {section.titleKey && showLabels && (
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
                    {showLabels && (
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
          {showLabels && (
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
    overflow: 'visible',
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
  toggleButtonContainer: {
    position: 'absolute',
    top: spacing.xl * 2,
    zIndex: 9999,
  },
  toggleGlassButton: {
    width: 44,
    height: 44,
    minWidth: 44,
    paddingHorizontal: 0,
    opacity: 0.5,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 0,
    paddingBottom: spacing.xs,
    marginBottom: 0,
  },
  houseLogo: {
    transition: 'width 0.3s, height 0.3s',
  } as any,
  houseLogoExpanded: {
    width: 140,
    height: 140,
  },
  logoPlaceholder: {
    width: 48,
    height: 180, // Same height as expanded logo to maintain spacing
  },
  sloganContainer: {
    marginBottom: 20,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(147, 51, 234, 0.4)',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: 'center',
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  } as any,
  sloganText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    letterSpacing: 0.8,
    // @ts-ignore - Web CSS
    backgroundImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(192, 132, 252, 0.9) 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  } as any,
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
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderColor: colors.primary,
    borderWidth: 3,
  },
  userAvatar: {
    width: IS_TV_BUILD ? 56 : 48,
    height: IS_TV_BUILD ? 56 : 48,
    borderRadius: IS_TV_BUILD ? 28 : 24,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
    position: 'relative',
    overflow: 'hidden',
  },
  userAvatarAuthenticated: {
    // Keep same styling for authenticated users
  },
  userAvatarText: {
    fontSize: IS_TV_BUILD ? 24 : 20,
    fontWeight: '700',
    color: colors.primary,
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
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
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
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
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  menuItemFocused: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderWidth: 1,
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
