/**
 * Episode Card Component
 * Displays individual episode information with thumbnail and progress
 */

import { View, Text, Image, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { colors } from '@bayit/shared/theme';
import type { Episode } from '../types/series.types';

interface EpisodeCardProps {
  episode: Episode;
  isSelected: boolean;
  onSelect: () => void;
  onPlay: () => void;
  flexDirection: 'row' | 'row-reverse';
}

export function EpisodeCard({
  episode,
  isSelected,
  onSelect,
  onPlay,
  flexDirection,
}: EpisodeCardProps) {
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
        {episode.thumbnail ? (
          <Image
            source={{ uri: episode.thumbnail }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderIcon}>🎬</Text>
          </View>
        )}

        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <Play size={16} color="#000" fill="#000" />
          </View>
        </View>

        {episode.duration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{episode.duration}</Text>
          </View>
        )}

        {episode.progress !== undefined && episode.progress > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${episode.progress}%` }]} />
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.episodeNumber}>
          {t('content.episode')} {episode.episode_number}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {episode.title}
        </Text>
        {episode.description && (
          <Text style={styles.description} numberOfLines={2}>
            {episode.description}
          </Text>
        )}
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
    borderColor: '#6B21A8',
  },
  thumbnailContainer: {
    width: 160,
    height: 90,
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
  },
  placeholderIcon: {
    fontSize: 32,
    opacity: 0.5,
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 12,
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
    backgroundColor: '#6B21A8',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  episodeNumber: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  selectedIndicator: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6B21A8',
  },
});
