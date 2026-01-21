import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { EPGProgram, Channel, Timezone } from '../../services/epgApi';
import { EPGChannelRow } from './EPGChannelRow';
import { GlassView } from '../ui';
import { colors, spacing, borderRadius } from '../../theme';
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
    <View style={styles.timeline}>
      {/* Spacer for channel column */}
      <View style={styles.timelineChannelSpacer} />
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.timelineContent}
      >
        {slots.map((slot, index) => {
          const now = new Date();
          const isCurrentSlot =
            slot <= now &&
            new Date(slot.getTime() + intervalMinutes * 60 * 1000) > now;

          return (
            <View
              key={index}
              style={[
                styles.timeSlot,
                isCurrentSlot && styles.timeSlotCurrent,
              ]}
            >
              <Text
                style={[
                  styles.timeSlotText,
                  isCurrentSlot && styles.timeSlotTextCurrent,
                ]}
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
      <GlassView style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>📺</Text>
        </View>
        <Text style={styles.emptyTitle}>
          {t('epg.noChannels', 'No TV Guide Data Available')}
        </Text>
        <Text style={styles.emptySubtitle}>
          {t('epg.noChannelsDescription', 'The TV programming schedule is currently unavailable.')}
        </Text>
      </GlassView>
    );
  }

  return (
    <GlassView style={styles.container}>
      {/* Timeline Header */}
      <EPGTimeline
        startTime={startTime}
        endTime={endTime}
        timezone={timezone}
        intervalMinutes={30}
      />

      {/* Channel Rows */}
      <ScrollView
        style={styles.channelRows}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  timeline: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  timelineChannelSpacer: {
    width: isTV ? 200 : 140,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  timelineContent: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
  },
  timeSlot: {
    width: isTV ? 120 : 80,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.05)',
  },
  timeSlotCurrent: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  timeSlotText: {
    fontSize: isTV ? 14 : 12,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  timeSlotTextCurrent: {
    color: colors.primary,
    fontWeight: '700',
  },
  channelRows: {
    flex: 1,
    maxHeight: isTV ? 600 : 400,
  },
  emptyContainer: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyIconText: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: isTV ? 24 : 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 400,
  },
});

export default EPGGrid;
