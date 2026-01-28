/**
 * Chapter List Component
 * Displays list of chapters for an audiobook
 */

import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@olorin/design-tokens';
import { ChapterCard } from './ChapterCard';
import type { AudiobookChapter } from '@/types/audiobook';

interface ChapterListProps {
  chapters: AudiobookChapter[];
  selectedChapter: AudiobookChapter | null;
  loading: boolean;
  flexDirection: 'row' | 'row-reverse';
  onChapterSelect: (chapter: AudiobookChapter) => void;
  onChapterPlay: (chapter: AudiobookChapter) => void;
}

export function ChapterList({
  chapters,
  selectedChapter,
  loading,
  flexDirection,
  onChapterSelect,
  onChapterPlay,
}: ChapterListProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      {chapters.length > 0 && (
        <Text style={styles.title}>
          {chapters.length} {t('audiobooks.chapters')}
        </Text>
      )}

      {loading ? (
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      ) : chapters.length > 0 ? (
        <View style={styles.chaptersContainer}>
          {chapters.map((chapter) => (
            <ChapterCard
              key={chapter.id}
              chapter={chapter}
              isSelected={selectedChapter?.id === chapter.id}
              onSelect={() => onChapterSelect(chapter)}
              onPlay={() => onChapterPlay(chapter)}
              flexDirection={flexDirection}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('audiobooks.noChapters')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 48,
    paddingVertical: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  chaptersContainer: {
    gap: 12,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
});
