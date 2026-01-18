/**
 * ActiveJobCard Component
 * Displays the currently processing upload job
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
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
}

export const ActiveJobCard: React.FC<ActiveJobCardProps> = ({ job, isRTL, textAlign }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { textAlign }]}>
        {t('admin.uploads.activeUpload', 'Active Upload')}
      </Text>
      <View style={styles.jobCard}>
        <View style={[styles.jobHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <StatusIcon status={job.status} job={job} />
          <Text style={[styles.jobFilename, { textAlign, flex: 1 }]} numberOfLines={1}>
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
          <Text style={[styles.currentStage, { textAlign }]}>
            {job.current_stage}
          </Text>
        )}

        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${job.progress}%` }]} />
        </View>

        <StageError job={job} />

        <View style={[styles.jobDetails, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.jobDetailText}>
            {formatFileSize(job.bytes_uploaded)} / {formatFileSize(job.file_size)}
          </Text>
          {job.upload_speed && job.upload_speed > 0 && (
            <Text style={styles.jobDetailText}>
              {formatSpeed(job.upload_speed)}
            </Text>
          )}
          {job.eta_seconds && job.eta_seconds > 0 && (
            <Text style={styles.jobDetailText}>
              ETA: {formatETA(job.eta_seconds)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  jobCard: {
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  jobFilename: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  currentStage: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  progressContainer: {
    height: 8,
    backgroundColor: colors.glassBorder,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  jobDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  jobDetailText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
