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
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@bayit/shared';
import { useDirection } from '@bayit/shared-hooks';
import { spacing, colors, borderRadius } from '../../theme';

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        <GlassView style={[styles.chapterItem, isActive && styles.chapterItemActive]}>
          <View style={[styles.chapterContent, isRTL && styles.chapterContentRTL]}>
            {/* Category bar */}
            <View style={[styles.categoryBar, { backgroundColor: categoryColor }]} />

            {/* Chapter info */}
            <View style={styles.chapterInfo}>
              <View style={[styles.titleRow, isRTL && styles.titleRowRTL]}>
                <Text
                  style={[
                    styles.chapterTitle,
                    { textAlign },
                    isActive && styles.chapterTitleActive,
                  ]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text style={styles.chapterTime}>
                  {formatTime(item.start_time)}
                </Text>
              </View>

              {item.summary && (
                <Text
                  style={[styles.chapterSummary, { textAlign }]}
                  numberOfLines={1}
                >
                  {item.summary}
                </Text>
              )}

              <View style={[styles.badgeRow, isRTL && styles.badgeRowRTL]}>
                <View style={[styles.categoryBadge, { backgroundColor: `${categoryColor}33` }]}>
                  <Text style={[styles.categoryText, { color: categoryColor }]}>
                    {t(`chapters.categories.${item.category}`, item.category)}
                  </Text>
                </View>
                {isActive && (
                  <View style={styles.playingBadge}>
                    <Text style={styles.playingText}>{t('chapters.current')}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Play indicator */}
            <View style={[styles.playButton, isActive && styles.playButtonActive]}>
              <Text style={[styles.playIcon, isActive && styles.playIconActive]}>
                {isActive ? '▶' : '▷'}
              </Text>
            </View>
          </View>
        </GlassView>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📑</Text>
      <Text style={[styles.emptyText, { textAlign }]}>
        {t('chapters.noChapters')}
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.emptyState}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.emptyText, { textAlign }]}>
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
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      getItemLayout={getItemLayout}
      onScrollToIndexFailed={() => {
        // Handle scroll failure gracefully
      }}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  chapterItem: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  chapterItemActive: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  chapterContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chapterContentRTL: {
    flexDirection: 'row-reverse',
  },
  categoryBar: {
    width: 4,
    height: '100%',
    minHeight: 50,
    borderRadius: 2,
    marginRight: spacing.md,
  },
  chapterInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  titleRowRTL: {
    flexDirection: 'row-reverse',
  },
  chapterTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  chapterTitleActive: {
    color: colors.primary,
  },
  chapterTime: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
    fontVariant: ['tabular-nums'],
  },
  chapterSummary: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  badgeRowRTL: {
    flexDirection: 'row-reverse',
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  playingBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  playingText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  playButtonActive: {
    backgroundColor: colors.primary,
  },
  playIcon: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  playIconActive: {
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default ChapterListMobile;
