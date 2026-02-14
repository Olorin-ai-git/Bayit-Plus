/**
 * VideoProcessingStep
 *
 * Individual processing step with status indicator for
 * Star Story episode generation pipeline.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { NativeIcon, IconName } from '@olorin/shared-icons/native';
import { useDirection } from '@bayit/shared-hooks';

type StepStatus = 'pending' | 'processing' | 'complete' | 'error';

interface VideoProcessingStepProps {
  label: string;
  status: StepStatus;
  progress?: number;
}

const STATUS_CONFIG: Record<StepStatus, {
  icon: IconName;
  color: string;
  bgColor: string;
}> = {
  pending: {
    icon: 'circle',
    color: colors.textMuted,
    bgColor: 'rgba(255, 255, 255, 0.06)',
  },
  processing: {
    icon: 'loader',
    color: colors.primary,
    bgColor: `${colors.primary}20`,
  },
  complete: {
    icon: 'checkCircle',
    color: colors.success,
    bgColor: `${colors.success}20`,
  },
  error: {
    icon: 'alertCircle',
    color: colors.error,
    bgColor: `${colors.error}20`,
  },
};

export const VideoProcessingStep: React.FC<VideoProcessingStepProps> = ({
  label,
  status,
  progress,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const config = STATUS_CONFIG[status];

  const accessibilityText = status === 'processing' && progress != null
    ? t('starStory.stepProgressLabel', { step: label, percent: Math.round(progress) })
    : t('starStory.stepStatusLabel', { step: label, status: t(`starStory.statusName.${status}`) });

  return (
    <View
      style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      accessibilityLabel={accessibilityText}
      accessibilityRole="text"
    >
      <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
        <NativeIcon name={config.icon} size="sm" color={config.color} />
      </View>

      <View style={styles.labelContainer}>
        <Text
          style={[
            styles.label,
            { textAlign: isRTL ? 'right' : 'left' },
            status === 'processing' && styles.labelActive,
            status === 'complete' && styles.labelComplete,
            status === 'error' && styles.labelError,
          ]}
        >
          {label}
        </Text>

        {status === 'processing' && progress != null && (
          <View style={styles.stepProgressContainer}>
            <View style={styles.stepProgressBar}>
              <View
                style={[
                  styles.stepProgressFill,
                  { width: `${Math.min(progress, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.stepProgressText}>
              {Math.round(progress)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  labelComplete: {
    color: colors.success,
  },
  labelError: {
    color: colors.error,
  },
  stepProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  stepProgressBar: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  stepProgressFill: {
    height: '100%',
    borderRadius: 1.5,
    backgroundColor: colors.primary,
  },
  stepProgressText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    width: 36,
    textAlign: 'right',
  },
});

export default VideoProcessingStep;
