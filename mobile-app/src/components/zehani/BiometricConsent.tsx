/**
 * BiometricConsent - Consent flow for biometric data collection (face capture).
 *
 * Explains data usage with privacy policy link, requires explicit acceptance
 * before any biometric processing can begin.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassButton, GlassCard } from '@olorin/glass-ui/native';
import { OlorinIcon } from '@olorin/icons/native';
import { Colors } from '../../theme/colors';
import logger from '@/utils/logger';

const consentLogger = logger.scope('BiometricConsent');

interface BiometricConsentProps {
  onAccept: () => void;
  onDecline: () => void;
  privacyPolicyUrl: string;
}

const CONSENT_POINTS = [
  'zehAni.biometricConsent.points.faceData',
  'zehAni.biometricConsent.points.encryption',
  'zehAni.biometricConsent.points.noThirdParty',
  'zehAni.biometricConsent.points.deletion',
] as const;

export const BiometricConsent: React.FC<BiometricConsentProps> = ({
  onAccept,
  onDecline,
  privacyPolicyUrl,
}) => {
  const { t } = useTranslation();
  const [acknowledged, setAcknowledged] = useState(false);

  const handlePrivacyLink = async () => {
    try {
      const canOpen = await Linking.canOpenURL(privacyPolicyUrl);
      if (canOpen) {
        await Linking.openURL(privacyPolicyUrl);
        consentLogger.info('Privacy policy opened');
      }
    } catch (err: unknown) {
      consentLogger.error('Failed to open privacy policy', { error: err });
    }
  };

  const handleAccept = () => {
    consentLogger.info('Biometric consent accepted');
    onAccept();
  };

  const handleDecline = () => {
    consentLogger.info('Biometric consent declined');
    onDecline();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.headerRow}>
        <OlorinIcon name="shield-check" size={32} color={Colors.Primary.p500} />
        <Text style={styles.title} accessibilityRole="header">
          {t('zehAni.biometricConsent.title')}
        </Text>
      </View>

      <Text style={styles.description}>
        {t('zehAni.biometricConsent.description')}
      </Text>

      <GlassCard style={styles.pointsCard}>
        {CONSENT_POINTS.map((pointKey) => (
          <View key={pointKey} style={styles.pointRow}>
            <OlorinIcon name="check-circle" size={18} color={Colors.Success.default} />
            <Text style={styles.pointText}
              accessibilityRole="text">
              {t(pointKey)}
            </Text>
          </View>
        ))}
      </GlassCard>

      <Pressable onPress={handlePrivacyLink} style={styles.privacyLink}
        accessibilityLabel={t('zehAni.biometricConsent.privacyPolicyLink')}
        accessibilityHint={t('zehAni.biometricConsent.privacyPolicyHint')}
        accessibilityRole="link">
        <OlorinIcon name="external-link" size={16} color={Colors.Primary.p400} />
        <Text style={styles.privacyLinkText}>
          {t('zehAni.biometricConsent.privacyPolicyLink')}
        </Text>
      </Pressable>

      <Pressable style={styles.checkboxRow} onPress={() => setAcknowledged((prev) => !prev)}
        accessibilityLabel={t('zehAni.biometricConsent.acknowledge')}
        accessibilityHint={t('zehAni.biometricConsent.acknowledgeHint')}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: acknowledged }}>
        <View style={[styles.checkbox, acknowledged && styles.checkboxChecked]}>
          {acknowledged && (
            <OlorinIcon name="check" size={14} color={Colors.Text.primary} />
          )}
        </View>
        <Text style={styles.checkboxLabel}>
          {t('zehAni.biometricConsent.acknowledge')}
        </Text>
      </Pressable>

      <View style={styles.actions}>
        <GlassButton title={t('zehAni.biometricConsent.decline')}
          onPress={handleDecline} variant="secondary"
          accessibilityLabel={t('zehAni.biometricConsent.decline')}
          accessibilityHint={t('zehAni.biometricConsent.declineHint')}
          accessibilityRole="button" />
        <GlassButton title={t('zehAni.biometricConsent.accept')}
          onPress={handleAccept} variant="primary" disabled={!acknowledged}
          accessibilityLabel={t('zehAni.biometricConsent.accept')}
          accessibilityHint={t('zehAni.biometricConsent.acceptHint')}
          accessibilityRole="button" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.Background.primary },
  scrollContent: { padding: 24, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.Text.primary },
  description: { fontSize: 15, color: Colors.Text.secondary, lineHeight: 22 },
  pointsCard: { padding: 16, gap: 12 },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  pointText: { fontSize: 14, color: Colors.Text.primary, flex: 1, lineHeight: 20 },
  privacyLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8,
  },
  privacyLinkText: { fontSize: 14, color: Colors.Primary.p400, fontWeight: '500' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.Glass.whiteStrong,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.Primary.default, borderColor: Colors.Primary.p500,
  },
  checkboxLabel: { fontSize: 14, color: Colors.Text.secondary, flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
});
