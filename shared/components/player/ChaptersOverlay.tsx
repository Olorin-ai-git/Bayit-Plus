import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { GlassView } from '../ui/GlassView';
import { ChapterItem, Chapter } from './ChapterItem';
import { colors, borderRadius, spacing } from '../../theme';

interface ChaptersOverlayProps {
  chapters: Chapter[];
  currentTime: number;
  isLoading?: boolean;
  visible: boolean;
  onClose: () => void;
  onSeek: (time: number) => void;
}

export const ChaptersOverlay: React.FC<ChaptersOverlayProps> = ({
  chapters,
  currentTime,
  isLoading = false,
  visible,
  onClose,
  onSeek,
}) => {
  const { t } = useTranslation();
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(-320)).current;

  // Find active chapter index
  const activeChapterIndex = chapters.findIndex(
    (ch) => currentTime >= ch.start_time && currentTime < ch.end_time
  );

  // Animate in/out
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : -320,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  // Auto-scroll to active chapter
  useEffect(() => {
    if (activeChapterIndex >= 0 && scrollViewRef.current && visible) {
      // Approximate item height (68px per item + 8px margin)
      const itemHeight = 76;
      const scrollPosition = Math.max(0, (activeChapterIndex - 2) * itemHeight);

      scrollViewRef.current.scrollTo({
        y: scrollPosition,
        animated: true,
      });
    }
  }, [activeChapterIndex, visible]);

  const handleChapterPress = (chapter: Chapter) => {
    onSeek(chapter.start_time);
  };

  if (!visible) return null;

  return (
    <Animated.View
      className="absolute top-0 right-0 bottom-0 w-80 z-50"
      style={{ transform: [{ translateX: slideAnim }] }}
    >
      <GlassView className="flex-1 rounded-l-2xl overflow-hidden" intensity="strong">
        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b border-white/10">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg">📑</Text>
            <Text className="text-lg font-semibold text-white">{t('chapters.title')}</Text>
            <Text className="text-sm text-gray-400">({chapters.length})</Text>
          </View>
          <TouchableOpacity
            className="w-8 h-8 rounded-full bg-white/10 justify-center items-center"
            onPress={onClose}
            accessibilityLabel={t('common.close')}
          >
            <Text className="text-base text-gray-300">✕</Text>
          </TouchableOpacity>
        </View>

        {/* Chapters List */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerStyle={{ padding: spacing.md }}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View className="flex-1 justify-center items-center py-24">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="text-sm text-gray-400 text-center">{t('chapters.generating')}</Text>
            </View>
          ) : chapters.length === 0 ? (
            <View className="flex-1 justify-center items-center py-24">
              <Text className="text-5xl opacity-50 mb-4">📑</Text>
              <Text className="text-sm text-gray-400 text-center">{t('chapters.noChapters')}</Text>
            </View>
          ) : (
            chapters.map((chapter, index) => (
              <ChapterItem
                key={`${chapter.start_time}-${index}`}
                chapter={chapter}
                isActive={index === activeChapterIndex}
                onPress={() => handleChapterPress(chapter)}
                hasTVPreferredFocus={index === 0 && visible}
              />
            ))
          )}
        </ScrollView>
      </GlassView>
    </Animated.View>
  );
};

export default ChaptersOverlay;
