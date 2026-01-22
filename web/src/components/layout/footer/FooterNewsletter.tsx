/**
 * FooterNewsletter Component
 *
 * Email newsletter subscription form
 * Part of Footer migration from StyleSheet to TailwindCSS
 *
 * Features:
 * - GlassInput from @bayit/shared for email entry
 * - Submit button with Send icon
 * - Success feedback (3-second display)
 * - i18n support for all text
 * - RTL layout support
 * - Email validation
 * - Touch targets meet accessibility standards (44x44pt/48x48dp)
 */

import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Mail, Send } from 'lucide-react';
import { GlassInput } from '@bayit/shared';
import { platformClass } from '../../../utils/platformClass';

// Zod schema for prop validation
const FooterNewsletterPropsSchema = z.object({
  isRTL: z.boolean(),
});

type FooterNewsletterProps = z.infer<typeof FooterNewsletterPropsSchema>;

export default function FooterNewsletter({
  isRTL = false,
}: Partial<FooterNewsletterProps>) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  // Validate props
  FooterNewsletterPropsSchema.partial().parse({ isRTL });

  const handleSubscribe = () => {
    if (email.trim()) {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return;
      }

      // Show success message
      setSubscribed(true);
      setEmail('');

      // Reset after 3 seconds
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <View className={platformClass('gap-2')}>
      {/* Title */}
      <Text
        className={platformClass(
          `text-xs font-semibold text-white ${isRTL ? 'text-right' : 'text-left'}`,
          `text-xs font-semibold text-white ${isRTL ? 'text-right' : 'text-left'}`
        )}
      >
        {t('footer.newsletter.title', 'Stay Updated')}
      </Text>

      {/* Success Message */}
      {subscribed ? (
        <Text
          className={platformClass(
            'text-[11px] text-green-400 font-medium',
            'text-[11px] text-green-400 font-medium'
          )}
        >
          {t('footer.newsletter.success', 'Thanks for subscribing!')}
        </Text>
      ) : (
        /* Newsletter Form */
        <View className={platformClass('flex-row gap-2 items-center')}>
          {/* Email Input */}
          <View className={platformClass('w-40')}>
            <GlassInput
              value={email}
              onChangeText={setEmail}
              placeholder={t(
                'footer.newsletter.placeholder',
                'Enter your email'
              )}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={{ marginBottom: 0 }}
              icon={<Mail size={16} color="rgba(255, 255, 255, 0.4)" />}
              accessibilityLabel={t(
                'footer.newsletter.emailLabel',
                'Email address for newsletter'
              )}
            />
          </View>

          {/* Subscribe Button */}
          <Pressable
            onPress={handleSubscribe}
            className={platformClass(
              'w-11 h-11 rounded-lg bg-purple-500 justify-center items-center active:opacity-90 active:scale-95',
              'w-11 h-11 rounded-lg bg-purple-500 justify-center items-center'
            )}
            accessibilityLabel={t('footer.newsletter.submit', 'Subscribe')}
            accessibilityRole="button"
            // Touch target: 44x44pt (iOS), 48x48dp (Android) ✓
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Send size={16} color="#000" />
          </Pressable>
        </View>
      )}
    </View>
  );
}
