import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
  Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, borderRadius, spacing } from '@olorin/design-tokens';
import { isTV } from '../../utils/platform';

export interface Chapter {
  id?: string;
  title: string;
  start_time: number;
  end_time: number;
  category: string;
  summary?: string;
  thumbnail?: string;
}

interface ChapterItemProps {
  chapter: Chapter;
  isActive: boolean;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
}

// Category colors using theme tokens for consistency
const getCategoryColor = (category: string): string => {
  const categoryColorMap: Record<string, string> = {
    intro: colors.primary,          // purple
    news: colors.error,             // red
    security: colors.warning,       // orange
    politics: colors.primary,       // purple
    economy: colors.success,        // green
    sports: colors.gold,            // yellow/gold
    weather: colors.primary,        // purple (cyan alternative)
    culture: colors.secondary,      // deep purple (pink alternative)
    conclusion: colors.textMuted,   // gray
    flashback: colors.primaryDark,  // dark purple (indigo alternative)
    journey: colors.success,        // green (teal alternative)
    climax: colors.error,           // red (rose alternative)
    setup: colors.warning,          // orange/amber
    action: colors.error,           // red
    conflict: colors.warning,       // orange
    cliffhanger: colors.secondary,  // deep purple (violet alternative)
    main: colors.primary,           // purple (blue alternative)
  };

  return categoryColorMap[category] || colors.primary;
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const ChapterItem: React.FC<ChapterItemProps> = ({
  chapter,
  isActive,
  onPress,
  hasTVPreferredFocus = false,
}) => {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const categoryColor = getCategoryColor(chapter.category);

  const handleFocus = () => {
    setIsFocused(true);
    if (isTV || Platform.OS !== 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1.02,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (isTV || Platform.OS !== 'web') {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={0.8}
      // @ts-ignore - TV-specific prop
      hasTVPreferredFocus={hasTVPreferredFocus}
    >
      <Animated.View
        className={`flex-row items-center rounded-lg p-4 mb-2 border min-h-[80px] ${
          isActive ? 'bg-purple-500/20 border-purple-500/50' : 'bg-white/5 border-transparent'
        } ${isFocused ? 'border-purple-500 border-[3px] shadow-purple-500/50' : ''}`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        {/* Category indicator bar */}
        <View className="w-1 self-stretch rounded-sm ml-2" style={{ backgroundColor: categoryColor }} />

        {/* Thumbnail */}
        {chapter.thumbnail && (
          <View className="relative w-20 h-15 rounded-md overflow-hidden mx-2">
            <Image
              source={{ uri: chapter.thumbnail }}
              className="w-full h-full"
              resizeMode="cover"
            />
            <View className="absolute bottom-0 left-0 right-0 bg-black/40 px-1 py-0.5">
              <View className="px-1 py-0.5 rounded-sm self-start" style={{ backgroundColor: categoryColor }}>
                <Text className="text-[10px] font-semibold text-white tabular-nums">
                  {formatTime(chapter.start_time)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View className="flex-1 mx-4 justify-center">
          {/* Title and time row */}
          <View className="flex-row justify-between items-start mb-1">
            <Text
              className={`text-base font-semibold flex-1 text-right leading-5 ${
                isActive ? 'text-purple-500' : 'text-white'
              }`}
              numberOfLines={2}
            >
              {chapter.title}
            </Text>
            {!chapter.thumbnail && (
              <Text className="text-xs text-gray-400 mr-2 tabular-nums">{formatTime(chapter.start_time)}</Text>
            )}
          </View>

          {/* Summary (if available) */}
          {chapter.summary && (
            <Text className="text-[13px] text-gray-300 leading-[18px] mb-1 text-right" numberOfLines={2}>
              {chapter.summary}
            </Text>
          )}

          {/* Category badge row */}
          <View className="flex-row items-center justify-end mt-1 gap-2">
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${categoryColor}33` }}>
              <Text className="text-[11px] font-medium" style={{ color: categoryColor }}>
                {t(`chapters.categories.${chapter.category}`, chapter.category)}
              </Text>
            </View>
            {isActive && (
              <Text className="text-[11px] text-purple-500">{t('chapters.current')}</Text>
            )}
          </View>
        </View>

        {/* Play indicator */}
        <View className={`w-9 h-9 rounded-full justify-center items-center ${
          isActive ? 'bg-purple-500' : 'bg-white/5'
        }`}>
          <Text className={`text-sm ${isActive ? 'text-black' : 'text-gray-400'}`}>
            {isActive ? '▶' : '▷'}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default ChapterItem;
