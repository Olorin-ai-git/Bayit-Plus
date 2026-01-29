/**
 * Maariv 103FM Episode Archive/Playlist Widget
 *
 * Displays a scrollable archive of podcast episodes from Maariv 103FM shows.
 * Fetches episodes from the existing /podcasts/{show_id}/episodes API endpoint.
 * Integrates with AudioPlayer component for playback.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Play, Pause, RefreshCw, AlertCircle, AlertTriangle, Music } from 'lucide-react';
import { colors, spacing, borderRadius } from '@olorin/design-tokens';
import AudioPlayer from '@/components/player/AudioPlayer';
import { useAuthStore } from '@/stores/authStore';
import type { PodcastEpisode, EpisodesResponse } from '@/types/podcast';
import i18n from 'i18next';

interface Maariv103PlaylistWidgetProps {
  podcastId?: string;
  maxEpisodes?: number;
  autoRefresh?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';
const DEFAULT_MAX_EPISODES = 20;
const ITEMS_PER_PAGE = 20;

const getAuthHeaders = (): HeadersInit => {
  const token = useAuthStore.getState().token;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept-Language': i18n.language || 'en',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

export function Maariv103PlaylistWidget({
  podcastId,
  maxEpisodes = DEFAULT_MAX_EPISODES,
  autoRefresh = false,
}: Maariv103PlaylistWidgetProps) {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalEpisodes, setTotalEpisodes] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState<PodcastEpisode | null>(null);

  // Fetch episodes from API
  const fetchEpisodes = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (!podcastId) {
      setError('Podcast ID not configured');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/podcasts/${podcastId}/episodes?page=${pageNum}&limit=${ITEMS_PER_PAGE}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Podcast not found - please check configuration');
        }
        throw new Error(`Failed to load episodes: ${response.statusText}`);
      }

      const data: EpisodesResponse = await response.json();

      if (append) {
        setEpisodes(prev => [...prev, ...data.episodes]);
      } else {
        setEpisodes(data.episodes);
      }

      setTotalEpisodes(data.total);
      setTotalPages(data.pages);
      setPage(pageNum);
      setHasMore(pageNum < data.pages);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load episodes';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [podcastId]);

  // Initial fetch
  useEffect(() => {
    fetchEpisodes(1, false);
  }, [fetchEpisodes]);

  // Auto refresh (if enabled)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchEpisodes(1, false);
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, [autoRefresh, fetchEpisodes]);

  // Load more episodes
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchEpisodes(page + 1, true);
    }
  }, [loading, hasMore, page, fetchEpisodes]);

  // Refresh episodes
  const handleRefresh = useCallback(() => {
    setSelectedEpisode(null);
    fetchEpisodes(1, false);
  }, [fetchEpisodes]);

  // Check if episode has valid audio
  const hasValidAudio = useCallback((episode: PodcastEpisode): boolean => {
    return !!(episode.audioUrl && episode.audioUrl.trim());
  }, []);

  // Handle episode selection for playback
  const handleEpisodePress = useCallback((episode: PodcastEpisode) => {
    if (!hasValidAudio(episode)) return;

    // If same episode, toggle playback
    if (selectedEpisode?.id === episode.id) {
      setSelectedEpisode(null);
    } else {
      setSelectedEpisode(episode);
    }
  }, [selectedEpisode, hasValidAudio]);

  // Render loading state
  const renderLoading = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={colors.text} />
      <Text style={styles.centerText}>Loading episodes...</Text>
    </View>
  );

  // Render error state
  const renderError = () => (
    <View style={styles.centerContainer}>
      <AlertCircle size={48} color={colors.error.DEFAULT} />
      <Text style={styles.errorText}>{error}</Text>
      <Pressable style={styles.retryButton} onPress={handleRefresh}>
        <RefreshCw size={16} color={colors.text} />
        <Text style={styles.retryButtonText}>Retry</Text>
      </Pressable>
    </View>
  );

  // Render empty state
  const renderEmpty = () => (
    <View style={styles.centerContainer}>
      <Music size={48} color={colors.textSecondary} />
      <Text style={styles.centerText}>No episodes found</Text>
    </View>
  );

  // Render episode card
  const renderEpisode = (episode: PodcastEpisode, index: number) => {
    const isPlaying = selectedEpisode?.id === episode.id;
    const hasAudio = hasValidAudio(episode);

    return (
      <Pressable
        key={episode.id}
        style={[
          styles.episodeCard,
          isPlaying && styles.episodeCardPlaying,
          !hasAudio && styles.episodeCardDisabled,
        ]}
        onPress={() => handleEpisodePress(episode)}
        disabled={!hasAudio}
      >
        {/* Left: Play/Pause button */}
        <View style={styles.episodeIcon}>
          {isPlaying ? (
            <Pause size={20} color={colors.text} fill={colors.text} />
          ) : (
            <Play size={20} color={hasAudio ? colors.text : colors.textMuted} />
          )}
        </View>

        {/* Center: Episode info */}
        <View style={styles.episodeInfo}>
          <Text style={styles.episodeTitle} numberOfLines={2}>
            {episode.title}
          </Text>
          <Text style={styles.episodeDate}>
            {episode.publishedAt}
          </Text>
          {episode.description && (
            <Text style={styles.episodeDescription} numberOfLines={1}>
              {episode.description}
            </Text>
          )}
        </View>

        {/* Right: Duration or No Audio badge */}
        {hasAudio ? (
          episode.duration && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{episode.duration}</Text>
            </View>
          )
        ) : (
          <View style={styles.noAudioBadge}>
            <AlertTriangle size={12} color="#fbbf24" />
            <Text style={styles.noAudioText}>Audio unavailable</Text>
          </View>
        )}
      </Pressable>
    );
  };

  // Main render
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>🎙️</Text>
          <Text style={styles.headerTitle}>103FM Episodes</Text>
        </View>
        <Pressable style={styles.refreshButton} onPress={handleRefresh}>
          <RefreshCw size={16} color={colors.text} />
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading && episodes.length === 0 ? (
          renderLoading()
        ) : error ? (
          renderError()
        ) : episodes.length === 0 ? (
          renderEmpty()
        ) : (
          <ScrollView
            style={styles.episodeList}
            contentContainerStyle={styles.episodeListContent}
            showsVerticalScrollIndicator={true}
          >
            {episodes.map((episode, index) => renderEpisode(episode, index))}

            {/* Load More button */}
            {hasMore && (
              <Pressable
                style={styles.loadMoreButton}
                onPress={handleLoadMore}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </Pressable>
            )}
          </ScrollView>
        )}
      </View>

      {/* Audio Player (if episode selected) */}
      {selectedEpisode && hasValidAudio(selectedEpisode) && (
        <View style={styles.playerContainer}>
          <AudioPlayer
            src={selectedEpisode.audioUrl}
            title={selectedEpisode.title}
            artist="103FM"
            cover={selectedEpisode.thumbnail}
            isLive={false}
            onEnded={() => setSelectedEpisode(null)}
          />
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Showing {episodes.length} of {totalEpisodes}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.9)', // 103FM red
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerIcon: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  centerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: colors.error.DEFAULT,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  retryButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  episodeList: {
    flex: 1,
  },
  episodeListContent: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
    marginBottom: spacing.xs,
  },
  episodeCardPlaying: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderLeftColor: 'rgba(59, 130, 246, 1)',
  },
  episodeCardDisabled: {
    opacity: 0.5,
  },
  episodeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  episodeInfo: {
    flex: 1,
    gap: 2,
  },
  episodeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'right',
  },
  episodeDate: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
  },
  episodeDescription: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right',
  },
  durationBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.sm,
  },
  durationText: {
    fontSize: 11,
    color: colors.text,
    fontWeight: '500',
  },
  noAudioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    borderRadius: borderRadius.sm,
  },
  noAudioText: {
    fontSize: 10,
    color: '#fbbf24',
    fontWeight: '500',
  },
  loadMoreButton: {
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  loadMoreText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  playerContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    padding: 0,
  },
  footer: {
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
