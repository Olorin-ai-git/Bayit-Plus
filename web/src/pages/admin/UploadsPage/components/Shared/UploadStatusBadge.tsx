/**
 * UploadStatusBadge Component
 * Color-coded status badges for uploads
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import type { UploadStageStatus } from '../../types';

interface UploadStatusBadgeProps {
  status: UploadStageStatus | 'uploading' | 'queued' | 'processing' | 'cancelled';
  label?: string;
}

export const UploadStatusBadge: React.FC<UploadStatusBadgeProps> = ({ status, label }) => {
  const { t } = useTranslation();
  const statusConfig = {
    pending: { color: colors.glass.borderLight, text: label || t('uploads.status.pending') },
    in_progress: { color: colors.primary.DEFAULT, text: label || t('uploads.status.inProgress') },
    uploading: { color: colors.primary.DEFAULT, text: label || t('uploads.status.uploading') },
    processing: { color: colors.primary.DEFAULT, text: label || t('uploads.status.processing') },
    queued: { color: colors.info, text: label || t('uploads.status.queued') },
    completed: { color: colors.success, text: label || t('uploads.status.completed') },
    failed: { color: colors.error, text: label || t('uploads.status.failed') },
    cancelled: { color: colors.warning, text: label || t('uploads.status.cancelled') },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <View style={[styles.badge, { borderColor: config.color }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});
