/**
 * Beta Programs Settings Component
 *
 * Settings section for managing Beta 500 enrollment and viewing program details.
 * Can be integrated into Settings > Beta Programs.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, borderRadius } from '@bayit/glass-components/theme';
import { BetaEnrollmentModal } from './BetaEnrollmentModal';

export interface BetaProgramStatus {
  totalSlots: number;
  filledSlots: number;
  availableSlots: number;
  isOpen: boolean;
  programName: string;
}

export interface UserBetaStatus {
  isEnrolled: boolean;
  status?: 'pending_verification' | 'active' | 'expired';
  creditsRemaining?: number;
  totalCredits?: number;
  expiresAt?: string;
}

export interface BetaProgramsSettingsProps {
  /** Current user's Beta 500 status */
  userStatus?: UserBetaStatus;
  /** Callback when enrollment status changes */
  onEnrollmentChange?: () => void;
  /** API base URL */
  apiBaseUrl?: string;
}

export const BetaProgramsSettings: React.FC<BetaProgramsSettingsProps> = ({
  userStatus,
  onEnrollmentChange,
  apiBaseUrl = '/api/v1',
}) => {
  const { t } = useTranslation();
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [programStatus, setProgramStatus] = useState<BetaProgramStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgramStatus();
  }, []);

  const fetchProgramStatus = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/beta/status`);
      const data = await response.json();
      setProgramStatus(data);
    } catch (error) {
      console.error('Failed to fetch Beta program status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    // User enrollment logic handled by parent component or BetaEnrollmentModal
    setShowEnrollModal(false);
    onEnrollmentChange?.();
  };

  const renderEnrolledStatus = () => {
    if (!userStatus?.isEnrolled) return null;

    const statusColors = {
      pending_verification: colors.warning,
      active: colors.success,
      expired: colors.error,
    };

    const statusLabels = {
      pending_verification: t('beta.settings.statusPendingVerification'),
      active: t('beta.settings.statusActive'),
      expired: t('beta.settings.statusExpired'),
    };

    const statusColor = userStatus.status ? statusColors[userStatus.status] : colors.textSecondary;
    const statusLabel = userStatus.status ? statusLabels[userStatus.status] : '';

    return (
      <View style={styles.enrolledCard}>
        <View style={styles.enrolledHeader}>
          <Text style={styles.enrolledTitle}>🎉 {t('beta.settings.enrolledTitle')}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {userStatus.status === 'active' && (
          <View style={styles.creditsInfo}>
            <View style={styles.creditsRow}>
              <Text style={styles.creditsLabel}>{t('beta.credits.remaining')}</Text>
              <Text style={styles.creditsValue}>
                {userStatus.creditsRemaining?.toLocaleString()} / {userStatus.totalCredits?.toLocaleString()}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${((userStatus.creditsRemaining ?? 0) / (userStatus.totalCredits ?? 1)) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {userStatus.status === 'pending_verification' && (
          <Text style={styles.pendingText}>{t('beta.settings.pendingMessage')}</Text>
        )}

        {userStatus.expiresAt && (
          <Text style={styles.expiresText}>
            {t('beta.settings.expiresOn', {
              date: new Date(userStatus.expiresAt).toLocaleDateString(),
            })}
          </Text>
        )}
      </View>
    );
  };

  const renderProgramInfo = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>{t('beta.settings.loadingStatus')}</Text>
        </View>
      );
    }

    if (!programStatus) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('beta.settings.errorLoading')}</Text>
        </View>
      );
    }

    return (
      <View style={styles.programInfoCard}>
        <Text style={styles.programName}>{programStatus.programName}</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>👥</Text>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>{t('beta.settings.programStatus')}</Text>
            <Text style={styles.infoValue}>
              {programStatus.filledSlots} / {programStatus.totalSlots} {t('beta.settings.slots')}
            </Text>
          </View>
        </View>

        <View style={styles.availabilityBadge}>
          <View
            style={[
              styles.availabilityDot,
              { backgroundColor: programStatus.isOpen ? colors.success : colors.error },
            ]}
          />
          <Text style={styles.availabilityText}>
            {programStatus.isOpen
              ? t('beta.settings.slotsAvailable', { count: programStatus.availableSlots })
              : t('beta.settings.programFull')}
          </Text>
        </View>

        {!userStatus?.isEnrolled && programStatus.isOpen && (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => setShowEnrollModal(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.joinButtonText}>{t('beta.enrollment.joinButton')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('beta.settings.title')}</Text>
      <Text style={styles.sectionDescription}>{t('beta.settings.description')}</Text>

      {renderEnrolledStatus()}
      {renderProgramInfo()}

      <BetaEnrollmentModal
        visible={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        onEnroll={handleEnroll}
        programStatus={programStatus ?? undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },
  enrolledCard: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  enrolledHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  enrolledTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  creditsInfo: {
    marginTop: spacing.md,
  },
  creditsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  creditsLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  creditsValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  pendingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  expiresText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  programInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  programName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  availabilityText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  joinButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: colors.text,
  },
});

export default BetaProgramsSettings;
