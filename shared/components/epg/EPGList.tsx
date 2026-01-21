import React, { useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { EPGProgram, Channel, Timezone } from '../../services/epgApi';
import { EPGProgramCard } from './EPGProgramCard';
import { GlassView } from '../ui';
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
      <GlassView className="p-8 items-center justify-center rounded-3xl">
        <View className="w-20 h-20 rounded-full bg-purple-500/10 justify-center items-center mb-4">
          <Text style={{ fontSize: 40 }}>📺</Text>
        </View>
        <Text className="text-white font-semibold mb-2" style={{ fontSize: isTV ? 24 : 20 }}>
          {t('epg.noPrograms', 'No Programs Found')}
        </Text>
        <Text className="text-gray-400 text-center max-w-[400px]" style={{ fontSize: isTV ? 16 : 14 }}>
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
      contentContainerStyle={{ padding: 16 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default EPGList;
