/**
 * UploadProgress Component
 * Displays upload progress with file info, progress bar, and ETA
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { GlassCard } from '../ui/GlassCard';
import { GlassProgressBar } from '../ui/GlassProgressBar';
import { GlassButton } from '../ui/GlassButton';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { useDirection } from '../../hooks/useDirection';
import { UploadJob } from '../../services/uploadService';

interface UploadProgressProps {
  job: UploadJob;
  onCancel?: (jobId: string) => void;
  formatFileSize?: (bytes?: number) => string;
  formatUploadSpeed?: (bytesPerSecond?: number) => string;
  formatETA?: (seconds?: number) => string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  job,
  onCancel,
  formatFileSize = (bytes) => bytes ? `${(bytes / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
  formatUploadSpeed = (speed) => speed ? `${(speed / 1024 / 1024).toFixed(2)} MB/s` : 'Calculating...',
  formatETA = (seconds) => {
    if (!seconds) return 'Calculating...';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  },
}) => {
  const { isRTL, textAlign } = useDirection();

  const getStatusIcon = () => {
    switch (job.status) {
      case 'queued':
        return '⏳';
      case 'processing':
        return '⚙️';
      case 'uploading':
        return '📤';
      case 'completed':
        return '✅';
      case 'failed':
        return '❌';
      case 'cancelled':
        return '🚫';
      default:
        return '📁';
    }
  };

  const getStatusColor = () => {
    switch (job.status) {
      case 'completed':
        return colors.success;
      case 'failed':
        return colors.error;
      case 'cancelled':
        return colors.textMuted;
      case 'uploading':
      case 'processing':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'queued':
        return 'Queued';
      case 'processing':
        return 'Processing';
      case 'uploading':
        return 'Uploading';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return job.status;
    }
  };

  const canCancel = ['queued', 'processing', 'uploading'].includes(job.status);

  return (
    <GlassCard autoSize style={styles.container}>
      <View style={styles.header}>
        <View style={styles.statusContainer}>
          <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
          <View style={styles.fileInfo}>
            <Text style={[styles.filename, { textAlign }]} numberOfLines={1}>
              {job.filename}
            </Text>
            <Text style={[styles.fileSize, { textAlign }]}>
              {formatFileSize(job.file_size)}
            </Text>
          </View>
        </View>

        {canCancel && onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => onCancel(job.job_id)}
          >
            <Text style={styles.cancelText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statusRow}>
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
        <Text style={styles.progressText}>{Math.round(job.progress)}%</Text>
      </View>

      <GlassProgressBar
        progress={job.progress}
        height={8}
        style={styles.progressBar}
      />

      {job.status === 'uploading' && (
        <View style={styles.detailsRow}>
          <Text style={styles.detailText}>
            Speed: {formatUploadSpeed(job.upload_speed)}
          </Text>
          <Text style={styles.detailText}>
            ETA: {formatETA(job.eta_seconds)}
          </Text>
        </View>
      )}

      {job.error_message && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{job.error_message}</Text>
        </View>
      )}

      {job.destination_url && job.status === 'completed' && (
        <View style={styles.successContainer}>
          <Text style={styles.successText} numberOfLines={1}>
            Uploaded successfully
          </Text>
        </View>
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  fileInfo: {
    flex: 1,
  },
  filename: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  fileSize: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  cancelText: {
    fontSize: 18,
    color: colors.error,
    fontWeight: 'bold',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  progressText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  progressBar: {
    marginBottom: spacing.md,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  errorContainer: {
    backgroundColor: colors.error + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
  },
  successContainer: {
    backgroundColor: colors.success + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  successText: {
    fontSize: fontSize.sm,
    color: colors.success,
    fontWeight: '600',
  },
});

export default UploadProgress;
