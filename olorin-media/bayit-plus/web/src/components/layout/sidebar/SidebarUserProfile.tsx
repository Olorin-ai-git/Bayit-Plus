/**
 * SidebarUserProfile Component
 *
 * User profile section for GlassSidebar with avatar, name, and subscription badge
 * Part of GlassSidebar - StyleSheet implementation for RN Web compatibility
 *
 * Features:
 * - User avatar with initial fallback
 * - Online status indicator
 * - Subscription plan badge (Premium/Basic)
 * - Login prompt for guests
 * - RTL layout support
 * - 48x48pt touch target (iOS HIG compliant)
 */

import { View, Text, TouchableOpacity, Image, Animated, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';

// Check if this is a TV build
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

const UserSchema = z.object({
  name: z.string().optional(),
  avatar: z.string().optional(),
  subscription: z.object({
    plan: z.string().optional(),
  }).optional(),
}).passthrough();

const SidebarUserProfilePropsSchema = z.object({
  user: UserSchema.nullable().optional(),
  isAuthenticated: z.boolean(),
  showLabels: z.boolean(),
  opacityAnim: z.instanceof(Animated.Value),
  textAlign: z.enum(['left', 'right', 'center']).optional(),
  focusedItem: z.string().nullable(),
  onNavigate: z.function().args(z.string()).returns(z.void()),
  onFocus: z.function().args(z.string()).returns(z.void()),
  onBlur: z.function().returns(z.void()),
});

type SidebarUserProfileProps = z.infer<typeof SidebarUserProfilePropsSchema>;

export default function SidebarUserProfile({
  user,
  isAuthenticated,
  showLabels,
  opacityAnim,
  textAlign = 'left',
  focusedItem,
  onNavigate,
  onFocus,
  onBlur,
}: SidebarUserProfileProps) {
  const { t } = useTranslation();

  const displayName = user?.name || t('account.guest', 'Guest');
  const displayInitial = displayName.charAt(0).toUpperCase();
  const subscriptionPlan = user?.subscription?.plan || 'basic';

  const handlePress = () => {
    if (isAuthenticated) {
      onNavigate('/profile');
    } else {
      onNavigate('/login');
    }
  };

  const avatarSize = IS_TV_BUILD ? 56 : 48;
  const avatarRadius = IS_TV_BUILD ? 28 : 24;
  const fontSize = IS_TV_BUILD ? 24 : 20;

  return (
    <TouchableOpacity
      onPress={handlePress}
      onFocus={() => onFocus('profile-section')}
      onBlur={onBlur}
      style={[
        styles.container,
        showLabels ? styles.containerExpanded : styles.containerCollapsed,
        focusedItem === 'profile-section' && styles.containerFocused,
      ]}
    >
      <View
        style={[
          styles.avatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarRadius,
          },
        ]}
      >
        {user?.avatar ? (
          <Image
            source={{ uri: user.avatar }}
            style={styles.avatarImage}
          />
        ) : (
          <Text style={[styles.avatarText, { fontSize }]}>
            {displayInitial}
          </Text>
        )}
        {isAuthenticated && (
          <View style={styles.onlineBadge} />
        )}
      </View>
      {showLabels && (
        <Animated.View style={[
          styles.userInfo,
          {
            opacity: opacityAnim,
          },
        ]}>
          <Text
            style={[styles.userName, { textAlign }]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {isAuthenticated ? (
            <View style={styles.subscriptionBadge}>
              <Text style={styles.subscriptionText}>
                {subscriptionPlan === 'premium'
                  ? t('account.premium', 'Premium')
                  : t('account.basic', 'Basic')}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  containerExpanded: {
    justifyContent: 'flex-start',
    paddingHorizontal: spacing.sm,
  },
  containerCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  containerFocused: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderColor: colors.primary.DEFAULT,
    borderWidth: 3,
  },
  avatar: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary.DEFAULT,
    position: 'relative',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontWeight: '700',
    color: colors.white,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success.DEFAULT,
    borderWidth: 2,
    borderColor: colors.background,
  },
  userInfo: {
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
    color: colors.primary.DEFAULT,
    fontWeight: 'bold',
  },
  loginPrompt: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
