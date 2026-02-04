/**
 * Mobile Bottom Navigation
 *
 * Fixed bottom navigation bar for mobile devices with 5 main tabs.
 * Provides quick access to core features with safe area handling and RTL support.
 */

import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { useMobileLayoutStore } from '@/stores/mobileLayoutStore';
import { colors, spacing } from '@olorin/design-tokens';
import { renderIcon } from '@olorin/shared-icons/web';
import { TOUCH_TARGET } from '@/utils/responsive/breakpoints';

interface TabItem {
  id: string;
  icon: string;
  labelKey: string;
  path: string;
}

const tabs: TabItem[] = [
  { id: 'home', icon: 'home', labelKey: 'nav.home', path: '/' },
  { id: 'search', icon: 'search', labelKey: 'nav.search', path: '/search' },
  { id: 'live', icon: 'live', labelKey: 'nav.liveTV', path: '/live' },
  { id: 'vod', icon: 'vod', labelKey: 'nav.vod', path: '/vod' },
  { id: 'more', icon: 'menu', labelKey: 'nav.more', path: '/settings' },
];

export default function MobileBottomNav() {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentTab } = useMobileLayoutStore();

  const handleTabPress = (tab: TabItem) => {
    setCurrentTab(tab.id);
    navigate(tab.path);
  };

  const isActiveTab = (tab: TabItem): boolean => {
    if (tab.path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(tab.path);
  };

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      <View style={styles.content}>
        {tabs.map((tab) => {
          const isActive = isActiveTab(tab);
          return (
            <Pressable
              key={tab.id}
              onPress={() => handleTabPress(tab)}
              style={({ pressed }) => [
                styles.tab,
                pressed && styles.tabPressed,
                isActive && styles.tabActive,
              ]}
            >
              <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
                {renderIcon(tab.icon, 'md', 'navigation')}
              </View>
              <Text
                style={[
                  styles.label,
                  isActive && styles.labelActive,
                ]}
                numberOfLines={1}
              >
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'fixed' as any,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 200,
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    backgroundColor: 'rgba(10, 10, 20, 0.85)',
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    // Safe area handling for home indicator
    paddingBottom: 'env(safe-area-inset-bottom, 0px)' as any,
    // @ts-ignore - Web CSS
    boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.3)',
  },
  containerRTL: {
    flexDirection: 'row-reverse',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    minHeight: 64,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: TOUCH_TARGET.MIN_SIZE,
    minHeight: TOUCH_TARGET.MIN_SIZE,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: spacing.sm,
  },
  tabPressed: {
    opacity: 0.7,
  },
  tabActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  iconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  iconContainerActive: {
    // Icon receives active state through renderIcon color
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
});
