/**
 * SidebarUserProfile Component
 *
 * User profile section for GlassSidebar with avatar, name, and subscription badge
 * Part of GlassSidebar migration from StyleSheet to TailwindCSS
 *
 * Features:
 * - User avatar with initial fallback
 * - Online status indicator
 * - Subscription plan badge (Premium/Basic)
 * - Login prompt for guests
 * - RTL layout support
 * - 48x48pt touch target (iOS HIG compliant)
 */

import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { platformClass } from '../../../utils/platformClass';

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
      className={platformClass(
        `flex-row items-center py-2 mx-1 rounded-lg border border-transparent ${
          showLabels ? 'justify-start px-2' : 'justify-center px-0'
        } ${
          focusedItem === 'profile-section'
            ? 'bg-purple-700/30 border-purple-500 border-[3px]'
            : ''
        }`,
        `flex-row items-center py-2 mx-1 rounded-lg border border-transparent ${
          showLabels ? 'justify-start px-2' : 'justify-center px-0'
        } ${
          focusedItem === 'profile-section'
            ? 'bg-purple-700/30 border-purple-500 border-[3px]'
            : ''
        }`
      )}
    >
      <View
        className={platformClass(
          `bg-purple-700/30 justify-center items-center border-[3px] border-purple-500 relative overflow-hidden ${
            isAuthenticated ? '' : ''
          }`,
          `bg-purple-700/30 justify-center items-center border-[3px] border-purple-500 relative overflow-hidden ${
            isAuthenticated ? '' : ''
          }`
        )}
        style={{
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarRadius,
        }}
      >
        {user?.avatar ? (
          <Image
            source={{ uri: user.avatar }}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <Text
            className={platformClass(
              'font-bold text-purple-500',
              'font-bold text-purple-500'
            )}
            style={{ fontSize }}
          >
            {displayInitial}
          </Text>
        )}
        {isAuthenticated && (
          <View
            className={platformClass(
              'absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0a0a14]',
              'absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-[#0a0a14]'
            )}
          />
        )}
      </View>
      {showLabels && (
        <Animated.View
          style={{
            opacity: opacityAnim,
            flex: 1,
            marginStart: 16,
            paddingEnd: 8,
          }}
        >
          <Text
            className={platformClass(
              'text-base font-bold text-white mb-0.5',
              'text-base font-bold text-white mb-0.5'
            )}
            style={{ textAlign }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {isAuthenticated ? (
            <View
              className={platformClass(
                'self-start px-2 py-0.5 rounded bg-purple-700/30',
                'self-start px-2 py-0.5 rounded bg-purple-700/30'
              )}
            >
              <Text
                className={platformClass(
                  'text-[11px] text-purple-500 font-bold',
                  'text-[11px] text-purple-500 font-bold'
                )}
              >
                {subscriptionPlan === 'premium'
                  ? t('account.premium', 'Premium')
                  : t('account.basic', 'Basic')}
              </Text>
            </View>
          ) : (
            <Text
              className={platformClass(
                'text-xs text-white/60',
                'text-xs text-white/60'
              )}
              style={{ textAlign }}
            >
              {t('account.tapToLogin', 'Tap to login')}
            </Text>
          )}
        </Animated.View>
      )}
    </TouchableOpacity>
  );
}
