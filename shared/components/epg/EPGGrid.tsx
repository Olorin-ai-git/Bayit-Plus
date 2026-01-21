import React from 'react';
import {
  View,
  Text,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { EPGProgram, Channel, Timezone } from '../../services/epgApi';
import { EPGChannelRow } from './EPGChannelRow';
import { GlassView } from '../ui';
import { isTV } from '../../utils/platform';

// Simple time formatting for timeline
const formatTimeSlot = (date: Date, timezone: Timezone): string => {
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone === 'israel' ? 'Asia/Jerusalem' : undefined,
  };
  return date.toLocaleTimeString('en-US', options);
};

interface EPGTimelineProps {
  startTime: Date;
  endTime: Date;
  timezone: Timezone;
  intervalMinutes?: number;
}

const EPGTimeline: React.FC<EPGTimelineProps> = ({
  startTime,
  endTime,
  timezone,
  intervalMinutes = 30,
}) => {
  // Generate time slots
  const slots: Date[] = [];
  const current = new Date(startTime);
  while (current <= endTime) {
    slots.push(new Date(current));
    current.setMinutes(current.getMinutes() + intervalMinutes);
  }

  return (
    <View className="flex-row bg-black/30 border-b border-white/10">
      {/* Spacer for channel column */}
      <View
        className="bg-black/40 border-r border-white/10"
        style={{ width: isTV ? 200 : 140 }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: 8 }}
      >
        {slots.map((slot, index) => {
          const now = new Date();
          const isCurrentSlot =
            slot <= now &&
            new Date(slot.getTime() + intervalMinutes * 60 * 1000) > now;

          return (
            <View
              key={index}
              className={`items-center py-4 border-r border-white/5 ${
                isCurrentSlot ? 'bg-purple-500/20' : ''
              }`}
              style={{ width: isTV ? 120 : 80 }}
            >
              <Text
                className={`font-medium ${
                  isCurrentSlot ? 'text-purple-500 font-bold' : 'text-gray-400'
                }`}
                style={{ fontSize: isTV ? 14 : 12 }}
              >
                {formatTimeSlot(slot, timezone)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

interface EPGGridProps {
  channels: Channel[];
  programs: EPGProgram[];
  startTime: Date;
  endTime: Date;
  timezone: Timezone;
  onProgramPress?: (program: EPGProgram) => void;
  onChannelPress?: (channel: Channel) => void;
}

export const EPGGrid: React.FC<EPGGridProps> = ({
  channels,
  programs,
  startTime,
  endTime,
  timezone,
  onProgramPress,
  onChannelPress,
}) => {
  const { t } = useTranslation();

  // Show empty state if no channels
  if (channels.length === 0) {
    return (
      <GlassView className="p-8 items-center justify-center rounded-3xl">
        <View className="w-20 h-20 rounded-full bg-purple-500/10 justify-center items-center mb-4">
          <Text style={{ fontSize: 40 }}>📺</Text>
        </View>
        <Text className="text-white font-semibold mb-2 text-center" style={{ fontSize: isTV ? 24 : 20 }}>
          {t('epg.noChannels', 'No TV Guide Data Available')}
        </Text>
        <Text className="text-gray-400 text-center max-w-[400px]" style={{ fontSize: isTV ? 16 : 14 }}>
          {t('epg.noChannelsDescription', 'The TV programming schedule is currently unavailable.')}
        </Text>
      </GlassView>
    );
  }

  return (
    <GlassView className="flex-1 rounded-3xl overflow-hidden">
      {/* Timeline Header */}
      <EPGTimeline
        startTime={startTime}
        endTime={endTime}
        timezone={timezone}
        intervalMinutes={30}
      />

      {/* Channel Rows */}
      <ScrollView
        className="flex-1"
        style={{ maxHeight: isTV ? 600 : 400 }}
        showsVerticalScrollIndicator={false}
      >
        {channels.map((channel) => (
          <EPGChannelRow
            key={channel.id}
            channel={channel}
            programs={programs}
            startTime={startTime}
            endTime={endTime}
            timezone={timezone}
            onProgramPress={onProgramPress}
            onChannelPress={onChannelPress}
          />
        ))}
      </ScrollView>
    </GlassView>
  );
};

export default EPGGrid;
