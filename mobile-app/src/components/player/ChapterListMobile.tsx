/**
 * ChapterListMobile - Mobile-optimized chapter list for BottomSheet
 *
 * Features:
 * - Vertical scrollable list optimized for touch
 * - Active chapter highlighting
 * - Auto-scroll to active chapter
 * - Haptic feedback on selection
 * - RTL support
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { GlassView } from '@bayit/shared';
import { useDirection } from '@bayit/shared-hooks';
import { colors } from '../../theme';

export interface Chapter {
  id?: string;
  title: string;
  start_time: number;
  end_time: number;
  category: string;
  summary?: string;
  thumbnail?: string;
}

interface ChapterListMobileProps {
  chapters: Chapter[];
  currentTime: number;
  isLoading?: boolean;
  onSeek: (time: number) => void;
  onClose?: () => void;
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

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const ChapterListMobile: React.FC<ChapterListMobileProps> = ({
  chapters,
  currentTime,
  isLoading = false,
  onSeek,
  onClose,
}) => {
  const { t } = useTranslation();
  const { isRTL, textAlign } = useDirection();
  const flatListRef = useRef<FlatList>(null);

  // Find active chapter index
  const activeChapterIndex = chapters.findIndex(
    (ch) => currentTime >= ch.start_time && currentTime < ch.end_time
  );

  // Auto-scroll to active chapter
  useEffect(() => {
    if (activeChapterIndex >= 0 && flatListRef.current && chapters.length > 0) {
      const scrollIndex = Math.max(0, activeChapterIndex - 1);
      flatListRef.current.scrollToIndex({
        index: scrollIndex,
        animated: true,
        viewPosition: 0.3,
      });
    }
  }, [activeChapterIndex, chapters.length]);

  const handleChapterPress = useCallback((chapter: Chapter) => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    onSeek(chapter.start_time);
    onClose?.();
  }, [onSeek, onClose]);

  const renderChapterItem = ({ item, index }: { item: Chapter; index: number }) => {
    const isActive = index === activeChapterIndex;
    const categoryColor = getCategoryColor(item.category);

    return (
      <TouchableOpacity
        onPress={() => handleChapterPress(item)}
        activeOpacity={0.7}
      >
        <GlassView className={`rounded-lg mb-2 p-4 ${isActive ? 'border border-[${colors.primary}]' : ''}`}>
          <View className={isRTL ? 'flex-row-reverse items-center' : 'flex-row items-center'}>
            {/* Category bar */}
            <View className="w-1 h-full min-h-[50px] rounded-sm mr-4" style={{ backgroundColor: categoryColor }} />

            {/* Chapter info */}
            <View className="flex-1">
              <View className={isRTL ? 'flex-row-reverse justify-between items-start mb-1' : 'flex-row justify-between items-start mb-1'}>
                <Text
                  className={`text-[15px] font-semibold flex-1 leading-5 ${isActive ? `text-[${colors.primary}]` : `text-[${colors.text}]`}`}
                  style={{ textAlign }}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text className={`text-xs text-[${colors.textSecondary}] ml-2`} style={{ fontVariant: ['tabular-nums'] }}>
                  {formatTime(item.start_time)}
                </Text>
              </View>

              {item.summary && (
                <Text
                  className={`text-[13px] text-[${colors.textSecondary}] leading-[18px] mb-1`}
                  style={{ textAlign }}
                  numberOfLines={1}
                >
                  {item.summary}
                </Text>
              )}

              <View className={`gap-2 mt-1 ${isRTL ? 'flex-row-reverse items-center' : 'flex-row items-center'}`}>
                <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: `${categoryColor}33` }}>
                  <Text className="text-[11px] font-medium" style={{ color: categoryColor }}>
                    {t(`chapters.categories.${item.category}`, item.category)}
                  </Text>
                </View>
                {isActive && (
                  <View className="bg-[rgba(168,85,247,0.2)] px-2 py-0.5 rounded-full">
                    <Text className={`text-[11px] text-[${colors.primary}] font-medium`}>{t('chapters.current')}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Play indicator */}
            <View className={`w-10 h-10 rounded-full justify-center items-center ml-4 ${isActive ? `bg-[${colors.primary}]` : 'bg-white/10'}`}>
              <Text className={`text-sm ${isActive ? `text-[${colors.text}]` : `text-[${colors.textSecondary}]`}`}>
                {isActive ? '▶' : '▷'}
              </Text>
            </View>
          </View>
        </GlassView>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View className="items-center py-8">
      <Text className="text-5xl mb-4 opacity-50">📑</Text>
      <Text className={`text-sm text-[${colors.textSecondary}]`} style={{ textAlign }}>
        {t('chapters.noChapters')}
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View className="items-center py-8">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text className={`text-sm text-[${colors.textSecondary}]`} style={{ textAlign }}>
        {t('chapters.generating')}
      </Text>
    </View>
  );

  const getItemLayout = (_: any, index: number) => ({
    length: 100,
    offset: 100 * index,
    index,
  });

  if (isLoading) {
    return renderLoadingState();
  }

  if (chapters.length === 0) {
    return renderEmptyState();
  }

  return (
    <FlatList
      ref={flatListRef}
      data={chapters}
      keyExtractor={(item, index) => `${item.start_time}-${index}`}
      renderItem={renderChapterItem}
      contentContainerClassName="px-4 pb-6"
      showsVerticalScrollIndicator={false}
      getItemLayout={getItemLayout}
      onScrollToIndexFailed={() => {
        // Handle scroll failure gracefully
      }}
    />
  );
};

export default ChapterListMobile;
