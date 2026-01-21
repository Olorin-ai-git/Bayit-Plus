import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { isTV } from '../../utils/platform';
import { GlassProgressBar } from '../ui/GlassProgressBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Episode {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  episodeNumber: number;
  duration?: string;
  previewUrl?: string;
  progress?: number; // 0-100 percentage watched
}

interface EpisodeListProps {
  episodes: Episode[];
  selectedEpisodeId?: string;
  onEpisodeSelect: (episode: Episode) => void;
  onEpisodePlay: (episode: Episode) => void;
  showProgress?: boolean;
  seasonNumber?: number;
}

/**
 * EpisodeList Component
 * Vertical list of episodes with thumbnails, progress, and selection.
 * Supports TV focus navigation.
 */
export const EpisodeList: React.FC<EpisodeListProps> = ({
  episodes,
  selectedEpisodeId,
  onEpisodeSelect,
  onEpisodePlay,
  showProgress = true,
  seasonNumber,
}) => {
  const { t } = useTranslation();

  if (episodes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('content.noEpisodes')}</Text>
      </View>
    );
  }

  const renderEpisode = ({ item, index }: { item: Episode; index: number }) => (
    <EpisodeCard
      episode={item}
      isSelected={item.id === selectedEpisodeId}
      onSelect={() => onEpisodeSelect(item)}
      onPlay={() => onEpisodePlay(item)}
      showProgress={showProgress}
      hasTVPreferredFocus={index === 0}
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>
        {seasonNumber
          ? `${t('content.season')} ${seasonNumber} • ${episodes.length} ${t('content.episodes')}`
          : `${episodes.length} ${t('content.episodes')}`}
      </Text>
      <FlatList
        data={episodes}
        renderItem={renderEpisode}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

interface EpisodeCardProps {
  episode: Episode;
  isSelected: boolean;
  onSelect: () => void;
  onPlay: () => void;
  showProgress: boolean;
  hasTVPreferredFocus?: boolean;
}

const EpisodeCard: React.FC<EpisodeCardProps> = ({
  episode,
  isSelected,
  onSelect,
  onPlay,
  showProgress,
  hasTVPreferredFocus,
}) => {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isFocused, setIsFocused] = React.useState(false);

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.02,
      friction: 6,
      useNativeDriver: true,
    }).start();
    // Also trigger select on focus for TV
    if (isTV) {
      onSelect();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (isTV) {
      // On TV, pressing selects + plays
      onPlay();
    } else {
      // On mobile/web, first press selects, second plays
      if (isSelected) {
        onPlay();
      } else {
        onSelect();
      }
    }
  };

  const thumbnailWidth = isTV ? 200 : 140;
  const thumbnailHeight = thumbnailWidth * 9 / 16;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.card,
          isSelected && styles.cardSelected,
          isFocused && styles.cardFocused,
        ]}
        onPress={handlePress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        activeOpacity={0.8}
        // @ts-ignore - TV prop
        hasTVPreferredFocus={hasTVPreferredFocus}
      >
        {/* Thumbnail */}
        <View style={[styles.thumbnailContainer, { width: thumbnailWidth, height: thumbnailHeight }]}>
          {episode.thumbnail ? (
            <Image
              source={{ uri: episode.thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Text style={styles.thumbnailPlaceholderText}>🎬</Text>
            </View>
          )}

          {/* Play icon overlay */}
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          </View>

          {/* Duration badge */}
          {episode.duration && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{episode.duration}</Text>
            </View>
          )}

          {/* Progress bar */}
          {showProgress && episode.progress !== undefined && episode.progress > 0 && (
            <View style={styles.progressContainer}>
              <View
                style={[styles.progressBar, { width: `${episode.progress}%` }]}
              />
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.episodeNumber}>
            {t('content.episode')} {episode.episodeNumber}
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

        {/* Selected indicator */}
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedIcon}>▶</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: spacing.md,
  },
  header: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xl,
  },
  separator: {
    height: spacing.md,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cardSelected: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: colors.primary,
  },
  cardFocused: {
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  thumbnailContainer: {
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  thumbnailPlaceholderText: {
    fontSize: 32,
    opacity: 0.5,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    opacity: 0.8,
  },
  playButton: {
    width: isTV ? 48 : 36,
    height: isTV ? 48 : 36,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: isTV ? 16 : 12,
    color: '#000',
    marginLeft: 2,
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  durationText: {
    fontSize: fontSize.xs,
    color: colors.text,
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
    backgroundColor: colors.primary,
  },
  cardContent: {
    flex: 1,
    padding: isTV ? spacing.md : spacing.sm,
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
    fontSize: isTV ? fontSize.lg : fontSize.md,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  episodeDescription: {
    fontSize: isTV ? fontSize.sm : fontSize.xs,
    color: colors.textSecondary,
    lineHeight: isTV ? 20 : 16,
  },
  selectedIndicator: {
    width: isTV ? 48 : 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  selectedIcon: {
    fontSize: isTV ? 18 : 14,
    color: colors.text,
  },
});

export default EpisodeList;
