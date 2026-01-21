/**
 * Episode Card Component
 * Displays individual episode information with thumbnail and progress
 */

import { View, Text, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { colors, spacing, fontSize, borderRadius } from '@bayit/shared/theme';
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
      style={[styles.episodeCard, isSelected && styles.episodeCardSelected]}
      onClick={isSelected ? onPlay : onSelect}
    >
      <View style={styles.episodeThumbnail}>
        {episode.thumbnail ? (
          <Image
            source={{ uri: episode.thumbnail }}
            style={styles.episodeThumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.episodeThumbnailPlaceholder}>
            <Text style={styles.episodeThumbnailIcon}>🎬</Text>
          </View>
        )}

        <View style={styles.episodePlayOverlay}>
          <View style={styles.episodePlayButton}>
            <Play size={16} color="#000" fill="#000" />
          </View>
        </View>

        {episode.duration && (
          <View style={styles.episodeDuration}>
            <Text style={styles.episodeDurationText}>{episode.duration}</Text>
          </View>
        )}

        {episode.progress !== undefined && episode.progress > 0 && (
          <View style={styles.episodeProgress}>
            <View style={[styles.episodeProgressBar, { width: `${episode.progress}%` }]} />
          </View>
        )}
      </View>

      <View style={styles.episodeContent}>
        <Text style={styles.episodeNumber}>
          {t('content.episode')} {episode.episode_number}
        </Text>
        <Text style={styles.episodeTitle} numberOfLines={2}>
          {episode.title}
        </Text>
        {episode.description && (
          <Text style={styles.episodeDescription} numberOfLines={2}>
            {episode.description}
          </Text>
        )}
      </View>

      {isSelected && (
        <View style={styles.episodeSelectedIndicator}>
          <Play size={16} color="#fff" fill="#fff" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  episodeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    cursor: 'pointer',
  },
  episodeCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: colors.primary,
  },
  episodeThumbnail: {
    width: 160,
    height: 90,
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  episodeThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  episodeThumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeThumbnailIcon: {
    fontSize: 32,
    opacity: 0.5,
  },
  episodePlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  episodePlayButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeDuration: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  episodeDurationText: {
    fontSize: fontSize.xs,
    color: colors.text,
    fontWeight: '500',
  },
  episodeProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  episodeProgressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  episodeContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  episodeNumber: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  episodeTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  episodeDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  episodeSelectedIndicator: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
});
