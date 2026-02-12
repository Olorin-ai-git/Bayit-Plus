import { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { Play, Plus, Clock, Hash } from 'lucide-react';
import { colors, spacing, borderRadius, fontSize } from '@olorin/design-tokens';
import { useStarStoryStore } from '@/stores/starStoryStore';
import logger from '@bayit/shared-utils/logger';

const galleryLogger = logger.scope('EpisodeGallery');

interface EpisodeGalleryProps {
  episodes: Array<{
    episode_id: string;
    title: string;
    theme: string;
    episode_number: number;
    status: string;
    hls_url: string | null;
    thumbnail_url: string | null;
    duration_seconds: number;
    created_at: string;
  }>;
  avatars: Array<{ avatar_id: string; child_first_name: string }>;
  profileId: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function EpisodeGallery({ episodes, avatars, profileId }: EpisodeGalleryProps) {
  const { generateEpisode } = useStarStoryStore();
  const [generatingNew, setGeneratingNew] = useState(false);

  const handleNewEpisode = useCallback(async () => {
    if (avatars.length === 0 || generatingNew) return;
    setGeneratingNew(true);
    try {
      await generateEpisode({
        profile_id: profileId,
        avatar_id: avatars[0].avatar_id,
        theme: 'adventure',
        target_vocabulary: [],
      });
    } catch (err: unknown) {
      galleryLogger.error('Failed to start new episode', err);
    } finally {
      setGeneratingNew(false);
    }
  }, [avatars, profileId, generateEpisode, generatingNew]);

  const handlePlay = useCallback((episodeId: string, hlsUrl: string | null) => {
    if (!hlsUrl) return;
    galleryLogger.info('Play episode', { episodeId });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Episodes</Text>

      <View style={styles.grid}>
        {episodes.map((episode) => (
          <Pressable
            key={episode.episode_id}
            style={({ pressed }) => [styles.episodeCard, pressed && styles.episodeCardPressed]}
            onPress={() => handlePlay(episode.episode_id, episode.hls_url)}
          >
            <View style={styles.thumbnailContainer}>
              {episode.thumbnail_url ? (
                <Image source={{ uri: episode.thumbnail_url }} style={styles.thumbnail} />
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <Play size={24} color={colors.primary[400]} />
                </View>
              )}
              {episode.hls_url && (
                <View style={styles.playOverlay}>
                  <Play size={20} color={colors.white} />
                </View>
              )}
            </View>
            <View style={styles.episodeInfo}>
              <Text style={styles.episodeTitle} numberOfLines={2}>{episode.title}</Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Hash size={12} color={colors.textMuted} />
                  <Text style={styles.metaText}>{episode.episode_number}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Clock size={12} color={colors.textMuted} />
                  <Text style={styles.metaText}>{formatDuration(episode.duration_seconds)}</Text>
                </View>
              </View>
              <View style={styles.themeBadge}>
                <Text style={styles.themeText}>{episode.theme}</Text>
              </View>
            </View>
          </Pressable>
        ))}

        {avatars.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.newEpisodeCard, pressed && styles.episodeCardPressed]}
            onPress={handleNewEpisode}
            disabled={generatingNew}
          >
            <View style={styles.newEpisodeContent}>
              <Plus size={32} color={colors.primary[400]} />
              <Text style={styles.newEpisodeText}>New Episode</Text>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: spacing[4] },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: '600', color: colors.text, marginBottom: spacing[3] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[4] },
  episodeCard: {
    width: 240, backgroundColor: colors.glass.bgMedium, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.glass.border, overflow: 'hidden',
  },
  episodeCardPressed: { opacity: 0.85 },
  thumbnailContainer: { width: '100%', aspectRatio: 16 / 9, position: 'relative' },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailPlaceholder: { width: '100%', height: '100%', backgroundColor: colors.glass.bgStrong, justifyContent: 'center', alignItems: 'center' },
  playOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)',
  },
  episodeInfo: { padding: spacing[3], gap: spacing[2] },
  episodeTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  metaRow: { flexDirection: 'row', gap: spacing[3] },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing[1] },
  metaText: { fontSize: fontSize.xs, color: colors.textMuted },
  themeBadge: {
    alignSelf: 'flex-start', backgroundColor: colors.primary[400] + '20',
    paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: borderRadius.sm,
  },
  themeText: { fontSize: fontSize.xs, color: colors.primary[400], fontWeight: '500' },
  newEpisodeCard: {
    width: 240, backgroundColor: colors.glass.bgLight, borderRadius: borderRadius.lg,
    borderWidth: 2, borderColor: colors.glass.borderLight, borderStyle: 'dashed',
    aspectRatio: 3 / 4, justifyContent: 'center', alignItems: 'center',
  },
  newEpisodeContent: { alignItems: 'center', gap: spacing[3] },
  newEpisodeText: { fontSize: fontSize.sm, color: colors.primary[400], fontWeight: '600' },
});
