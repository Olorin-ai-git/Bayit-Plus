/**
 * StageIndicator Component
 * Visual progress indicator showing upload pipeline stages
 */

import React, { useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
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
      <View className={`flex-row items-center my-3 justify-center ${
        isRTL ? 'flex-row-reverse' : ''
      }`}>
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
                  className="w-5 h-0.5 mx-0.5"
                  style={{ backgroundColor: isCompleted ? colors.success : colors.glassBorder }}
                />
              )}
              {showSeparator && (
                <View className={`mx-${spacing.sm} items-center justify-center`}>
                  <View className="w-1 h-1 rounded-full bg-gray-500" />
                </View>
              )}
              <Pressable
                onPress={() => setSelectedStage(selectedStage === stage.key ? null : stage.key)}
                className={`${
                  isEnrichmentStage ? 'w-6 h-6 rounded-xl opacity-85' : 'w-7 h-7 rounded-full'
                } items-center justify-center border relative`}
                style={{
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                }}
              >
                <Icon size={isEnrichmentStage ? 10 : 12} color={iconColor} />
                {isActive && (
                  <View className="absolute -top-1 -right-1">
                    <ActivityIndicator size={8} color={colors.primary} />
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
