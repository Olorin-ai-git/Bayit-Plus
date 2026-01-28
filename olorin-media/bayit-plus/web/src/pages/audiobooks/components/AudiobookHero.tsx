/**
 * Audiobook Hero Component
 * Hero section with backdrop, book metadata, and main actions
 */

import { View, Text, Image, Dimensions, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play, Plus, Check, Headphones, BookOpen, User } from 'lucide-react';
import LinearGradient from 'react-native-linear-gradient';
import { GlassView, GlassButton, GlassBadge } from '@bayit/shared/ui';
import { colors } from '@olorin/design-tokens';
import type { AudiobookWithChapters, AudiobookChapter } from '@/types/audiobook';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AudiobookHeroProps {
  audiobook: AudiobookWithChapters;
  selectedChapter: AudiobookChapter | null;
  inWatchlist: boolean;
  flexDirection: 'row' | 'row-reverse';
  textAlign: 'left' | 'right' | 'center';
  onPlay: () => void;
  toggleWatchlist: () => void;
}

export function AudiobookHero({
  audiobook,
  selectedChapter,
  inWatchlist,
  flexDirection,
  textAlign,
  onPlay,
  toggleWatchlist,
}: AudiobookHeroProps) {
  const { t } = useTranslation();
  const backdropUrl = audiobook.backdrop || audiobook.thumbnail;

  return (
    <View style={styles.container}>
      <View style={styles.posterContainer}>
        {backdropUrl ? (
          <Image
            source={{ uri: backdropUrl }}
            style={styles.backgroundImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderBackground}>
            <Headphones size={80} color="rgba(255,255,255,0.2)" />
          </View>
        )}
      </View>

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.95)']}
        style={styles.bottomGradient}
      />
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.leftGradient}
      />

      <View style={styles.content}>
        <GlassView style={styles.audiobookBadge} intensity="light">
          <Headphones size={14} color="#ffffff" />
          <Text style={styles.audiobookBadgeText}>{t('audiobooks.audiobook')}</Text>
        </GlassView>

        <Text style={styles.title}>{audiobook.title}</Text>

        <View style={[styles.metadataRow, { flexDirection }]}>
          {audiobook.author && (
            <View style={styles.metadataItem}>
              <BookOpen size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.metadataText}>{audiobook.author}</Text>
            </View>
          )}
          {audiobook.narrator && (
            <View style={styles.metadataItem}>
              <User size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.metadataText}>{audiobook.narrator}</Text>
            </View>
          )}
          {audiobook.year && <Text style={styles.metadataText}>{audiobook.year}</Text>}
          {audiobook.total_chapters > 0 && (
            <Text style={styles.metadataText}>
              {audiobook.total_chapters} {t('audiobooks.chapters')}
            </Text>
          )}
          {audiobook.duration && (
            <Text style={styles.metadataText}>{audiobook.duration}</Text>
          )}
          {audiobook.avg_rating > 0 && (
            <GlassBadge variant="default" size="sm">
              ★ {audiobook.avg_rating.toFixed(1)}
            </GlassBadge>
          )}
        </View>

        {audiobook.description && (
          <Text style={[styles.description, { textAlign }]} numberOfLines={3}>
            {audiobook.description}
          </Text>
        )}

        <View style={[styles.actionsRow, { flexDirection }]}>
          <GlassButton
            onPress={onPlay}
            variant="primary"
            size="lg"
            icon={<Play size={20} color="#fff" fill="#fff" />}
            title={
              selectedChapter
                ? `${t('audiobooks.playChapter')} ${selectedChapter.chapter_number}`
                : t('content.play')
            }
            disabled={audiobook.total_chapters === 0}
          />

          <GlassButton
            onPress={toggleWatchlist}
            variant="ghost"
            size="lg"
            icon={
              inWatchlist ? <Check size={20} color="#fff" /> : <Plus size={20} color="#fff" />
            }
            title={inWatchlist ? t('content.inList') : t('content.addToList')}
          />
        </View>

        {audiobook.isbn && (
          <Text style={styles.isbn}>ISBN: {audiobook.isbn}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.6,
  },
  posterContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  placeholderBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '75%',
    zIndex: 2,
  },
  leftGradient: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '60%',
    zIndex: 3,
  },
  content: {
    position: 'absolute',
    left: 48,
    right: 48,
    bottom: 40,
    maxWidth: 600,
    zIndex: 10,
  },
  audiobookBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    marginBottom: 16,
  },
  audiobookBadgeText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  metadataRow: {
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metadataText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
  description: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: 24,
  },
  actionsRow: {
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  isbn: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
});
