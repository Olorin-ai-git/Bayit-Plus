import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Image, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { User, Star, Download, LogOut, ChevronRight } from 'lucide-react';
import { colors } from '../theme';

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
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    onNavigate(path);
  };

  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  const getInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getBadgeColor = () => {
    const plan = user?.subscription?.plan?.toLowerCase();
    if (plan === 'family') return '#A855F7';
    if (plan === 'premium') return '#F59E0B';
    return colors.primary;
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[styles.button, isFocused && styles.buttonFocused]}
        accessibilityLabel={t('profile.dropdown.myProfile', 'My Profile')}
      >
        {user?.avatar ? (
          <Image source={{ uri: user.avatar }} style={styles.avatar} />
        ) : (
          <User size={20} color={colors.text} />
        )}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={[styles.dropdown, isRTL ? styles.dropdownRTL : styles.dropdownLTR]}>
            <View style={styles.dropdownInner}>
              {/* User Info Section */}
              <View style={styles.userInfo}>
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} style={styles.userAvatar} />
                ) : (
                  <View style={[styles.userAvatarPlaceholder, { backgroundColor: getBadgeColor() }]}>
                    <Text style={styles.userInitials}>{getInitials()}</Text>
                  </View>
                )}
                <View style={styles.userDetails}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {user?.name || t('profile.guest', 'Guest')}
                  </Text>
                  <Text style={styles.userEmail} numberOfLines={1}>
                    {user?.email}
                  </Text>
                  {user?.subscription?.plan && (
                    <View style={[styles.badge, { backgroundColor: `${getBadgeColor()}20` }]}>
                      <Text style={[styles.badgeText, { color: getBadgeColor() }]}>
                        {user.subscription.plan}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              {/* Menu Items */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigate('/profile')}
              >
                <User size={18} color={colors.textSecondary} />
                <Text style={styles.menuItemText}>
                  {t('profile.dropdown.myProfile', 'My Profile')}
                </Text>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigate('/favorites')}
              >
                <Star size={18} color={colors.warning} />
                <Text style={styles.menuItemText}>
                  {t('profile.dropdown.favorites', 'Favorites')}
                </Text>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleNavigate('/downloads')}
              >
                <Download size={18} color={colors.primary} />
                <Text style={styles.menuItemText}>
                  {t('profile.dropdown.downloads', 'Downloads')}
                </Text>
                <ChevronRight size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Logout */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleLogout}
              >
                <LogOut size={18} color={colors.error} />
                <Text style={[styles.menuItemText, styles.logoutText]}>
                  {t('profile.dropdown.signOut', 'Sign Out')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  buttonFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 4,
  },
  backdrop: {
    ...Platform.select({
      web: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
      default: {
        flex: 1,
      },
    }),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dropdown: {
    ...Platform.select({
      web: {
        position: 'absolute',
        top: 70,
        width: 280,
      },
      default: {
        width: 320,
        maxWidth: '90%',
        marginTop: 80,
      },
    }),
  },
  dropdownLTR: {
    ...Platform.select({
      web: {
        right: 90,
      },
      default: {
        alignSelf: 'flex-end',
        marginRight: 20,
      },
    }),
  },
  dropdownRTL: {
    ...Platform.select({
      web: {
        left: 90,
      },
      default: {
        alignSelf: 'flex-start',
        marginLeft: 20,
      },
    }),
  },
  dropdownInner: {
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    padding: 16,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        // @ts-ignore
        WebkitBackdropFilter: 'blur(20px)',
      },
    }),
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  userDetails: {
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
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  menuItemText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  logoutText: {
    color: colors.error,
  },
});

export default ProfileDropdown;
