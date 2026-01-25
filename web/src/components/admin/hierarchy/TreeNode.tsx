/**
 * TreeNode - Expandable/collapsible tree node for series with episodes
 * Handles expand/collapse state and episode loading
 */

import React, { useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GlassChevron } from '@bayit/shared/ui/web';
import { adminContentService } from '@/services/adminApi';
import logger from '@/utils/logger';
import { z } from 'zod';
import { colors } from '@olorin/design-tokens';
import type { Episode } from './TreeRow';

// Schema for tree node state
const TreeNodeStateSchema = z.object({
  expanded: z.boolean(),
  loading: z.boolean(),
  episodes: z.array(z.any()).optional(),
});

interface TreeNodeProps {
  seriesId: string;
  isSeries: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  episodes: Episode[];
  onToggleExpand: (seriesId: string) => void;
  t: (key: string, fallback?: string) => string;
}

export function TreeNode({
  seriesId,
  isSeries,
  isExpanded,
  isLoading,
  episodes,
  onToggleExpand,
  t,
}: TreeNodeProps) {
  if (!isSeries) {
    return <View style={styles.placeholder} />;
  }

  return (
    <GlassChevron
      expanded={isExpanded}
      onPress={() => onToggleExpand(seriesId)}
      size="sm"
      accessibilityLabel={isExpanded ? t('common.collapse', 'Collapse') : t('common.expand', 'Expand')}
    />
  );
}

interface UseTreeNodeResult {
  expandedSeries: Set<string>;
  episodeCache: Record<string, Episode[]>;
  loadingEpisodes: Set<string>;
  toggleExpand: (seriesId: string) => Promise<void>;
}

/**
 * Hook to manage tree node state (expand/collapse, episode loading)
 */
export function useTreeNode(): UseTreeNodeResult {
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [episodeCache, setEpisodeCache] = useState<Record<string, Episode[]>>({});
  const [loadingEpisodes, setLoadingEpisodes] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback(
    async (seriesId: string) => {
      const newExpanded = new Set(expandedSeries);

      if (newExpanded.has(seriesId)) {
        newExpanded.delete(seriesId);
        setExpandedSeries(newExpanded);
      } else {
        newExpanded.add(seriesId);
        setExpandedSeries(newExpanded);

        if (!episodeCache[seriesId]) {
          try {
            setLoadingEpisodes((prev) => new Set(prev).add(seriesId));
            const response = await adminContentService.getSeriesEpisodes(seriesId);
            setEpisodeCache((prev) => ({
              ...prev,
              [seriesId]: response.episodes || [],
            }));
          } catch (err) {
            logger.error('Failed to load episodes', 'TreeNode', err);
          } finally {
            setLoadingEpisodes((prev) => {
              const next = new Set(prev);
              next.delete(seriesId);
              return next;
            });
          }
        }
      }
    },
    [expandedSeries, episodeCache]
  );

  return {
    expandedSeries,
    episodeCache,
    loadingEpisodes,
    toggleExpand,
  };
}

interface EpisodeLoadingIndicatorProps {
  seriesId: string;
  isLoading: boolean;
  hasEpisodes: boolean;
}

export function EpisodeLoadingIndicator({ seriesId, isLoading, hasEpisodes }: EpisodeLoadingIndicatorProps) {
  if (!isLoading || hasEpisodes) {
    return null;
  }

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    width: 28,
    height: 28,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
});
