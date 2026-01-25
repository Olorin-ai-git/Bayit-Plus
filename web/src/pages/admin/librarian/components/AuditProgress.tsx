import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { BatchProgress } from '../types';

interface AuditProgressProps {
  progress: BatchProgress;
  isRTL: boolean;
}

export const AuditProgress = ({ progress, isRTL }: AuditProgressProps) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL ? styles.headerRTL : styles.headerLTR]}>
        <Text style={styles.batchText}>
          {progress.percentage >= 99 ? (
            t('admin.librarian.progress.finishing', 'Finishing up...')
          ) : (
            t('admin.librarian.progress.batch', 'Batch {{current}} of {{total}}', {
              current: progress.currentBatch,
              total: progress.totalBatches
            })
          )}
        </Text>
        <Text style={styles.percentageText}>
          {progress.percentage}%
        </Text>
      </View>
      <Text style={styles.itemsText}>
        {t('admin.librarian.progress.items', '{{processed}} of {{total}} items', {
          processed: progress.itemsProcessed,
          total: progress.totalItems
        })}
        {progress.percentage >= 99 && (
          <Text style={styles.finalizingText}>
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
  container: {
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(168, 85, 247, 0.1)', // purple-500/10
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  headerLTR: {
    flexDirection: 'row',
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  batchText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.text,
  },
  percentageText: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.primary.DEFAULT,
  },
  itemsText: {
    fontSize: fontSize.xs,
    marginBottom: spacing.sm,
    color: colors.textMuted,
  },
  finalizingText: {
    fontStyle: 'italic',
    color: colors.textMuted,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)', // bg-white/20
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.DEFAULT,
  },
});
