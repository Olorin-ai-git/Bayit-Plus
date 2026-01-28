import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { GlassView, GlassPageHeader } from '@bayit/shared/ui';
import { Shield } from 'lucide-react';

export default function PrivacyPage() {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <GlassPageHeader
        title={t('nav.privacy', 'Privacy Policy')}
        pageType="privacy"
        isRTL={isRTL}
      />

      {/* Header Section */}
      <GlassView style={styles.headerSection}>
        <View style={styles.iconContainer}>
          <Shield size={48} color={colors.primary} />
        </View>
        <Text style={[styles.lastUpdated, { textAlign }]}>
          {t('privacy.lastUpdated', 'Last Updated: January 27, 2026')}
        </Text>
      </GlassView>

      {/* Content Sections */}
      <GlassView style={styles.contentSection}>
        {/* Introduction */}
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('privacy.intro.title', '1. Introduction')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('privacy.intro.content', 'Olorin.ai LLC ("we," "our," or "the Company") is committed to protecting your privacy. This Privacy Policy explains how our mobile application, Bayit+ (the "App"), collects, uses, and safeguards your information.')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('privacy.intro.commitment', 'We built Bayit+ with a "Privacy-First" architecture. We do not record your living room. Our technology uses your device\'s sensors solely to synchronize our audio service with your television.')}
        </Text>

        {/* Information Collection */}
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('privacy.collection.title', '2. Information We Collect & How We Use It')}
        </Text>

        <Text style={[styles.subsectionTitle, { textAlign }]}>
          {t('privacy.collection.camera.title', 'A. Camera & Visual Synchronization Data')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('privacy.collection.camera.intro', 'To provide our core service—synchronizing translated audio with your TV—Bayit+ requires access to your device\'s Camera.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          • {t('privacy.collection.camera.data', 'Data Collected: When you activate "Sync Mode," the App captures a short sequence of video frames (approximately 3 seconds) from your TV screen.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          • {t('privacy.collection.camera.purpose', 'Purpose: These frames are transmitted to our secure cloud server solely to identify the public TV channel you are watching and calculate the broadcast latency (time delay).')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          • {t('privacy.collection.camera.retention', 'Retention: This data is ephemeral. The frames are processed instantly in memory and are permanently deleted immediately after the synchronization is established. We do not view, store, or archive images of your home or family.')}
        </Text>

        <Text style={[styles.subsectionTitle, { textAlign }]}>
          {t('privacy.collection.audio.title', 'B. Audio Data (If Applicable)')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('privacy.collection.audio.intro', 'If you utilize features requiring audio synchronization, the App may request Microphone access.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          • {t('privacy.collection.audio.data', 'Data Collected: Brief audio samples of the TV broadcast.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          • {t('privacy.collection.audio.purpose', 'Purpose: To match the audio fingerprint of the public broadcast for synchronization purposes.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          • {t('privacy.collection.audio.retention', 'Retention: Like visual data, audio samples are processed in real-time and immediately deleted. We do not listen to or record user conversations.')}
        </Text>

        <Text style={[styles.subsectionTitle, { textAlign }]}>
          {t('privacy.collection.usage.title', 'C. Usage & Technical Data')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('privacy.collection.usage.content', 'We may collect non-identifiable technical data to improve App stability, including:')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          • {t('privacy.collection.usage.device', 'Device type and operating system version.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          • {t('privacy.collection.usage.crash', 'Crash logs and performance metrics.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          • {t('privacy.collection.usage.aggregate', 'Aggregate data on which channels are being watched (e.g., "50% of users are watching Channel 12").')}
        </Text>

        {/* Data Sharing */}
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('privacy.sharing.title', '3. Data Sharing and Third Parties')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('privacy.sharing.noSale', 'Olorin.ai LLC does not sell your personal data. We partner with trusted third-party service providers to deliver our infrastructure. These providers are authorized to use your data only as necessary to provide these services to us:')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          • {t('privacy.sharing.cloud', 'Cloud Infrastructure: Hosting services (e.g., AWS) to process synchronization requests.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          • {t('privacy.sharing.ai', 'AI Processing: Services used to generate real-time text and audio translations from public broadcast feeds.')}
        </Text>

        {/* Data Retention */}
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('privacy.retention.title', '4. Data Retention')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          • {t('privacy.retention.sync', 'Sync Data (Images/Audio): 0 days. Deleted immediately after processing.')}
        </Text>
        <Text style={[styles.bulletPoint, { textAlign }]}>
          • {t('privacy.retention.account', 'Account Data: Retained only as long as your account is active to manage your subscription and preferences.')}
        </Text>

        {/* Children Privacy */}
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('privacy.children.title', '5. Children\'s Privacy')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('privacy.children.content', 'While our content is suitable for all ages, Olorin.ai LLC does not knowingly collect personal identifiable information from children under the age of 13. If you are a parent and believe your child has provided us with personal information, please contact us.')}
        </Text>

        {/* User Rights */}
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('privacy.rights.title', '6. Your Rights')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('privacy.rights.content', 'Depending on your location, you may have the right to request access to, correction of, or deletion of your personal data. You may delete your Bayit+ account at any time within the App settings.')}
        </Text>

        {/* Contact */}
        <Text style={[styles.sectionTitle, { textAlign }]}>
          {t('privacy.contact.title', '7. Contact Us')}
        </Text>
        <Text style={[styles.paragraph, { textAlign }]}>
          {t('privacy.contact.intro', 'If you have any questions about this Privacy Policy, please contact us at:')}
        </Text>
        <Text style={[styles.contactText, { textAlign }]}>
          support@olorin.ai
        </Text>
        <Text style={[styles.contactText, { textAlign }]}>
          Olorin.ai LLC
        </Text>
      </GlassView>

      {/* App Info */}
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
  subsectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
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
    color: colors.primary,
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
