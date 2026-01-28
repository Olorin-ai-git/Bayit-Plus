/**
 * Audiobook Player Page
 * Main page for viewing audiobook details and playing chapters
 */

import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@/hooks/useDirection';
import { colors } from '@olorin/design-tokens';
import { useFullscreenPlayerStore } from '@/stores/fullscreenPlayerStore';
import { useAudiobookData } from './hooks';
import { AudiobookHero, ChapterList } from './components';
import type { AudiobookChapter } from '@/types/audiobook';

export default function AudiobookPlayerPage() {
  const { t } = useTranslation();
  const { textAlign, flexDirection } = useDirection();
  const { audiobookId } = useParams<{ audiobookId: string }>();
  const openPlayer = useFullscreenPlayerStore((state) => state.openPlayer);

  const {
    audiobook,
    chapters,
    selectedChapter,
    loading,
    inWatchlist,
    setSelectedChapter,
    toggleWatchlist,
  } = useAudiobookData({ audiobookId });

  const handlePlay = () => {
    const chapterToPlay = selectedChapter || chapters[0];
    if (chapterToPlay && audiobook) {
      openPlayer({
        id: chapterToPlay.id,
        title: `${audiobook.title} - ${chapterToPlay.title}`,
        src: '',
        poster: chapterToPlay.thumbnail || audiobook.backdrop || audiobook.thumbnail,
        type: 'audiobook',
        seriesId: audiobook.id,
        episodeId: chapterToPlay.id,
      });
    }
  };

  const handleChapterSelect = (chapter: AudiobookChapter) => {
    setSelectedChapter(chapter);
  };

  const handleChapterPlay = (chapter: AudiobookChapter) => {
    if (audiobook) {
      openPlayer({
        id: chapter.id,
        title: `${audiobook.title} - ${chapter.title}`,
        src: '',
        poster: chapter.thumbnail || audiobook.backdrop || audiobook.thumbnail,
        type: 'audiobook',
        seriesId: audiobook.id,
        episodeId: chapter.id,
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!audiobook) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFoundText}>{t('audiobooks.notFound')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <AudiobookHero
        audiobook={audiobook}
        selectedChapter={selectedChapter}
        inWatchlist={inWatchlist}
        flexDirection={flexDirection}
        textAlign={textAlign}
        onPlay={handlePlay}
        toggleWatchlist={toggleWatchlist}
      />

      <ChapterList
        chapters={chapters}
        selectedChapter={selectedChapter}
        loading={false}
        flexDirection={flexDirection}
        onChapterSelect={handleChapterSelect}
        onChapterPlay={handleChapterPlay}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  notFoundText: {
    color: colors.textSecondary,
    fontSize: 18,
  },
});
