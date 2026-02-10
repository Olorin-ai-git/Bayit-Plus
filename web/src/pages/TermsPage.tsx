import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassView, GlassPageHeader } from '@bayit/shared/ui';
import { FileText } from 'lucide-react';

export default function TermsPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <GlassPageHeader
        title={t('nav.terms', 'Terms of Service')}
        pageType="terms"
        isRTL={isRTL}
      />

      <GlassView style={styles.headerSection}>
        <View style={styles.iconContainer}>
          <FileText size={48} color={colors.primary.DEFAULT} />
        </View>
        <Text style={[styles.lastUpdated, { textAlign }]}>
          {t('terms.lastUpdated', 'Last Updated: January 27, 2026')}
        </Text>
      </GlassView>

      <GlassView style={styles.contentSection}>
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('terms.acceptance.title', '1. Acceptance of Terms')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('terms.acceptance.content', 'By accessing or using Bayit+ (the "Service"), provided by Olorin.ai LLC ("we," "our," or "the Company"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Service.')}
        </Text>

        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('terms.description.title', '2. Service Description')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('terms.description.content', 'Bayit+ is a premium streaming platform offering live TV, video on demand (VOD), radio, podcasts, and audiobook content. The Service includes AI-powered features such as real-time dubbing, content recommendations, and interactive subtitles.')}
        </Text>

        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('terms.eligibility.title', '3. Eligibility')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('terms.eligibility.content', 'You must be at least 13 years old to create an account. If you are under 18, you must have parental or guardian consent to use the Service. By using Bayit+, you represent that you meet these eligibility requirements.')}
        </Text>

        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('terms.accounts.title', '4. User Accounts')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          {t('terms.accounts.registration', 'You must provide accurate and complete information when creating an account.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          {t('terms.accounts.security', 'You are responsible for maintaining the confidentiality of your account credentials.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          {t('terms.accounts.unauthorized', 'You must notify us immediately of any unauthorized use of your account.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          {t('terms.accounts.profiles', 'Your account may include multiple user profiles, subject to your subscription plan limits.')}
        </Text>

        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('terms.subscriptions.title', '5. Subscriptions and Payments')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('terms.subscriptions.billing', 'Bayit+ offers subscription plans billed on a recurring basis. Your subscription automatically renews at the end of each billing period unless cancelled before the renewal date.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          {t('terms.subscriptions.pricing', 'Pricing is subject to change with reasonable notice provided to active subscribers.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          {t('terms.subscriptions.refunds', 'Refunds are handled in accordance with applicable consumer protection laws and our refund policy.')}
        </Text>

        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('terms.content.title', '6. Content and Intellectual Property')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('terms.content.ownership', 'All content available through the Service, including video, audio, text, graphics, and software, is owned by or licensed to Olorin.ai LLC and is protected by intellectual property laws.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          {t('terms.content.license', 'We grant you a limited, non-exclusive, non-transferable license to access content for personal, non-commercial use.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          {t('terms.content.restrictions', 'You may not copy, distribute, modify, publicly display, or create derivative works from any content without our prior written consent.')}
        </Text>

        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('terms.conduct.title', '7. Acceptable Use')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('terms.conduct.intro', 'You agree not to:')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          {t('terms.conduct.circumvent', 'Circumvent, disable, or interfere with security-related features of the Service.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          {t('terms.conduct.scrape', 'Use automated systems to access or scrape content from the Service.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          {t('terms.conduct.share', 'Share your account credentials or allow unauthorized access to your account.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          {t('terms.conduct.illegal', 'Use the Service for any unlawful purpose or in violation of any applicable laws.')}
        </Text>

        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('terms.termination.title', '8. Termination')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('terms.termination.content', 'We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that we determine violates these Terms or is harmful to other users, third parties, or the business interests of Olorin.ai LLC.')}
        </Text>

        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('terms.disclaimer.title', '9. Disclaimers')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('terms.disclaimer.content', 'The Service is provided "as is" and "as available" without warranties of any kind. We do not guarantee that the Service will be uninterrupted, error-free, or free of harmful components.')}
        </Text>

        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('terms.liability.title', '10. Limitation of Liability')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('terms.liability.content', 'To the maximum extent permitted by law, Olorin.ai LLC shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.')}
        </Text>

        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('terms.governing.title', '11. Governing Law')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('terms.governing.content', 'These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions.')}
        </Text>

        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('terms.contact.title', '12. Contact Us')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('terms.contact.intro', 'If you have questions about these Terms of Service, please contact us at:')}
        </Text>
        <Text style={[styles.contactText, { textAlign }]}>
          support@olorin.ai
        </Text>
        <Text style={[styles.contactText, { textAlign }]}>
          Olorin.ai LLC
        </Text>
      </GlassView>

      <View style={styles.appInfoContainer}>
        <Text style={styles.appInfoText}>
          {t('common.appVersion', 'Bayit+ v1.0.0')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  headerSection: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  lastUpdated: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '600',
  },
  contentSection: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  paragraph: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginBottom: spacing.md,
    lineHeight: fontSize.base * 1.6,
  },
  bulletPoint: {
    fontSize: fontSize.base,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginLeft: spacing.md,
    lineHeight: fontSize.base * 1.6,
  },
  contactText: {
    fontSize: fontSize.base,
    color: colors.primary.DEFAULT,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  appInfoContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  appInfoText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
  },
});
