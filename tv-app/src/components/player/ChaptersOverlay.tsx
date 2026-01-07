import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
      style={[
        styles.container,
        { transform: [{ translateX: slideAnim }] },
      ]}
    >
      <GlassView style={styles.panel} intensity="strong">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerIcon}>📑</Text>
            <Text style={styles.headerTitle}>{t('chapters.title')}</Text>
            <Text style={styles.headerCount}>({chapters.length})</Text>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityLabel={t('common.close')}
          >
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Chapters List */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.emptyText}>{t('chapters.generating')}</Text>
            </View>
          ) : chapters.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📑</Text>
              <Text style={styles.emptyText}>{t('chapters.noChapters')}</Text>
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

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 320,
    zIndex: 50,
  },
  panel: {
    flex: 1,
    borderTopLeftRadius: borderRadius.xl,
    borderBottomLeftRadius: borderRadius.xl,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIcon: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerCount: {
    fontSize: 14,
    color: colors.textMuted,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    opacity: 0.5,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

export default ChaptersOverlay;
