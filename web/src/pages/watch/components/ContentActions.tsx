/**
 * Content Actions Component
 * Action buttons for adding to playlist, liking, and sharing content
 */

import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Plus, Check, ThumbsUp, Share2 } from 'lucide-react-native';
import { GlassButton } from '@bayit/shared/ui';
import { playlistService } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { logger } from '@/utils/logger';
import { colors, spacing, fontSize } from '@olorin/design-tokens';

interface ContentActionsProps {
  contentId: string;
  contentType: string;
  addToListLabel: string;
  inListLabel: string;
  likeLabel: string;
  shareLabel: string;
}

export function ContentActions({
  contentId,
  contentType,
  addToListLabel,
  inListLabel,
  likeLabel,
  shareLabel,
}: ContentActionsProps) {
  const user = useAuthStore((s) => s.user);
  const [inPlaylist, setInPlaylist] = useState(false);
  const [playlistLoading, setPlaylistLoading] = useState(false);

  useEffect(() => {
    if (!contentId || !user) return;

    playlistService.checkItem(contentId)
      .then((result) => {
        if (result && typeof result.in_playlist === 'boolean') {
          setInPlaylist(result.in_playlist);
        }
      })
      .catch((error) => {
        logger.error('Failed to check playlist status', 'ContentActions', { contentId, error });
      });
  }, [contentId, user]);

  const handleTogglePlaylist = useCallback(async () => {
    if (!contentId || playlistLoading || !user) return;

    const previousState = inPlaylist;
    setInPlaylist(!inPlaylist);
    setPlaylistLoading(true);

    try {
      const result = await playlistService.toggleItem(contentId, contentType);
      if (result && typeof result.in_playlist === 'boolean') {
        setInPlaylist(result.in_playlist);
      }
    } catch (error) {
      logger.error('Failed to toggle playlist', 'ContentActions', { contentId, error });
      setInPlaylist(previousState);
    } finally {
      setPlaylistLoading(false);
    }
  }, [contentId, contentType, inPlaylist, playlistLoading, user]);

  const showPlaylistToggle = contentType !== 'podcast';

  return (
    <View style={styles.container}>
      {showPlaylistToggle && (
        <GlassButton
          title={inPlaylist ? inListLabel : addToListLabel}
          icon={
            inPlaylist
              ? <Check size={18} color={colors.text} />
              : <Plus size={18} color={colors.text} />
          }
          variant="secondary"
          style={styles.actionButton}
          onPress={handleTogglePlaylist}
          disabled={playlistLoading || !user}
        />
      )}
      <GlassButton
        title={likeLabel}
        icon={<ThumbsUp size={18} color={colors.text} />}
        variant="secondary"
        style={styles.actionButton}
      />
      <Pressable style={styles.shareButton}>
        <Share2 size={18} color={colors.textMuted} />
        <Text style={styles.shareText}>{shareLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionButton: {
    minWidth: 140,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  shareText: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
  },
});
