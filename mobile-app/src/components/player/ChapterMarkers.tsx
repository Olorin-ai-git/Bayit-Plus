/**
 * ChapterMarkers - Visual chapter markers on progress bar
 *
 * Features:
 * - Shows chapter divisions on progress bar
 * - Tap to seek to chapter
 * - Active chapter highlighting
 * - Category color coding
 * - Touch-friendly hit areas
 */

import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { colors } from '@olorin/design-tokens';

export interface Chapter {
  id?: string;
  title: string;
  start_time: number;
  end_time: number;
  category: string;
  summary?: string;
}

interface ChapterMarkersProps {
  chapters: Chapter[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  progressBarWidth: number;
}

const getCategoryColor = (category: string): string => {
  const categoryColorMap: Record<string, string> = {
    intro: colors.primary,
    news: colors.error,
    security: '#f59e0b',
    politics: colors.primary,
    economy: '#22c55e',
    sports: '#eab308',
    weather: colors.primary,
    culture: colors.secondary,
    conclusion: colors.textSecondary,
    flashback: '#4f46e5',
    journey: '#22c55e',
    climax: colors.error,
    setup: '#f59e0b',
    action: colors.error,
    conflict: '#f59e0b',
    cliffhanger: '#8b5cf6',
    main: colors.primary,
  };

  return categoryColorMap[category] || colors.primary;
};

export const ChapterMarkers: React.FC<ChapterMarkersProps> = ({
  chapters,
  duration,
  currentTime,
  onSeek,
  progressBarWidth,
}) => {
  if (chapters.length === 0 || duration <= 0 || progressBarWidth <= 0) {
    return null;
  }

  const handleMarkerPress = useCallback((chapter: Chapter) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    onSeek(chapter.start_time);
  }, [onSeek]);

  // Find active chapter
  const activeChapterIndex = chapters.findIndex(
    (ch) => currentTime >= ch.start_time && currentTime < ch.end_time
  );

  return (
    <View className="absolute top-0 left-0 h-1" style={{ width: progressBarWidth }}>
      {chapters.map((chapter, index) => {
        const position = (chapter.start_time / duration) * progressBarWidth;
        const isActive = index === activeChapterIndex;
        const categoryColor = getCategoryColor(chapter.category);

        // Don't render marker at the very start
        if (chapter.start_time < 1) return null;

        return (
          <TouchableOpacity
            key={`${chapter.start_time}-${index}`}
            className="absolute w-6 h-6 justify-center items-center -top-2.5"
            style={{ left: position - 12 }}
            onPress={() => handleMarkerPress(chapter)}
            hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <View
              className={`rounded-sm opacity-80 ${isActive ? 'w-1 h-4 opacity-100' : 'w-0.5 h-3'}`}
              style={{ backgroundColor: categoryColor }}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default ChapterMarkers;
