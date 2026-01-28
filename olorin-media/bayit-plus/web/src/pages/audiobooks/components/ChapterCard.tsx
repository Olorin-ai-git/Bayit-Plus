/**
 * Chapter Card Component
 * Displays individual chapter information with thumbnail and progress
 */

import { View, Text, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play, Headphones } from 'lucide-react';
import { colors } from '@olorin/design-tokens';
import type { AudiobookChapter } from '@/types/audiobook';

interface ChapterCardProps {
  chapter: AudiobookChapter;
  isSelected: boolean;
  onSelect: () => void;
  onPlay: () => void;
  flexDirection: 'row' | 'row-reverse';
}

export function ChapterCard({
  chapter,
  isSelected,
  onSelect,
  onPlay,
  flexDirection,
}: ChapterCardProps) {
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.container,
        isSelected && styles.containerSelected,
      ]}
      // @ts-ignore - Web onClick
      onClick={isSelected ? onPlay : onSelect}
    >
      <View style={styles.thumbnailContainer}>
        {chapter.thumbnail ? (
          <Image
            source={{ uri: chapter.thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Headphones size={24} color="rgba(255,255,255,0.5)" />
          </View>
        )}

        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <Play size={16} color="#000" fill="#000" />
          </View>
        </View>

        {chapter.duration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{chapter.duration}</Text>
          </View>
        )}

        {chapter.progress !== undefined && chapter.progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${chapter.progress}%` }]} />
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.chapterNumber}>
          {t('audiobooks.chapter')} {chapter.chapter_number}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {chapter.title}
        </Text>
      </View>

      {isSelected && (
        <View style={styles.selectedIndicator}>
          <Play size={16} color="#fff" fill="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    // @ts-ignore - Web cursor
    cursor: 'pointer',
  },
  containerSelected: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: colors.primary.DEFAULT,
  },
  thumbnailContainer: {
    width: 120,
    height: 80,
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '500',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary.DEFAULT,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  chapterNumber: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  selectedIndicator: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.DEFAULT,
  },
});
