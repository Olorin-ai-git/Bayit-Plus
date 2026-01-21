import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { EPGProgram, Timezone } from '../../services/epgApi';
import { isTV } from '../../utils/platform';

// Simple time formatting without luxon dependency
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

interface EPGProgramCardProps {
  program: EPGProgram;
  channelName: string;
  timezone: Timezone;
  onPress?: (program: EPGProgram) => void;
}

export const EPGProgramCard: React.FC<EPGProgramCardProps> = ({
  program,
  channelName,
  timezone,
  onPress,
}) => {
  const { t, i18n } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currentLang = i18n.language;

  // Get localized title
  const getLocalizedTitle = () => {
    if (currentLang === 'he') return program.title;
    if (currentLang === 'es') return program.title_es || program.title_en || program.title;
    return program.title_en || program.title;
  };

  // Get localized description
  const getLocalizedDescription = () => {
    if (currentLang === 'he') return program.description;
    if (currentLang === 'es')
      return program.description_es || program.description_en || program.description;
    return program.description_en || program.description;
  };

  const startTime = formatTimeFromISO(program.start_time, timezone);
  const endTime = formatTimeFromISO(program.end_time, timezone);
  const timeLabel = `${startTime} - ${endTime}`;

  const isPast = program.is_past;
  const isNow = program.is_now;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.02,
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
      className="mb-4"
    >
      <Animated.View
        className={`flex-row bg-black/20 rounded-3xl border-2 overflow-hidden ${
          isFocused ? 'border-purple-500 bg-purple-900/20' : 'border-white/10'
        } ${isNow ? 'border-purple-500/40 bg-purple-500/10' : ''} ${isPast ? 'opacity-60' : ''}`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        {/* Thumbnail */}
        {program.thumbnail ? (
          <Image
            source={{ uri: program.thumbnail }}
            className="rounded-l-3xl"
            style={{ width: isTV ? 180 : 100, height: isTV ? 120 : 80 }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="bg-black/40 justify-center items-center"
            style={{ width: isTV ? 180 : 100, height: isTV ? 120 : 80 }}
          >
            <Text style={{ fontSize: isTV ? 48 : 32 }}>📺</Text>
          </View>
        )}

        {/* Content */}
        <View className="flex-1 p-4">
          {/* Header */}
          <View className="flex-row justify-between items-start mb-1">
            <Text
              className="flex-1 text-white font-bold mr-2"
              style={{ fontSize: isTV ? 20 : 16 }}
              numberOfLines={2}
            >
              {getLocalizedTitle()}
            </Text>
            {isNow && (
              <View className="bg-red-500 px-2 py-0.5 rounded-full">
                <Text className="text-white font-bold" style={{ fontSize: isTV ? 12 : 10 }}>
                  {t('common.live', 'LIVE')}
                </Text>
              </View>
            )}
          </View>

          {/* Channel & Time */}
          <View className="flex-row items-center flex-wrap mb-1">
            <Text className="text-gray-400 font-medium" style={{ fontSize: isTV ? 14 : 12 }}>
              {channelName}
            </Text>
            <Text className="text-white/40 mx-2" style={{ fontSize: isTV ? 14 : 12 }}>•</Text>
            <Text className="text-gray-400" style={{ fontSize: isTV ? 14 : 12 }}>
              🕐 {timeLabel}
            </Text>
            {program.category && (
              <>
                <Text className="text-white/40 mx-2" style={{ fontSize: isTV ? 14 : 12 }}>•</Text>
                <Text className="text-gray-400" style={{ fontSize: isTV ? 14 : 12 }}>
                  {program.category}
                </Text>
              </>
            )}
          </View>

          {/* Description */}
          {getLocalizedDescription() && (
            <Text
              className="text-white/60 mb-2"
              style={{ fontSize: isTV ? 14 : 12 }}
              numberOfLines={2}
            >
              {getLocalizedDescription()}
            </Text>
          )}

          {/* Genres & Rating */}
          <View className="flex-row flex-wrap gap-1">
            {program.genres?.slice(0, 3).map((genre, index) => (
              <View key={index} className="bg-white/10 px-2 py-0.5 rounded-full">
                <Text className="text-white/70" style={{ fontSize: isTV ? 12 : 10 }}>
                  {genre}
                </Text>
              </View>
            ))}
            {program.rating && (
              <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#eab30820' }}>
                <Text style={{ fontSize: isTV ? 12 : 10, color: '#fbbf24' }}>
                  {program.rating}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default EPGProgramCard;
