/**
 * StageIndicator Component
 * Visual progress indicator showing upload pipeline stages
 */

import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing } from '@olorin/design-tokens';
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
      <View style={[styles.stageRow, isRTL && styles.flexRowReverse]}>
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
            iconColor = colors.success.DEFAULT;
            bgColor = colors.success.DEFAULT + '20';
            borderColor = colors.success.DEFAULT + '40';
          } else if (isActive) {
            iconColor = colors.primary.DEFAULT;
            bgColor = colors.primary.DEFAULT + '20';
            borderColor = colors.primary.DEFAULT + '40';
          } else if (isSkipped) {
            iconColor = colors.warning.DEFAULT;
            bgColor = colors.warning.DEFAULT + '15';
            borderColor = colors.warning.DEFAULT + '30';
          } else if (isScheduled) {
            iconColor = colors.info.DEFAULT;
            bgColor = colors.info.DEFAULT + '15';
            borderColor = colors.info.DEFAULT + '30';
          }

          const showSeparator = index === criticalStagesCount;

          return (
            <React.Fragment key={stage.key}>
              {index > 0 && !showSeparator && (
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: isCompleted ? colors.success.DEFAULT : colors.glassBorder }
                  ]}
                />
              )}
              {showSeparator && (
                <View style={[styles.separatorContainer, { marginHorizontal: spacing.sm }]}>
                  <View style={styles.separatorDot} />
                </View>
              )}
              <Pressable
                onPress={() => setSelectedStage(selectedStage === stage.key ? null : stage.key)}
                style={[
                  styles.stageButton,
                  isEnrichmentStage ? styles.enrichmentStage : styles.criticalStage,
                  {
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                  },
                ]}
              >
                <Icon size={isEnrichmentStage ? 10 : 12} color={iconColor} />
                {isActive && (
                  <View style={styles.activityIndicator}>
                    <ActivityIndicator size={8} color={colors.primary.DEFAULT} />
                  </View>
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
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    justifyContent: 'center',
  },
  flexRowReverse: {
    flexDirection: 'row-reverse',
  },
  connector: {
    width: 20,
    height: 2,
    marginHorizontal: 2,
  },
  separatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  separatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6b7280',
  },
  stageButton: {
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
  criticalStage: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  activityIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
});
