import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { GlassView } from './ui';
import { useAuthStore } from '../stores/authStore';
import { colors, spacing, borderRadius } from '../theme';
import { useDirection } from '../hooks/useDirection';

export const UserAccountMenu: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const navigation = useNavigation<any>();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    navigation.navigate('Login');
  };

  const handleLogin = () => {
    setIsOpen(false);
    navigation.navigate('Login');
  };

  const handleSettings = () => {
    setIsOpen(false);
    navigation.navigate('Profile');
  };

  // Display user info - use actual user or guest defaults
  const displayName = user?.name || t('account.guest');
  const displayEmail = user?.email || 'guest@bayit.plus';
  const subscriptionPlan = user?.subscription?.plan || 'basic';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[styles.button, isFocused && styles.buttonFocused]}
      >
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>
            {displayName.charAt(0).toUpperCase() || '👤'}
          </Text>
        </View>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={[
            styles.modalOverlay,
            isRTL
              ? { alignItems: 'flex-start', paddingLeft: spacing.xxl }
              : { alignItems: 'flex-end', paddingRight: spacing.xxl },
          ]}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <Animated.View
            style={[
              styles.dropdownContainer,
              { opacity: fadeAnim },
            ]}
          >
            <GlassView intensity="high" style={styles.dropdown}>
              {/* User Info Section */}
              <View style={styles.userSection}>
                <View style={styles.userAvatarPlaceholder}>
                  <Text style={styles.userAvatarText}>
                    {displayName.charAt(0).toUpperCase() || '👤'}
                  </Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{displayName}</Text>
                  <Text style={styles.userEmail}>{displayEmail}</Text>
                  <View style={styles.subscriptionBadge}>
                    <Text style={styles.subscriptionText}>
                      {subscriptionPlan === 'premium' ? t('account.premium') : t('account.basic')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Menu Options */}
              <TouchableOpacity
                onPress={() => {
                  setIsOpen(false);
                  navigation.navigate('Profile', { tab: 'profile' });
                }}
                style={[styles.menuOption, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}
              >
                <Text style={[styles.menuIcon, isRTL ? { marginLeft: spacing.md } : { marginRight: spacing.md }]}>👤</Text>
                <Text style={styles.menuText}>{t('account.personalDetails')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setIsOpen(false);
                  navigation.navigate('Profile', { tab: 'billing' });
                }}
                style={[styles.menuOption, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}
              >
                <Text style={[styles.menuIcon, isRTL ? { marginLeft: spacing.md } : { marginRight: spacing.md }]}>💳</Text>
                <Text style={styles.menuText}>{t('account.billing')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setIsOpen(false);
                  navigation.navigate('Profile', { tab: 'subscription' });
                }}
                style={[styles.menuOption, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}
              >
                <Text style={[styles.menuIcon, isRTL ? { marginLeft: spacing.md } : { marginRight: spacing.md }]}>⭐</Text>
                <Text style={styles.menuText}>{t('account.manageSubscription')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSettings}
                style={[styles.menuOption, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}
              >
                <Text style={[styles.menuIcon, isRTL ? { marginLeft: spacing.md } : { marginRight: spacing.md }]}>⚙️</Text>
                <Text style={styles.menuText}>{t('account.settings')}</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Login/Logout */}
              {isAuthenticated ? (
                <TouchableOpacity
                  onPress={handleLogout}
                  style={[styles.menuOption, styles.logoutOption, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}
                >
                  <Text style={[styles.menuIcon, isRTL ? { marginLeft: spacing.md } : { marginRight: spacing.md }]}>🚪</Text>
                  <Text style={[styles.menuText, styles.logoutText]}>{t('account.logout')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleLogin}
                  style={[styles.menuOption, styles.loginOption, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}
                >
                  <Text style={[styles.menuIcon, isRTL ? { marginLeft: spacing.md } : { marginRight: spacing.md }]}>🔑</Text>
                  <Text style={[styles.menuText, styles.loginText]}>{t('account.login')}</Text>
                </TouchableOpacity>
              )}
            </GlassView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  buttonFocused: {
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.background,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    paddingTop: 70,
  },
  dropdownContainer: {
    width: 280,
  },
  dropdown: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  userSection: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  userAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.background,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 2,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subscriptionBadge: {
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  subscriptionText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: colors.glassBorder,
    marginVertical: spacing.sm,
  },
  menuOption: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
  },
  menuIcon: {
    fontSize: 20,
  },
  menuText: {
    fontSize: 16,
    color: colors.text,
  },
  logoutOption: {
    marginTop: spacing.xs,
  },
  logoutText: {
    color: colors.error,
  },
  loginOption: {
    marginTop: spacing.xs,
  },
  loginText: {
    color: colors.primary,
  },
});

export default UserAccountMenu;
