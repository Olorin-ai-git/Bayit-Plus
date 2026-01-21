/**
 * Schedule Section Component
 * Displays EPG schedule for live channels
 */

import { View, Text } from 'react-native';
import { GlassCard } from '@bayit/shared/ui';
import { colors } from '@bayit/shared/theme';
import { ScheduleItem } from '../types';

interface ScheduleSectionProps {
  schedule: ScheduleItem[];
  sectionTitle: string;
  nowLabel: string;
}

export function ScheduleSection({
  schedule,
  sectionTitle,
  nowLabel,
}: ScheduleSectionProps) {
  if (!schedule || schedule.length === 0) {
    return null;
  }

  return (
    <View className="w-80">
      <Text className="text-lg font-semibold text-white mb-3">{sectionTitle}</Text>
      {schedule.map((show, i) => (
        <GlassCard
          key={i}
          className={`p-3 mb-3 ${show.isNow ? 'border border-green-500' : ''}`}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm text-gray-400">{show.time}</Text>
            {show.isNow && (
              <View className="bg-red-500 px-2 py-0.5 rounded">
                <Text className="text-[10px] font-bold text-white">{nowLabel}</Text>
              </View>
            )}
          </View>
          <Text className="text-sm font-medium text-white">{show.title}</Text>
        </GlassCard>
      ))}
    </View>
  );
}
