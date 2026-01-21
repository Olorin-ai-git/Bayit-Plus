import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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
    <View className="relative justify-center items-center z-[9999]">
      <TouchableOpacity
        ref={buttonRef as any}
        onPress={handleOpenDropdown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-10 h-10 justify-center items-center rounded-lg bg-white/5 border ${isFocused ? 'border-purple-500 bg-purple-600/30' : 'border-transparent'} overflow-hidden`}
      >
        {user?.avatar ? (
          <Image source={{ uri: user.avatar }} className="w-9 h-9 rounded" />
        ) : (
          <Ionicons name="person" size={20} color={colors.text} />
        )}
      </TouchableOpacity>

      {isOpen && Platform.OS === 'web' && typeof document !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <TouchableOpacity
            className="fixed top-0 left-0 right-0 bottom-0 bg-transparent z-[9998]"
            activeOpacity={1}
            onPress={() => setIsOpen(false)}
          />
          {/* Dropdown */}
          <Animated.View
            className="fixed w-[280px] z-[10000]"
            style={{
              opacity: fadeAnim,
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              right: dropdownPosition.right,
            }}
          >
            <GlassView intensity="high" className="p-4 rounded-lg">
              {/* User Info Section */}
              <View className="flex-row items-center gap-2 pb-4">
                {user?.avatar ? (
                  <Image source={{ uri: user.avatar }} className="w-12 h-12 rounded-full" />
                ) : (
                  <View className="w-12 h-12 rounded-full justify-center items-center" style={{ backgroundColor: getBadgeColor() }}>
                    <Text className="text-lg font-bold text-white">{getInitials()}</Text>
                  </View>
                )}
                <View className="flex-1 gap-0.5">
                  <Text className="text-base font-semibold text-white" numberOfLines={1}>
                    {user?.name || t('profile.guest', 'Guest')}
                  </Text>
                  <Text className="text-xs text-white/60" numberOfLines={1}>
                    {user?.email}
                  </Text>
                  {user?.subscription?.plan && (
                    <View className="self-start px-2 py-0.5 rounded mt-1" style={{ backgroundColor: `${getBadgeColor()}20` }}>
                      <Text className="text-[10px] font-semibold uppercase" style={{ color: getBadgeColor() }}>
                        {user.subscription.plan}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View className="h-px bg-white/10 my-2" />

              {/* Quick Actions */}
              <TouchableOpacity
                className="flex-row items-center gap-2 py-2 px-2 rounded-lg"
                onPress={() => handleNavigate('/profile')}
              >
                <Ionicons name="person" size={18} color={colors.textSecondary} />
                <Text className="flex-1 text-sm text-white">
                  {t('profile.dropdown.myProfile', 'My Profile')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center gap-2 py-2 px-2 rounded-lg"
                onPress={() => handleNavigate('/favorites')}
              >
                <Ionicons name="star" size={18} color={colors.warning} />
                <Text className="flex-1 text-sm text-white">
                  {t('profile.dropdown.favorites', 'Favorites')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-row items-center gap-2 py-2 px-2 rounded-lg"
                onPress={() => handleNavigate('/downloads')}
              >
                <Ionicons name="download" size={18} color={colors.primary} />
                <Text className="flex-1 text-sm text-white">
                  {t('profile.dropdown.downloads', 'Downloads')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>

              <View className="h-px bg-white/10 my-2" />

              {/* Logout */}
              <TouchableOpacity
                className="flex-row items-center gap-2 py-2 px-2 rounded-lg"
                onPress={handleLogout}
              >
                <Ionicons name="log-out" size={18} color={colors.error} />
                <Text className="text-sm text-red-500">
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

export default ProfileDropdown;
