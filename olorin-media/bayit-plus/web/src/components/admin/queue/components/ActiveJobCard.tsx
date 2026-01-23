/**
 * ActiveJobCard Component
 * Displays the currently processing upload job
 */

import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { XCircle } from 'lucide-react';
import { GlassBadge } from '@bayit/shared/ui';
import { colors, spacing, fontSize, borderRadius } from '@bayit/shared/theme';
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
    <View className="mb-6 pt-4 border-t" style={{ borderTopColor: colors.glassBorder }}>
      <View style={[styles.headerRow, isRTL && styles.rowReverse]}>
        <Text className="text-lg font-semibold" style={{ textAlign, color: colors.text }}>
          {t('admin.uploads.activeUpload', 'Active Upload')}
        </Text>
        {onCancelJob && (
          <Pressable
            onPress={handleCancel}
            className="flex-row items-center gap-1 py-1 px-2 rounded-sm"
            style={{ backgroundColor: colors.error + '15' }}
            disabled={cancellingJob}
          >
            {cancellingJob ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <XCircle size={20} color={colors.error} />
            )}
            <Text className="text-sm font-medium" style={{ color: colors.error }}>
              {t('admin.uploads.cancelUpload', 'Cancel')}
            </Text>
          </Pressable>
        )}
      </View>
      <View className="rounded-lg p-4 border" style={{ backgroundColor: colors.backgroundLight, borderColor: colors.glassBorder }}>
        <View style={[styles.jobRow, isRTL && styles.rowReverse]}>
          <StatusIcon status={job.status} job={job} />
          <Text className="flex-1 text-base font-semibold" style={{ textAlign, color: colors.text }} numberOfLines={1}>
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
          <Text className="text-sm italic mt-1 mb-1" style={{ textAlign, color: colors.primary }}>
            {job.current_stage}
          </Text>
        )}

        <View className="h-2 rounded-sm overflow-hidden mb-2" style={{ backgroundColor: colors.glassBorder }}>
          <View className="h-full rounded-sm" style={{ width: `${job.progress}%`, backgroundColor: colors.primary }} />
        </View>

        <StageError job={job} />

        <View style={[styles.statsRow, isRTL && styles.rowReverse]}>
          <Text className="text-sm" style={{ color: colors.textSecondary }}>
            {formatFileSize(job.bytes_uploaded)} / {formatFileSize(job.file_size)}
          </Text>
          {job.upload_speed && job.upload_speed > 0 && (
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              {formatSpeed(job.upload_speed)}
            </Text>
          )}
          {job.eta_seconds && job.eta_seconds > 0 && (
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              ETA: {formatETA(job.eta_seconds)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  jobRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
});
