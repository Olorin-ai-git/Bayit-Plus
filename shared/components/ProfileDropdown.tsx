import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from './ui';
import { colors, spacing, borderRadius } from '../theme';

// Web-only: createPortal for dropdown positioning
let createPortal: typeof import('react-dom').createPortal | null = null;
if (Platform.OS === 'web') {
  try {
    createPortal = require('react-dom').createPortal;
  } catch {
    // react-dom not available
  }
}

interface ProfileDropdownProps {
  user: {
    name?: string;
    email: string;
    avatar?: string;
    subscription?: {
      plan?: string;
      status?: string;
    };
  } | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({
  user,
  onNavigate,
  onLogout,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, right: 0 });
  const buttonRef = useRef<View>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const handleOpenDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const node = buttonRef.current as any;
      if (node && node.measure) {
        node.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
          setDropdownPosition({
            top: pageY + height + 8,
            left: isRTL ? undefined : (pageX - 200 + width),
            right: isRTL ? window.innerWidth - pageX - width : undefined,
          });
        });
      } else if (typeof document !== 'undefined') {
        const element = node as HTMLElement;
        if (element && element.getBoundingClientRect) {
          const rect = element.getBoundingClientRect();
          // Position dropdown to align right edge with button
          setDropdownPosition({
            top: rect.bottom + 8,
            left: isRTL ? undefined : (rect.right - 280),
            right: isRTL ? window.innerWidth - rect.right : undefined,
          });
        }
      }
    }
    setIsOpen(!isOpen);
  };

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    onNavigate(path);
  };

  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  // Get initials for avatar
  const getInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get subscription badge color
  const getBadgeColor = () => {
    const plan = user?.subscription?.plan?.toLowerCase();
    if (plan === 'family') return '#A855F7';
    if (plan === 'premium') return '#F59E0B';
    return colors.primary;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        ref={buttonRef as any}
        onPress={handleOpenDropdown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[styles.button, isFocused && styles.buttonFocused]}
      >
        {user?.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.buttonAvatar} />
        ) : (
          <Ionicons name="person" size={20} color={colors.text} />
        )}
      </TouchableOpacity>

      {isOpen && Platform.OS === 'web' && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          />
          {/* Dropdown */}
          <Animated.View
            style={[
              styles.dropdownContainer,
              {
                opacity: fadeAnim,
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                right: dropdownPosition.right,
              },
            ]}
          >
            <GlassView intensity="high" style={styles.dropdown}>
              {/* User Info Section */}
              <View style={styles.userSection}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.dropdownAvatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: getBadgeColor() }]}>
                    <Text style={styles.avatarText}>{getInitials()}</Text>
                  </View>
                )}
                <View style={styles.userInfo}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user?.name || t('profile.guest', 'Guest')}
                  </Text>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {user?.email}
                  </Text>
                  {user?.subscription?.plan && (
                    <View style={[styles.subscriptionBadge, { backgroundColor: `${getBadgeColor()}20` }]}>
                      <Text style={[styles.subscriptionText, { color: getBadgeColor() }]}>
                        {user.subscription.plan}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              {/* Quick Actions */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigate('/profile')}
              >
                <Ionicons name="person" size={18} color={colors.textSecondary} />
                <Text style={styles.menuItemText}>
                  {t('profile.dropdown.myProfile', 'My Profile')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigate('/favorites')}
              >
                <Ionicons name="star" size={18} color={colors.warning} />
                <Text style={styles.menuItemText}>
                  {t('profile.dropdown.favorites', 'Favorites')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigate('/downloads')}
              >
                <Ionicons name="download" size={18} color={colors.primary} />
                <Text style={styles.menuItemText}>
                  {t('profile.dropdown.downloads', 'Downloads')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Logout */}
              <TouchableOpacity
                style={styles.logoutItem}
                onPress={handleLogout}
              >
                <Ionicons name="log-out" size={18} color={colors.error} />
                <Text style={styles.logoutText}>
                  {t('profile.dropdown.signOut', 'Sign Out')}
                </Text>
              </TouchableOpacity>
            </GlassView>
          </Animated.View>
        </>,
        document.body
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  button: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  buttonFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  buttonAvatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
  },
  backdrop: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 9998,
  },
  dropdownContainer: {
    position: 'fixed' as any,
    width: 280,
    zIndex: 10000,
  },
  dropdown: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userEmail: {
    fontSize: 12,
    color: colors.textMuted,
  },
  subscriptionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  subscriptionText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  menuItemText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  logoutText: {
    fontSize: 14,
    color: colors.error,
  },
});

export default ProfileDropdown;
