/**
 * UploadResult Component
 * Success/failure summary after upload completes
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GlassCard } from '@bayit/shared/ui';
import { CheckCircle, XCircle } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';

interface UploadResultProps {
  successful: number;
  failed: number;
}

export const UploadResult: React.FC<UploadResultProps> = ({ successful, failed }) => {
  const { t } = useTranslation();
  const total = successful + failed;

  if (total === 0) return null;

  return (
    <GlassCard style={styles.container}>
      <Text style={styles.title}>{t('admin.uploads.manualUpload.uploadComplete')}</Text>

      <View style={styles.statsRow}>
        {/* Successful */}
        {successful > 0 && (
          <View style={styles.stat}>
            <View style={styles.statIcon}>
              <CheckCircle size={24} color={colors.success} />
            </View>
            <View>
              <Text style={[styles.statNumber, { color: colors.success }]}>{successful}</Text>
              <Text style={styles.statLabel}>
                {t('admin.uploads.manualUpload.successful')}
              </Text>
            </View>
          </View>
        )}

        {/* Failed */}
        {failed > 0 && (
          <View style={styles.stat}>
            <View style={styles.statIcon}>
              <XCircle size={24} color={colors.error} />
            </View>
            <View>
              <Text style={[styles.statNumber, { color: colors.error }]}>{failed}</Text>
              <Text style={styles.statLabel}>{t('admin.uploads.manualUpload.failed')}</Text>
            </View>
          </View>
        )}

        {/* Total */}
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{total}</Text>
          <Text style={styles.statLabel}>{t('admin.uploads.manualUpload.total')}</Text>
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
