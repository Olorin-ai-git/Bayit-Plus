/**
 * DubbingPremiumGate - Premium upsell for dubbing feature
 *
 * Displays a preview of the dubbing feature with a subscription
 * call-to-action for non-premium users.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '@bayit/shared';
import { GlassButton, GlassModal, spacing, borderRadius } from '@olorin/glass-ui/native';
import { NativeIcon } from '@olorin/shared-icons/native';
import Colors from '../../../theme/colors';

interface DubbingPremiumGateProps {
  onSubscribe: () => void;
  onDismiss: () => void;
}

interface FeatureRow {
  icon: string;
  labelKey: string;
}

const DUBBING_FEATURES: FeatureRow[] = [
  { icon: 'languages', labelKey: 'dubbing.premium.featureRealTime' },
  { icon: 'mic', labelKey: 'dubbing.premium.featureVoices' },
  { icon: 'sliders', labelKey: 'dubbing.premium.featureMix' },
  { icon: 'subtitles', labelKey: 'dubbing.premium.featureBilingual' },
];

export const DubbingPremiumGate: React.FC<DubbingPremiumGateProps> = ({
  onSubscribe,
  onDismiss,
}) => {
  const { t } = useTranslation();

  return (
    <GlassModal
      visible
      onClose={onDismiss}
      dismissable
      size="medium"
      buttons={[]}
    >
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <NativeIcon name="crown" size="xxl" color={Colors.Warning.default} />
        </View>

        <Text style={styles.title}>{t('dubbing.premium.title')}</Text>
        <Text style={styles.subtitle}>{t('dubbing.premium.subtitle')}</Text>

        <GlassView intensity="low" style={styles.featuresBox}>
          {DUBBING_FEATURES.map((feature) => (
            <View key={feature.labelKey} style={styles.featureRow}>
              <NativeIcon
                name={feature.icon}
                size="sm"
                color={Colors.Primary.p400}
              />
              <Text style={styles.featureText}>{t(feature.labelKey)}</Text>
            </View>
          ))}
        </GlassView>

        <View style={styles.previewBanner}>
          <NativeIcon name="sparkles" size="sm" color={Colors.Warning.default} />
          <Text style={styles.previewText}>
            {t('dubbing.premium.previewNote')}
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <GlassButton
            variant="primary"
            onPress={onSubscribe}
            style={styles.subscribeButton}
            accessibilityLabel={t('dubbing.premium.subscribe')}
            accessibilityHint={t('dubbing.premium.subscribeHint')}
            accessibilityRole="button"
          >
            {t('dubbing.premium.subscribe')}
          </GlassButton>

          <GlassButton
            variant="ghost"
            onPress={onDismiss}
            accessibilityLabel={t('dubbing.premium.dismiss')}
            accessibilityHint={t('dubbing.premium.dismissHint')}
            accessibilityRole="button"
          >
            {t('dubbing.premium.maybeLater')}
          </GlassButton>
        </View>
      </View>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.Glass.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.Text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.Text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  featuresBox: {
    width: '100%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  featureText: {
    fontSize: 14,
    color: Colors.Text.primary,
    flex: 1,
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: Colors.Glass.whiteLight,
    borderRadius: borderRadius.sm,
    width: '100%',
  },
  previewText: {
    fontSize: 12,
    color: Colors.Warning.default,
    flex: 1,
  },
  buttonRow: {
    width: '100%',
    gap: spacing.sm,
  },
  subscribeButton: {
    width: '100%',
  },
});
