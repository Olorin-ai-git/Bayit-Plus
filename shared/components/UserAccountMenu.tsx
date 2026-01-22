import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import clsx from 'clsx';
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
    <View className="relative justify-center items-center">
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={clsx(
          "w-11 h-11 justify-center items-center rounded-lg bg-white/5 border overflow-hidden",
          isFocused ? "border-purple-500" : "border-transparent"
        )}
      >
        <View className={clsx(
          "w-9 h-9 rounded-md justify-center items-center",
          isAuthenticated ? "bg-purple-500" : "bg-white/15"
        )}>
          <Text className={clsx(
            "text-lg font-bold",
            isAuthenticated ? "text-black" : "text-white/80"
          )}>
            {displayName.charAt(0).toUpperCase() || '👤'}
          </Text>
        </View>
        {isAuthenticated && (
          <View className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-black" />
        )}
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          className={clsx(
            "flex-1 bg-black/50 justify-start pt-[70px]",
            isRTL ? "items-start pl-12" : "items-end pr-12"
          )}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <Animated.View
            className="w-[280px]"
            style={{ opacity: fadeAnim }}
          >
            <GlassView intensity="high" className="p-6 rounded-2xl">
              {/* User Info Section */}
              <View className="flex-col items-center py-4">
                <View className="w-16 h-16 rounded-full bg-purple-500 justify-center items-center mb-4">
                  <Text className="text-2xl font-bold text-black">
                    {displayName.charAt(0).toUpperCase() || '👤'}
                  </Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-bold text-white mb-0.5 text-center">{displayName}</Text>
                  <Text className="text-sm text-white/80 mb-2 text-center">{displayEmail}</Text>
                  <View className="self-center px-2 py-0.5 rounded-sm bg-purple-900/30">
                    <Text className="text-xs text-purple-500 font-bold">
                      {subscriptionPlan === 'premium' ? t('account.premium') : t('account.basic')}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Divider */}
              <View className="h-px bg-white/10 my-2" />

              {/* Menu Options */}
              <TouchableOpacity
                onPress={() => {
                  setIsOpen(false);
                  navigation.navigate('Profile', { tab: 'profile' });
                }}
                className={clsx(
                  "items-center py-2 px-2 rounded-lg",
                  isRTL ? "flex-row" : "flex-row-reverse"
                )}
              >
                <Text className={clsx("text-xl", isRTL ? "ml-4" : "mr-4")}>👤</Text>
                <Text className="text-base text-white">{t('account.personalDetails')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setIsOpen(false);
                  navigation.navigate('Profile', { tab: 'billing' });
                }}
                className={clsx(
                  "items-center py-2 px-2 rounded-lg",
                  isRTL ? "flex-row" : "flex-row-reverse"
                )}
              >
                <Text className={clsx("text-xl", isRTL ? "ml-4" : "mr-4")}>💳</Text>
                <Text className="text-base text-white">{t('account.billing')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setIsOpen(false);
                  navigation.navigate('Profile', { tab: 'subscription' });
                }}
                className={clsx(
                  "items-center py-2 px-2 rounded-lg",
                  isRTL ? "flex-row" : "flex-row-reverse"
                )}
              >
                <Text className={clsx("text-xl", isRTL ? "ml-4" : "mr-4")}>⭐</Text>
                <Text className="text-base text-white">{t('account.manageSubscription')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSettings}
                className={clsx(
                  "items-center py-2 px-2 rounded-lg",
                  isRTL ? "flex-row" : "flex-row-reverse"
                )}
              >
                <Text className={clsx("text-xl", isRTL ? "ml-4" : "mr-4")}>⚙️</Text>
                <Text className="text-base text-white">{t('account.settings')}</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View className="h-px bg-white/10 my-2" />

              {/* Login/Logout */}
              {isAuthenticated ? (
                <TouchableOpacity
                  onPress={handleLogout}
                  className={clsx(
                    "items-center py-2 px-2 rounded-lg mt-1",
                    isRTL ? "flex-row" : "flex-row-reverse"
                  )}
                >
                  <Text className={clsx("text-xl", isRTL ? "ml-4" : "mr-4")}>🚪</Text>
                  <Text className="text-base text-red-500">{t('account.logout')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleLogin}
                  className={clsx(
                    "items-center py-2 px-2 rounded-lg mt-1",
                    isRTL ? "flex-row" : "flex-row-reverse"
                  )}
                >
                  <Text className={clsx("text-xl", isRTL ? "ml-4" : "mr-4")}>🔑</Text>
                  <Text className="text-base text-purple-500">{t('account.login')}</Text>
                </TouchableOpacity>
              )}
            </GlassView>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default UserAccountMenu;
