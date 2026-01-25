/**
 * ActiveJobCard Component
 * Displays the currently processing upload job
 */

import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { XCircle } from 'lucide-react';
import { GlassBadge } from '@bayit/shared/ui';
import { colors, spacing, fontSize, borderRadius } from '@olorin/design-tokens';
import { QueueJob } from '../types';
import { formatFileSize, formatSpeed, formatETA } from '../utils';
import { StageIndicator } from './StageIndicator';
import { StageError } from './StageError';
import { StatusIcon } from './StatusIcon';

interface ActiveJobCardProps {
  job: QueueJob;
  isRTL: boolean;
  textAlign: 'left' | 'right' | 'center';
  onCancelJob?: (jobId: string) => void;
  cancellingJob?: boolean;
}

export const ActiveJobCard: React.FC<ActiveJobCardProps> = ({
  job,
  isRTL,
  textAlign,
  onCancelJob,
  cancellingJob = false,
}) => {
  const { t } = useTranslation();

  const handleCancel = () => {
    if (onCancelJob && !cancellingJob) {
      onCancelJob(job.job_id);
    }
  };

  return (
    <View style={[styles.container, { borderTopColor: colors.glassBorder }]}>
      <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
        <Text style={[styles.headerText, { textAlign, color: colors.text }]}>
          {t('admin.uploads.activeUpload', 'Active Upload')}
        </Text>
        {onCancelJob && (
          <Pressable
            onPress={handleCancel}
            style={[styles.cancelButton, { backgroundColor: colors.error.DEFAULT + '15' }]}
            disabled={cancellingJob}
          >
            {cancellingJob ? (
              <ActivityIndicator size="small" color={colors.error.DEFAULT} />
            ) : (
              <XCircle size={20} color={colors.error.DEFAULT} />
            )}
            <Text style={[styles.cancelText, { color: colors.error.DEFAULT }]}>
              {t('admin.uploads.cancelUpload', 'Cancel')}
            </Text>
          </Pressable>
        )}
      </View>
      <View style={[styles.jobCard, { backgroundColor: colors.backgroundLight, borderColor: colors.glassBorder }]}>
        <View style={[styles.jobRow, isRTL && styles.rowReverse]}>
          <StatusIcon status={job.status} job={job} />
          <Text style={[styles.filename, { textAlign, color: colors.text }]} numberOfLines={1}>
            {job.filename}
          </Text>
          <GlassBadge
            label={`${job.progress.toFixed(1)}%`}
            variant="info"
          />
        </View>

        <StageIndicator
          stages={job.stages}
          status={job.status}
          isRTL={isRTL}
          fileSize={job.file_size}
          showTooltips={true}
        />

        {job.current_stage && (
          <Text style={[styles.currentStage, { textAlign, color: colors.primary.DEFAULT }]}>
            {job.current_stage}
          </Text>
        )}

        <View style={[styles.progressBarBg, { backgroundColor: colors.glassBorder }]}>
          <View style={[styles.progressBarFill, { width: `${job.progress}%`, backgroundColor: colors.primary.DEFAULT }]} />
        </View>

        <StageError job={job} />

        <View style={[styles.statsRow, isRTL && styles.rowReverse]}>
          <Text style={[styles.statsText, { color: colors.textSecondary }]}>
            {formatFileSize(job.bytes_uploaded)} / {formatFileSize(job.file_size)}
          </Text>
          {job.upload_speed && job.upload_speed > 0 && (
            <Text style={[styles.statsText, { color: colors.textSecondary }]}>
              {formatSpeed(job.upload_speed)}
            </Text>
          )}
          {job.eta_seconds && job.eta_seconds > 0 && (
            <Text style={[styles.statsText, { color: colors.textSecondary }]}>
              ETA: {formatETA(job.eta_seconds)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  jobCard: {
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  filename: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  currentStage: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 4,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  statsText: {
    fontSize: 14,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
});
