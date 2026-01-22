/**
 * FooterBrand Component
 *
 * Displays brand identity, contact information, and social media links
 * Part of Footer migration from StyleSheet to TailwindCSS
 *
 * Features:
 * - AnimatedLogo from @bayit/shared
 * - Contact info (email, phone)
 * - Social platform links
 * - Cross-platform touch targets (44x44pt iOS, 48x48dp Android)
 * - RTL support for Hebrew/Arabic
 * - Accessibility labels for screen readers
 */

import { View, Text, Pressable } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  Phone,
} from 'lucide-react';
import { AnimatedLogo } from '@bayit/shared';
import { platformClass } from '../../../utils/platformClass';

// Zod schema for prop validation
const SocialPlatformSchema = z.object({
  icon: z.any(), // Lucide icon component
  url: z.string().url(),
  key: z.string(),
});

const FooterBrandPropsSchema = z.object({
  isMobile: z.boolean(),
  isRTL: z.boolean(),
  socialPlatforms: z.array(SocialPlatformSchema),
});

type FooterBrandProps = z.infer<typeof FooterBrandPropsSchema>;

const SOCIAL_PLATFORMS = [
  { icon: Facebook, url: 'https://facebook.com/bayitplus', key: 'facebook' },
  { icon: Twitter, url: 'https://twitter.com/bayitplus', key: 'twitter' },
  { icon: Instagram, url: 'https://instagram.com/bayitplus', key: 'instagram' },
  { icon: Youtube, url: 'https://youtube.com/bayitplus', key: 'youtube' },
];

export default function FooterBrand({
  isMobile = false,
  isRTL = false,
  socialPlatforms = SOCIAL_PLATFORMS,
}: Partial<FooterBrandProps>) {
  const { t } = useTranslation();

  // Validate props
  FooterBrandPropsSchema.partial().parse({ isMobile, isRTL, socialPlatforms });

  return (
    <View
      className={platformClass(
        `min-w-[180px] gap-2 ${isMobile ? 'items-center' : ''}`,
        `min-w-[180px] gap-2 ${isMobile ? 'items-center' : ''}`
      )}
    >
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none' }}>
        <View className={platformClass('mb-2')}>
          <AnimatedLogo size="medium" hideHouse={true} />
        </View>
      </Link>

      {/* Brand Description */}
      <Text
        className={platformClass(
          `text-xs text-white/60 leading-[18px] ${isRTL ? 'text-right' : 'text-left'}`,
          `text-xs text-white/60 leading-[18px] ${isRTL ? 'text-right' : 'text-left'}`
        )}
      >
        {t(
          'footer.brandDescription',
          'Your home in the USA. TV broadcasts, VOD, radio and podcasts in Hebrew.'
        )}
      </Text>

      {/* Contact Info */}
      <View className={platformClass('gap-1 mt-2')}>
        {/* Email */}
        <View className={platformClass('flex-row items-center gap-2')}>
          <Mail size={14} color="rgba(255, 255, 255, 0.4)" />
          <Text
            className={platformClass(
              'text-[11px] text-white/40',
              'text-[11px] text-white/40'
            )}
          >
            support@bayitplus.com
          </Text>
        </View>

        {/* Phone */}
        <View className={platformClass('flex-row items-center gap-2')}>
          <Phone size={14} color="rgba(255, 255, 255, 0.4)" />
          <Text
            className={platformClass(
              'text-[11px] text-white/40',
              'text-[11px] text-white/40'
            )}
          >
            1-800-BAYIT-TV
          </Text>
        </View>
      </View>

      {/* Social Links */}
      <View className={platformClass('flex-row gap-2 mt-4')}>
        {socialPlatforms.map((social) => {
          const IconComponent = social.icon;
          return (
            <Pressable
              key={social.key}
              onPress={() => window.open(social.url, '_blank')}
              className={platformClass(
                'w-11 h-11 rounded-full bg-white/[0.05] border border-white/10 justify-center items-center active:bg-white/[0.15] active:scale-95',
                'w-11 h-11 rounded-full bg-white/[0.05] border border-white/10 justify-center items-center'
              )}
              accessibilityLabel={t(`footer.social.${social.key}`)}
              accessibilityRole="button"
              // Touch target: 44x44pt (iOS), 48x48dp (Android) ✓
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <IconComponent size={16} color="rgba(255, 255, 255, 0.9)" />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Export default platforms for reuse
export { SOCIAL_PLATFORMS };
