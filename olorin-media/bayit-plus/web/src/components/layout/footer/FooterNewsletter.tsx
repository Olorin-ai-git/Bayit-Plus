/**
 * FooterNewsletter Component
 *
 * Email newsletter subscription form
 * Part of Footer - StyleSheet implementation for RN Web compatibility
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
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Mail, Send } from 'lucide-react';
import { GlassInput } from '@bayit/shared';

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
    <View style={styles.container}>
      {/* Title */}
      <Text style={[styles.title, isRTL && styles.textRTL]}>
        {t('footer.newsletter.title', 'Stay Updated')}
      </Text>

      {/* Success Message */}
      {subscribed ? (
        <Text style={styles.successText}>
          {t('footer.newsletter.success', 'Thanks for subscribing!')}
        </Text>
      ) : (
        /* Newsletter Form */
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputWrapper}>
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
            style={({ pressed }) => [
              styles.subscribeButton,
              pressed && styles.subscribeButtonPressed,
            ]}
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

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  textRTL: {
    textAlign: 'right',
  },
  successText: {
    fontSize: 11,
    color: '#4ade80', // green-400
    fontWeight: '500',
  },
  form: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inputWrapper: {
    width: 160,
  },
  subscribeButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#a855f7', // purple-500
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribeButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.95 }],
  },
});
