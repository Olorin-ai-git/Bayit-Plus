import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { EPGProgram, Channel, Timezone } from '../../services/epgApi';
import { isTV } from '../../utils/platform';

// Simple time formatting
const formatTimeFromISO = (isoString: string, timezone: Timezone): string => {
  const date = new Date(isoString);
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone === 'israel' ? 'Asia/Jerusalem' : undefined,
  };
  return date.toLocaleTimeString('en-US', options);
};

interface EPGProgramSlotProps {
  program: EPGProgram;
  timezone: Timezone;
  onPress?: (program: EPGProgram) => void;
}

const EPGProgramSlot: React.FC<EPGProgramSlotProps> = ({
  program,
  timezone,
  onPress,
}) => {
  const { i18n, t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currentLang = i18n.language;

  const getLocalizedTitle = () => {
    if (currentLang === 'he') return program.title;
    if (currentLang === 'es') return program.title_es || program.title_en || program.title;
    return program.title_en || program.title;
  };

  const startTime = formatTimeFromISO(program.start_time, timezone);
  const isNow = program.is_now;
  const isPast = program.is_past;

  // Calculate width based on duration (10px per minute, min 120px)
  const durationMinutes = program.duration_seconds / 60;
  const width = Math.max(120, durationMinutes * 3);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.05,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={() => onPress?.(program)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={0.8}
    >
      <Animated.View
        className={`p-2 bg-white/5 rounded-md border-2 justify-start ${
          isFocused ? 'bg-purple-900/30 border-purple-500' : 'border-transparent'
        } ${isNow ? 'bg-purple-500/20 border-purple-500/50' : ''} ${isPast ? 'opacity-50' : ''}`}
        style={{
          width,
          height: isTV ? 100 : 80,
          transform: [{ scale: scaleAnim }]
        }}
      >
        <View className="flex-row items-center mb-1">
          <Text className="text-gray-400 font-medium" style={{ fontSize: isTV ? 12 : 10 }}>
            {startTime}
          </Text>
          {isNow && (
            <View className="w-1.5 h-1.5 rounded-full bg-red-500 ml-1" />
          )}
        </View>
        <Text className="text-white font-semibold flex-1" style={{ fontSize: isTV ? 14 : 12 }} numberOfLines={2}>
          {getLocalizedTitle()}
        </Text>
        {program.category && (
          <Text className="text-gray-400" style={{ fontSize: isTV ? 11 : 9 }} numberOfLines={1}>
            {program.category}
          </Text>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

interface EPGChannelRowProps {
  channel: Channel;
  programs: EPGProgram[];
  startTime: Date;
  endTime: Date;
  timezone: Timezone;
  onProgramPress?: (program: EPGProgram) => void;
  onChannelPress?: (channel: Channel) => void;
}

export const EPGChannelRow: React.FC<EPGChannelRowProps> = ({
  channel,
  programs,
  startTime,
  endTime,
  timezone,
  onProgramPress,
  onChannelPress,
}) => {
  const { i18n, t } = useTranslation();
  const [isChannelFocused, setIsChannelFocused] = useState(false);

  const currentLang = i18n.language;

  const getLocalizedChannelName = () => {
    if (currentLang === 'he') return channel.name;
    if (currentLang === 'es') return channel.name_es || channel.name_en || channel.name;
    return channel.name_en || channel.name;
  };

  // Filter programs for this channel
  const channelPrograms = programs.filter((p) => p.channel_id === channel.id);

  return (
    <View className="flex-row border-b border-white/5">
      {/* Channel Info */}
      <TouchableOpacity
        onPress={() => onChannelPress?.(channel)}
        onFocus={() => setIsChannelFocused(true)}
        onBlur={() => setIsChannelFocused(false)}
        className={`flex-row items-center px-4 py-2 bg-black/30 border-r border-white/10 border-2 ${
          isChannelFocused ? 'bg-purple-900/30 border-purple-500' : 'border-transparent'
        }`}
        style={{ width: isTV ? 200 : 140 }}
      >
        {channel.logo ? (
          <Image
            source={{ uri: channel.logo }}
            className="rounded-sm"
            style={{ width: isTV ? 48 : 36, height: isTV ? 48 : 36 }}
            resizeMode="contain"
          />
        ) : (
          <View
            className="bg-white/10 rounded-sm justify-center items-center"
            style={{ width: isTV ? 48 : 36, height: isTV ? 48 : 36 }}
          >
            <Text style={{ fontSize: isTV ? 24 : 18 }}>📺</Text>
          </View>
        )}
        <View className="flex-1 ml-2">
          <Text className="text-white font-semibold" style={{ fontSize: isTV ? 16 : 14 }} numberOfLines={1}>
            {getLocalizedChannelName()}
          </Text>
          {channel.requires_subscription === 'premium' && (
            <Text style={{ fontSize: isTV ? 12 : 10, color: '#fbbf24', marginTop: 2 }}>
              ⭐ {t('common.premium', 'Premium')}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Programs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 4 }}
      >
        {channelPrograms.length > 0 ? (
          channelPrograms.map((program) => (
            <View key={program.id} style={{ marginHorizontal: 4, marginVertical: 4 }}>
              <EPGProgramSlot
                program={program}
                timezone={timezone}
                onPress={onProgramPress}
              />
            </View>
          ))
        ) : (
          <View
            className="justify-center items-center"
            style={{ width: 300, height: isTV ? 100 : 80 }}
          >
            <Text className="text-white/40" style={{ fontSize: isTV ? 14 : 12 }}>
              {t('epg.noPrograms', 'No programs scheduled')}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default EPGChannelRow;
