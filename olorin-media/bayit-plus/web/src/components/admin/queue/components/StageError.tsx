/**
 * StageError Component
 * Displays error information for failed upload stages
 */

import React from 'react';
import { View, Text } from 'react-native';
import { AlertCircle } from 'lucide-react';
import { colors, spacing } from '@bayit/shared/theme';
import { QueueJob } from '../types';

interface StageErrorProps {
  job: QueueJob;
}

export const StageError: React.FC<StageErrorProps> = ({ job }) => {
  const failedStages = Object.entries(job.stages || {})
    .filter(([_, status]) => status === 'failed')
    .map(([key, _]) => key);

  if (failedStages.length === 0 || !job.error_message) return null;

  return (
    <View className="bg-red-500/10 border-l-[3px] border-red-500 rounded-lg p-3 mt-3">
      <View className="flex-row items-center mb-2">
        <AlertCircle size={14} color={colors.error} />
        <Text className="text-xs font-semibold text-red-500 ml-2">
          Failed at: {failedStages.join(', ')}
        </Text>
      </View>
      <Text className="text-[11px] text-gray-500 leading-4">
        {job.error_message}
      </Text>
    </View>
  );
};
