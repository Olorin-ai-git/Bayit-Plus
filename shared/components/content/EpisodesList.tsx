import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius } from '../../theme';
import { isTV } from '../../utils/platform';
import { useDirection } from '../../hooks/useDirection';

export interface Episode {
  id: string;
  episode_number: number;
  season_number: number;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: string;
  progress?: number; // 0-100
}

export interface EpisodesListProps {
  episodes: Episode[];
  onEpisodePress?: (episode: Episode) => void;
  selectedEpisodeId?: string;
}

const EpisodeCard: React.FC<{
  episode: Episode;
  onPress?: () => void;
  isSelected?: boolean;
  index: number;
}> = ({ episode, onPress, isSelected, index }) => {
  const { textAlign } = useDirection();
  const [isFocused, setIsFocused] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(scaleAnim, {
      toValue: 1.03,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      activeOpacity={1}
      style={styles.episodeCardTouchable}
    >
      <Animated.View
        style={[
          styles.episodeCard,
          { transform: [{ scale: scaleAnim }] },
          isSelected && styles.episodeCardSelected,
          isFocused && styles.episodeCardFocused,
        ]}
      >
        <View style={styles.episodeThumbnail}>
          {episode.thumbnail ? (
            <Image
              source={{ uri: episode.thumbnail }}
              style={styles.episodeImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.episodeImagePlaceholder}>
              <Text style={styles.placeholderText}>
                E{episode.episode_number}
              </Text>
            </View>
          )}

          {/* Play Overlay */}
          {(isFocused || isSelected) && (
            <View style={styles.episodePlayOverlay}>
              <View style={styles.episodePlayButton}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            </View>
          )}

          {/* Progress Bar */}
          {episode.progress !== undefined && episode.progress > 0 && (
            <View style={styles.episodeProgress}>
              <View
                style={[
                  styles.episodeProgressBar,
                  { width: `${episode.progress}%` },
                ]}
              />
            </View>
          )}

          {/* Duration Badge */}
          {episode.duration && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{episode.duration}</Text>
            </View>
          )}
        </View>

        <View style={styles.episodeInfo}>
          <Text style={[styles.episodeNumber, { textAlign }]}>
            Episode {episode.episode_number}
          </Text>
          <Text style={[styles.episodeTitle, { textAlign }]} numberOfLines={2}>
            {episode.title}
          </Text>
          {episode.description && (
            <Text style={[styles.episodeDescription, { textAlign }]} numberOfLines={2}>
              {episode.description}
            </Text>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const EpisodesList: React.FC<EpisodesListProps> = ({
  episodes,
  onEpisodePress,
  selectedEpisodeId,
}) => {
  const { t } = useTranslation();

  if (!episodes || episodes.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>{t('content.noEpisodes', 'No episodes available')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={episodes}
      keyExtractor={(item) => item.id}
      numColumns={isTV ? 3 : 1}
      key={isTV ? 'tv' : 'mobile'}
      contentContainerStyle={styles.listContent}
      renderItem={({ item, index }) => (
        <EpisodeCard
          episode={item}
          onPress={() => onEpisodePress?.(item)}
          isSelected={item.id === selectedEpisodeId}
          index={index}
        />
      )}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: isTV ? spacing.xl : spacing.lg,
    paddingVertical: spacing.md,
  },
  episodeCardTouchable: {
    flex: isTV ? 1 / 3 : 1,
    padding: isTV ? spacing.sm : 0,
    marginBottom: isTV ? 0 : spacing.md,
  },
  episodeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  episodeCardSelected: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(192, 38, 211, 0.15)',
  },
  episodeCardFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    // @ts-ignore - Web CSS property
    boxShadow: '0 0 20px rgba(168, 85, 247, 0.6)',
  },
  episodeThumbnail: {
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    overflow: 'hidden',
  },
  episodeImage: {
    width: '100%',
    height: '100%',
  },
  episodeImagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  placeholderText: {
    fontSize: isTV ? 42 : 28,
    fontWeight: '700',
    color: colors.text,
  },
  episodePlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodePlayButton: {
    width: isTV ? 60 : 40,
    height: isTV ? 60 : 40,
    borderRadius: isTV ? 30 : 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: isTV ? 24 : 16,
    color: colors.background,
    marginLeft: 4,
  },
  episodeProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  episodeProgressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  durationBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  durationText: {
    fontSize: isTV ? 14 : 12,
    color: colors.text,
    fontWeight: '500',
  },
  episodeInfo: {
    padding: isTV ? spacing.md : spacing.sm,
  },
  episodeNumber: {
    fontSize: isTV ? 14 : 12,
    color: colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  episodeTitle: {
    fontSize: isTV ? 18 : 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    lineHeight: isTV ? 24 : 18,
  },
  episodeDescription: {
    fontSize: isTV ? 14 : 12,
    color: colors.textSecondary,
    lineHeight: isTV ? 20 : 16,
  },
  emptyState: {
    padding: isTV ? spacing.xxl : spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: isTV ? 20 : 16,
    color: colors.textMuted,
  },
});

export default EpisodesList;
