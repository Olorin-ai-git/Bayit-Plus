/**
 * StageIndicator Component
 * Visual progress indicator showing upload pipeline stages
 */

import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing } from '@bayit/shared/theme';
import { UploadStages } from '../types';
import { UPLOAD_STAGES, CRITICAL_STAGES } from '../constants';
import { StageTooltip } from './StageTooltip';

interface StageIndicatorProps {
  stages?: UploadStages;
  status: string;
  isRTL: boolean;
  fileSize?: number;
  showTooltips?: boolean;
}

export const StageIndicator: React.FC<StageIndicatorProps> = ({
  stages,
  status,
  isRTL,
  fileSize,
  showTooltips = false,
}) => {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  if (!stages || status === 'queued') return null;

  const criticalStagesCount = CRITICAL_STAGES.length;

  return (
    <View>
      <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {UPLOAD_STAGES.map((stage, index) => {
          const stageStatus = stages[stage.key as keyof UploadStages];
          const isActive = stageStatus === 'in_progress';
          const isCompleted = stageStatus === 'completed';
          const isSkipped = stageStatus === 'skipped';
          const isScheduled = stageStatus === 'scheduled';
          const isEnrichmentStage = index >= criticalStagesCount;

          const Icon = stage.icon;

          let iconColor = colors.textMuted;
          let bgColor = 'transparent';
          let borderColor = colors.glassBorder;

          if (isCompleted) {
            iconColor = colors.success;
            bgColor = colors.success + '20';
            borderColor = colors.success + '40';
          } else if (isActive) {
            iconColor = colors.primary;
            bgColor = colors.primary + '20';
            borderColor = colors.primary + '40';
          } else if (isSkipped) {
            iconColor = colors.warning;
            bgColor = colors.warning + '15';
            borderColor = colors.warning + '30';
          } else if (isScheduled) {
            iconColor = colors.info || colors.primary;
            bgColor = (colors.info || colors.primary) + '15';
            borderColor = (colors.info || colors.primary) + '30';
          }

          const showSeparator = index === criticalStagesCount;

          return (
            <React.Fragment key={stage.key}>
              {index > 0 && !showSeparator && (
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: isCompleted ? colors.success : colors.glassBorder }
                  ]}
                />
              )}
              {showSeparator && (
                <View style={styles.enrichmentSeparator}>
                  <View style={styles.separatorDot} />
                </View>
              )}
              <Pressable
                onPress={() => setSelectedStage(selectedStage === stage.key ? null : stage.key)}
                style={[
                  styles.stage,
                  isEnrichmentStage && styles.enrichmentStage,
                  {
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                  }
                ]}
              >
                <Icon size={isEnrichmentStage ? 10 : 12} color={iconColor} />
                {isActive && (
                  <ActivityIndicator size={8} color={colors.primary} style={styles.spinner} />
                )}
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>
      {showTooltips && selectedStage && (
        <StageTooltip
          stage={UPLOAD_STAGES.find(s => s.key === selectedStage)!}
          status={stages[selectedStage as keyof UploadStages] || 'pending'}
          fileSize={fileSize}
          visible={true}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.sm,
    justifyContent: 'center',
  },
  stage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  enrichmentStage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    opacity: 0.85,
  },
  connector: {
    width: 20,
    height: 2,
    marginHorizontal: 2,
  },
  enrichmentSeparator: {
    marginHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
  },
  spinner: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
});
