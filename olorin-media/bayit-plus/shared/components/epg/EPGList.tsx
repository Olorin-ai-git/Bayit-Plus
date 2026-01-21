import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { EPGProgram, Channel, Timezone } from '../../services/epgApi';
import { EPGProgramCard } from './EPGProgramCard';
import { GlassView } from '../ui';
import { colors, spacing, borderRadius } from '../../theme';
import { isTV } from '../../utils/platform';

interface EPGListProps {
  channels: Channel[];
  programs: EPGProgram[];
  timezone: Timezone;
  onProgramPress?: (program: EPGProgram) => void;
}

export const EPGList: React.FC<EPGListProps> = ({
  channels,
  programs,
  timezone,
  onProgramPress,
}) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language;

  // Create a channel map for quick lookup
  const channelMap = useMemo(() => {
    return channels.reduce((map, channel) => {
      map[channel.id] = channel;
      return map;
    }, {} as Record<string, Channel>);
  }, [channels]);

  // Sort programs by start time
  const sortedPrograms = useMemo(() => {
    return [...programs].sort((a, b) => {
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });
  }, [programs]);

  const getLocalizedChannelName = (channel: Channel) => {
    if (currentLang === 'he') return channel.name;
    if (currentLang === 'es') return channel.name_es || channel.name_en || channel.name;
    return channel.name_en || channel.name;
  };

  // Show empty state if no programs
  if (sortedPrograms.length === 0) {
    return (
      <GlassView style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>📺</Text>
        </View>
        <Text style={styles.emptyTitle}>{t('epg.noPrograms', 'No Programs Found')}</Text>
        <Text style={styles.emptySubtitle}>
          {t('epg.noProgramsDescription', 'No programs are available for the selected time range.')}
        </Text>
      </GlassView>
    );
  }

  const renderItem = ({ item: program }: { item: EPGProgram }) => {
    const channel = channelMap[program.channel_id];
    if (!channel) return null;

    return (
      <EPGProgramCard
        program={program}
        channelName={getLocalizedChannelName(channel)}
        timezone={timezone}
        onPress={onProgramPress}
      />
    );
  };

  return (
    <FlatList
      data={sortedPrograms}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.md,
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
  },
  emptySubtitle: {
    fontSize: isTV ? 16 : 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 400,
  },
});

export default EPGList;
