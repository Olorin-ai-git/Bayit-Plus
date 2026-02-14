/**
 * EpisodeProgress
 *
 * Progress display for Star Story episode generation.
 * Shows steps: Script, Voiceover, Animation, Rendering.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useDirection } from '@bayit/shared-hooks';
import { VideoProcessingStep } from './VideoProcessingStep';

type StepId = 'script' | 'voiceover' | 'animation' | 'rendering';

interface EpisodeProgressProps {
  currentStep: StepId;
  progress: number;
  estimatedTimeRemaining?: number;
}

const STEP_ORDER: StepId[] = ['script', 'voiceover', 'animation', 'rendering'];

function getStepStatus(
  stepId: StepId,
  currentStep: StepId,
): 'pending' | 'processing' | 'complete' | 'error' {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const stepIndex = STEP_ORDER.indexOf(stepId);

  if (stepIndex < currentIndex) {
    return 'complete';
  }
  if (stepIndex === currentIndex) {
    return 'processing';
  }
  return 'pending';
}

function formatTimeRemaining(seconds: number, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (seconds < 60) {
    return t('starStory.progress.secondsRemaining', { count: Math.ceil(seconds) });
  }
  const minutes = Math.ceil(seconds / 60);
  return t('starStory.progress.minutesRemaining', { count: minutes });
}

export const EpisodeProgress: React.FC<EpisodeProgressProps> = ({
  currentStep,
  progress,
  estimatedTimeRemaining,
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  return (
    <View
      style={styles.container}
      accessibilityLabel={t('starStory.progress.label', {
        step: t(`starStory.step.${currentStep}`),
        percent: Math.round(progress),
      })}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(progress),
      }}
    >
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${Math.min(progress, 100)}%` }]} />
      </View>

      <View style={styles.stepsContainer}>
        {STEP_ORDER.map((stepId) => (
          <VideoProcessingStep
            key={stepId}
            label={t(`starStory.step.${stepId}`)}
            status={getStepStatus(stepId, currentStep)}
            progress={stepId === currentStep ? progress : undefined}
          />
        ))}
      </View>

      {estimatedTimeRemaining != null && estimatedTimeRemaining > 0 && (
        <Text style={[styles.timeRemaining, { textAlign: isRTL ? 'right' : 'left' }]}>
          {formatTimeRemaining(estimatedTimeRemaining, t)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
  },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  stepsContainer: {
    gap: spacing.sm,
  },
  timeRemaining: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontWeight: '500',
  },
});

export default EpisodeProgress;
