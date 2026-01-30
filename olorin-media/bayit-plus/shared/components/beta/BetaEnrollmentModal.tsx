/**
 * Beta 500 Enrollment Modal
 *
 * Reusable modal for Beta 500 program enrollment across all platforms.
 * Uses GlassModal with custom Beta 500 content.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassModal } from '@bayit/glass-components/native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize } from '@bayit/glass-components/theme';
import type { BetaEnrollmentModalProps } from '../../types/betaEnrollment';

export const BetaEnrollmentModal: React.FC<BetaEnrollmentModalProps> = ({
  visible,
  onClose,
  onEnroll,
  programStatus,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [enrolling, setEnrolling] = useState(false);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await onEnroll();
    } catch (error) {
      console.error('Beta enrollment error:', error);
    } finally {
      setEnrolling(false);
    }
  };

  const isFull = programStatus?.isOpen === false;
  const slotsRemaining = programStatus?.availableSlots ?? 0;

  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      size="lg"
      title={t('beta.enrollment.title')}
      dismissable={!enrolling}
      loading={enrolling || loading}
      buttons={
        isFull
          ? [{ text: t('common.close'), style: 'cancel', onPress: onClose }]
          : [
              { text: t('common.cancel'), style: 'cancel', onPress: onClose },
              {
                text: t('beta.enrollment.joinButton'),
                style: 'default',
                onPress: handleEnroll,
              },
            ]
      }
      testID="beta-enrollment-modal"
    >
      <View style={styles.content}>
        {/* Program Full Banner */}
        {isFull && (
          <View style={styles.fullBanner}>
            <Text style={styles.fullBannerIcon}>🔒</Text>
            <Text style={styles.fullBannerText}>{t('beta.enrollment.programFull')}</Text>
          </View>
        )}

        {/* Welcome Message */}
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.subtitle}>{t('beta.enrollment.subtitle')}</Text>

        {/* Program Details */}
        <View style={styles.detailsContainer}>
          {/* Slot Information */}
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>👥</Text>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>{t('beta.enrollment.exclusiveAccess')}</Text>
              <Text style={styles.detailValue}>
                {programStatus
                  ? t('beta.enrollment.slotsAvailable', {
                      available: slotsRemaining,
                      total: programStatus.totalSlots,
                    })
                  : t('beta.enrollment.limitedSlots')}
              </Text>
            </View>
          </View>

          {/* Credits */}
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>✨</Text>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>{t('beta.enrollment.freeCredits')}</Text>
              <Text style={styles.detailValue}>{t('beta.enrollment.creditsAmount')}</Text>
            </View>
          </View>

          {/* Duration */}
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>⏰</Text>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>{t('beta.enrollment.duration')}</Text>
              <Text style={styles.detailValue}>{t('beta.enrollment.durationValue')}</Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🚀</Text>
            <View style={styles.detailTextContainer}>
              <Text style={styles.detailLabel}>{t('beta.enrollment.features')}</Text>
              <Text style={styles.detailValue}>{t('beta.enrollment.featuresValue')}</Text>
            </View>
          </View>
        </View>

        {/* Benefits List */}
        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>{t('beta.enrollment.whatYouGet')}</Text>
          {['liveDubbing', 'aiSearch', 'aiRecommendations', 'prioritySupport'].map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Text style={styles.checkmark}>✓</Text>
              <Text style={styles.benefitText}>{t(`beta.enrollment.benefits.${benefit}`)}</Text>
            </View>
          ))}
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>{t('beta.enrollment.disclaimer')}</Text>
        </View>

        {/* Program Full Message */}
        {isFull && (
          <View style={styles.fullMessage}>
            <Text style={styles.fullMessageText}>{t('beta.enrollment.waitlistMessage')}</Text>
          </View>
        )}
      </View>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    width: '100%',
  },
  fullBanner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  fullBannerIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  fullBannerText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.error,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  detailIcon: {
    fontSize: 24,
    marginRight: spacing.md,
    width: 32,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  benefitsTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  checkmark: {
    fontSize: 18,
    color: colors.success,
    marginRight: spacing.sm,
    width: 24,
  },
  benefitText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  disclaimer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  disclaimerText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
  fullMessage: {
    width: '100%',
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
  },
  fullMessageText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default BetaEnrollmentModal;
