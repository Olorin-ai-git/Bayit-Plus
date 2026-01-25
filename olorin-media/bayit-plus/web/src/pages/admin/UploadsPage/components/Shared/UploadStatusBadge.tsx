/**
 * UploadStatusBadge Component
 * Color-coded status badges for uploads
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import type { UploadStageStatus } from '../../types';

interface UploadStatusBadgeProps {
  status: UploadStageStatus | 'uploading' | 'queued' | 'processing' | 'cancelled';
  label?: string;
}

export const UploadStatusBadge: React.FC<UploadStatusBadgeProps> = ({ status, label }) => {
  const statusConfig = {
    pending: { color: colors.glass.borderLight, text: label || 'Pending' },
    in_progress: { color: colors.primary.DEFAULT, text: label || 'In Progress' },
    uploading: { color: colors.primary.DEFAULT, text: label || 'Uploading' },
    processing: { color: colors.primary.DEFAULT, text: label || 'Processing' },
    queued: { color: colors.info, text: label || 'Queued' },
    completed: { color: colors.success, text: label || 'Completed' },
    failed: { color: colors.error, text: label || 'Failed' },
    cancelled: { color: colors.warning, text: label || 'Cancelled' },
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
