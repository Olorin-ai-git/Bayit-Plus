/**
 * StageTooltip Component
 * Displays detailed information about an upload stage
 */

import React from 'react';
import { View, Text } from 'react-native';
import { colors, spacing } from '@bayit/shared/theme';
import { UPLOAD_STAGES } from '../constants';
import { getStageDescription, getEstimatedTime } from '../utils';

interface StageTooltipProps {
  stage: typeof UPLOAD_STAGES[number];
  status: string;
  fileSize?: number;
  visible: boolean;
}

export const StageTooltip: React.FC<StageTooltipProps> = ({ stage, status, fileSize, visible }) => {
  if (!visible) return null;

  return (
    <View className="bg-black/95 backdrop-blur-xl rounded-xl p-4 mt-1 mb-3 border border-white/10">
      <Text className="text-sm font-semibold text-white mb-2">
        {stage.label}
      </Text>
      <Text className="text-xs text-white/80 mb-2 leading-4">
        {getStageDescription(stage.key)}
      </Text>
      <Text className="text-[11px] text-purple-500 mb-1">
        Estimated: {getEstimatedTime(stage.key, fileSize)}
      </Text>
      <Text className="text-[11px] text-gray-500">
        Status: {status || 'pending'}
      </Text>
    </View>
  );
};
