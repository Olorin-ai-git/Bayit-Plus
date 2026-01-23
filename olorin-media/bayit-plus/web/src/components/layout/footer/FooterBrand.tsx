/**
 * FooterBrand Component
 *
 * Displays brand identity, contact information, and social media links
 * Part of Footer - StyleSheet implementation for RN Web compatibility
 *
 * Features:
 * - AnimatedLogo from @bayit/shared
 * - Contact info (email, phone)
 * - Social platform links
 * - Cross-platform touch targets (44x44pt iOS, 48x48dp Android)
 * - RTL support for Hebrew/Arabic
 * - Accessibility labels for screen readers
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
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
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      {/* Logo */}
      <Link to="/" style={{ textDecoration: 'none' }}>
        <View style={styles.logoContainer}>
          <AnimatedLogo size="medium" hideHouse={true} />
        </View>
      </Link>

      {/* Brand Description */}
      <Text style={[styles.description, isRTL && styles.textRTL]}>
        {t(
          'footer.brandDescription',
          'Your home in the USA. TV broadcasts, VOD, radio and podcasts in Hebrew.'
        )}
      </Text>

      {/* Contact Info */}
      <View style={styles.contactInfo}>
        {/* Email */}
        <View style={styles.contactItem}>
          <Mail size={14} color="rgba(255, 255, 255, 0.4)" />
          <Text style={styles.contactText}>support@bayitplus.com</Text>
        </View>

        {/* Phone */}
        <View style={styles.contactItem}>
          <Phone size={14} color="rgba(255, 255, 255, 0.4)" />
          <Text style={styles.contactText}>1-800-BAYIT-TV</Text>
        </View>
      </View>

      {/* Social Links */}
      <View style={styles.socialLinks}>
        {socialPlatforms.map((social) => {
          const IconComponent = social.icon;
          return (
            <Pressable
              key={social.key}
              onPress={() => window.open(social.url, '_blank')}
              style={({ pressed }) => [
                styles.socialButton,
                pressed && styles.socialButtonPressed,
              ]}
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

const styles = StyleSheet.create({
  container: {
    minWidth: 180,
    gap: 8,
  },
  containerMobile: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 8,
  },
  description: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
  textRTL: {
    textAlign: 'right',
  },
  contactInfo: {
    gap: 4,
    marginTop: 8,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  socialButton: {
    width: 44,
    height: 44,
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transform: [{ scale: 0.95 }],
  },
});

// Export default platforms for reuse
export { SOCIAL_PLATFORMS };
