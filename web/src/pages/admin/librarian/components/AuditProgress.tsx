import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { BatchProgress } from '../types';

interface AuditProgressProps {
  progress: BatchProgress;
  isRTL: boolean;
}

export const AuditProgress = ({ progress, isRTL }: AuditProgressProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.progressContainer}>
      <View style={[styles.progressHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={styles.progressLabel}>
          {progress.percentage >= 99 ? (
            t('admin.librarian.progress.finishing', 'Finishing up...')
          ) : (
            t('admin.librarian.progress.batch', 'Batch {{current}} of {{total}}', {
              current: progress.currentBatch,
              total: progress.totalBatches
            })
          )}
        </Text>
        <Text style={styles.progressPercentage}>
          {progress.percentage}%
        </Text>
      </View>
      <Text style={styles.progressSubtext}>
        {t('admin.librarian.progress.items', '{{processed}} of {{total}} items', {
          processed: progress.itemsProcessed,
          total: progress.totalItems
        })}
        {progress.percentage >= 99 && (
          <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>
            {' • '}{t('admin.librarian.progress.finalizing', 'Generating report and applying fixes')}
          </Text>
        )}
      </Text>
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${progress.percentage}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  progressContainer: {
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.glassPurpleLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  progressSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.glassStrong,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    transition: 'width 0.3s ease',
  },
});
