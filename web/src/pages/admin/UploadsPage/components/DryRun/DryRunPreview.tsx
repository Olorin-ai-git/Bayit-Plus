/**
 * DryRunPreview Component
 * Modal showing dry run results with proceed/cancel actions
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { GlassModal, GlassButton, GlassCard } from '@bayit/shared/ui';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useTranslation } from 'react-i18next';
import type { DryRunResult } from '../../types';
import { formatFileSize } from '../../utils/formatters';

interface DryRunPreviewProps {
  visible: boolean;
  results: DryRunResult[];
  onProceed: () => void;
  onCancel: () => void;
}

export const DryRunPreview: React.FC<DryRunPreviewProps> = ({
  visible,
  results,
  onProceed,
  onCancel,
}) => {
  const { t } = useTranslation();

  const willUpload = results.filter((r) => r.would_upload).length;
  const duplicates = results.filter((r) => !r.would_upload && r.reason !== 'validation_failed').length;
  const errors = results.filter((r) => r.reason === 'validation_failed').length;

  return (
    <GlassModal visible={visible} onClose={onCancel} title={t('admin.uploads.dryRun.preview')}>
      <View style={styles.container}>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <GlassCard style={[styles.summaryCard, { borderColor: colors.success.DEFAULT }]}>
            <CheckCircle size={24} color={colors.success.DEFAULT} />
            <Text style={[styles.summaryNumber, { color: colors.success.DEFAULT }]}>{willUpload}</Text>
            <Text style={styles.summaryLabel}>{t('admin.uploads.dryRun.willUpload')}</Text>
          </GlassCard>

          <GlassCard style={[styles.summaryCard, { borderColor: colors.warning.DEFAULT }]}>
            <AlertCircle size={24} color={colors.warning.DEFAULT} />
            <Text style={[styles.summaryNumber, { color: colors.warning.DEFAULT }]}>{duplicates}</Text>
            <Text style={styles.summaryLabel}>{t('admin.uploads.dryRun.duplicates')}</Text>
          </GlassCard>

          {errors > 0 && (
            <GlassCard style={[styles.summaryCard, { borderColor: colors.error.DEFAULT }]}>
              <XCircle size={24} color={colors.error.DEFAULT} />
              <Text style={[styles.summaryNumber, { color: colors.error.DEFAULT }]}>{errors}</Text>
              <Text style={styles.summaryLabel}>{t('admin.uploads.dryRun.errors')}</Text>
            </GlassCard>
          )}
        </View>

        {/* Results List */}
        <ScrollView style={styles.resultsList} showsVerticalScrollIndicator={false}>
          {results.map((result, index) => (
            <View
              key={index}
              style={[
                styles.resultItem,
                {
                  borderLeftColor: result.would_upload ? colors.success.DEFAULT :colors.warning.DEFAULT,
                },
              ]}
            >
              <Text style={styles.filename}>{result.file_info.filename}</Text>
              <Text style={styles.fileSize}>{formatFileSize(result.file_info.size)}</Text>
              <Text
                style={[
                  styles.reason,
                  { color: result.would_upload ? colors.success.DEFAULT :colors.warning.DEFAULT},
                ]}
              >
                {t(`admin.uploads.dryRun.${result.reason}`)}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <GlassButton
            title={t('common.cancel')}
            onPress={onCancel}
            variant="secondary"
          />
          <GlassButton
            title={t('admin.uploads.dryRun.proceedWithUpload', { count: willUpload })}
            onPress={onProceed}
            variant="primary"
            disabled={willUpload === 0}
          />
        </View>
      </View>
    </GlassModal>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    minHeight: 400,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderLeftWidth: 3,
  },
  summaryNumber: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  resultsList: {
    maxHeight: 300,
  },
  resultItem: {
    padding: spacing.md,
    backgroundColor: colors.glass,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    marginBottom: spacing.sm,
  },
  filename: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#ffffff',
  },
  fileSize: {
    fontSize: fontSize.sm,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: spacing.xs,
  },
  reason: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
});
