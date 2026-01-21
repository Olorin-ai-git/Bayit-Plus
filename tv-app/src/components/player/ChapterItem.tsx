import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme';
import { isTV } from '../../utils/platform';

export interface Chapter {
  id?: string;
  title: string;
  start_time: number;
  end_time: number;
  category: string;
  summary?: string;
}

interface ChapterItemProps {
  chapter: Chapter;
  isActive: boolean;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
}

// Category colors matching web app
const categoryColors: Record<string, string> = {
  intro: '#a855f7',     // blue
  news: '#ef4444',      // red
  security: '#f97316',  // orange
  politics: '#a855f7',  // purple
  economy: '#22c55e',   // green
  sports: '#eab308',    // yellow
  weather: '#06b6d4',   // cyan
  culture: '#ec4899',   // pink
  conclusion: '#6b7280', // gray
  flashback: '#6366f1', // indigo
  journey: '#14b8a6',   // teal
  climax: '#f43f5e',    // rose
  setup: '#f59e0b',     // amber
  action: '#dc2626',    // red-600
  conflict: '#ea580c',  // orange-600
  cliffhanger: '#8b5cf6', // violet
  main: '#2563eb',      // blue-600
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

  const categoryColor = categoryColors[chapter.category] || colors.primary;

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
        className={`flex-row items-center rounded-2xl p-4 mb-2 border ${isActive ? 'bg-[#6b21a8]/30 border-[#a855f7]/60' : 'bg-white/5 border-transparent'} ${isFocused ? 'border-[#6b21a8]' : ''}`}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        {/* Category indicator bar */}
        <View className="w-1 h-12 rounded ml-2" style={{ backgroundColor: categoryColor }} />

        <View className="flex-1 mx-4">
          {/* Title and time row */}
          <View className="flex-row justify-between items-center">
            <Text
              className={`text-base font-semibold flex-1 text-right ${isActive ? 'text-[#a855f7]' : 'text-white'}`}
              numberOfLines={1}
            >
              {chapter.title}
            </Text>
            <Text className="text-xs text-[#9ca3af] mr-2">{formatTime(chapter.start_time)}</Text>
          </View>

          {/* Category badge row */}
          <View className="flex-row items-center justify-end mt-1 gap-2">
            <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${categoryColor}33` }}>
              <Text className="text-[11px] font-medium" style={{ color: categoryColor }}>
                {t(`chapters.categories.${chapter.category}`, chapter.category)}
              </Text>
            </View>
            {isActive && (
              <Text className="text-[11px] text-[#a855f7]">{t('chapters.current')}</Text>
            )}
          </View>
        </View>

        {/* Play indicator */}
        <View className={`w-9 h-9 rounded-full justify-center items-center ${isActive ? 'bg-[#6b21a8]' : 'bg-white/10'}`}>
          <Text className={`text-sm ${isActive ? 'text-[#0d0d18]' : 'text-[#9ca3af]'}`}>
            {isActive ? '▶' : '▷'}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default ChapterItem;
