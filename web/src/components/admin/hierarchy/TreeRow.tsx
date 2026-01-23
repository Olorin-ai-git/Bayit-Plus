/**
 * TreeRow - Individual row in hierarchical content table
 * Renders content items (movies/series) and episodes with appropriate styling
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet, ImageBackground } from 'react-native';
import { Link } from 'react-router-dom';
import { Star, Eye, Trash2, Film, Tv } from 'lucide-react';
import { GlassTableCell, GlassCheckbox } from '@bayit/shared/ui/web';
import { colors, borderRadius } from '@bayit/shared/theme';
import { z } from 'zod';

const ContentItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
  category_name: z.string().optional(),
  year: z.number().optional(),
  is_series: z.boolean(),
  is_published: z.boolean(),
  is_featured: z.boolean(),
  episode_count: z.number().optional(),
  view_count: z.number().optional(),
  avg_rating: z.number().optional(),
  available_subtitles: z.array(z.string()).optional(),
});

const EpisodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  thumbnail: z.string().optional(),
  duration: z.string().optional(),
  season: z.number().optional(),
  episode: z.number().optional(),
  is_published: z.boolean(),
  is_featured: z.boolean(),
  view_count: z.number().optional(),
});

export type ContentItem = z.infer<typeof ContentItemSchema>;
export type Episode = z.infer<typeof EpisodeSchema>;

interface ThumbnailCellProps {
  item: ContentItem;
  isRTL: boolean;
}

function ContentThumbnail({ item, isRTL }: ThumbnailCellProps) {
  return (
    <View style={styles.thumbnailContainer}>
      <View style={styles.contentThumbnailWrapper}>
        {item.thumbnail ? (
          <ImageBackground
            source={{ uri: item.thumbnail }}
            style={styles.thumbnailImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            {item.is_series ? (
              <Tv size={20} color="rgba(255,255,255,0.4)" />
            ) : (
              <Film size={20} color="rgba(255,255,255,0.4)" />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

interface EpisodeThumbnailProps {
  episode: Episode;
  isRTL: boolean;
}

function EpisodeThumbnail({ episode, isRTL }: EpisodeThumbnailProps) {
  return (
    <View style={styles.thumbnailContainer}>
      {episode.thumbnail ? (
        <ImageBackground
          source={{ uri: episode.thumbnail }}
          style={styles.episodeThumbnailImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.episodeThumbnailPlaceholder}>
          <Film size={14} color="rgba(255,255,255,0.4)" />
        </View>
      )}
    </View>
  );
}

interface ContentTitleCellProps {
  item: ContentItem;
  isRTL: boolean;
  t: (key: string, options?: any) => string;
}

export function ContentTitleCell({ item, isRTL, t }: ContentTitleCellProps) {
  const titleTextStyle = [
    styles.titleText,
    isRTL ? styles.textRight : styles.textLeft,
  ];

  const subtitleTextStyle = [
    styles.subtitleText,
    isRTL ? styles.textRight : styles.textLeft,
  ];

  const containerStyle = [
    styles.titleContainer,
    isRTL ? styles.flexRowReverse : styles.flexRow,
  ];

  return (
    <View style={styles.titleCellContainer}>
      <View style={containerStyle}>
        <Text style={titleTextStyle} numberOfLines={1}>
          {item.title}
        </Text>
        {item.is_series && (
          <View style={styles.seriesBadge}>
            <Text style={styles.seriesBadgeText}>
              {item.episode_count || 0} {t('admin.content.episodes', { count: item.episode_count || 0 })}
            </Text>
          </View>
        )}
      </View>
      <Text style={subtitleTextStyle}>
        {item.is_series ? t('admin.content.type.series') : t('admin.content.type.movie')}
      </Text>
    </View>
  );
}

interface EpisodeTitleCellProps {
  episode: Episode;
  isRTL: boolean;
}

export function EpisodeTitleCell({ episode, isRTL }: EpisodeTitleCellProps) {
  const episodeCodeStyle = [
    styles.episodeCode,
    isRTL ? styles.textRight : styles.textLeft,
  ];

  const episodeTitleStyle = [
    styles.episodeTitle,
    isRTL ? styles.textRight : styles.textLeft,
  ];

  return (
    <View style={styles.episodeTitleContainer}>
      <Text style={episodeCodeStyle}>
        S{String(episode.season || 1).padStart(2, '0')}E{String(episode.episode || 1).padStart(2, '0')}
      </Text>
      <Text style={episodeTitleStyle} numberOfLines={1}>
        {episode.title}
      </Text>
      {episode.duration && (
        <Text style={styles.durationText}>{episode.duration}</Text>
      )}
    </View>
  );
}

interface ActionButtonsProps {
  id: string;
  is_published: boolean;
  is_featured: boolean;
  isEpisode: boolean;
  onTogglePublish: (id: string) => void;
  onToggleFeatured: (id: string) => void;
  onDelete: (id: string) => void;
  t: (key: string) => string;
}

export function ActionButtons({
  id,
  is_published,
  is_featured,
  isEpisode,
  onTogglePublish,
  onToggleFeatured,
  onDelete,
  t,
}: ActionButtonsProps) {
  const buttonSize = isEpisode ? 12 : 14;
  const buttonStyle = isEpisode ? styles.actionButtonSmall : styles.actionButton;

  return (
    <GlassTableCell.Actions>
      {!isEpisode && (
        <Pressable
          onPress={() => onToggleFeatured(id)}
          style={[buttonStyle, is_featured ? styles.featuredActive : styles.featuredInactive]}
        >
          <Star
            size={buttonSize}
            color={is_featured ? '#f59e0b' : '#6b7280'}
            fill={is_featured ? '#f59e0b' : 'transparent'}
          />
        </Pressable>
      )}
      <Pressable
        onPress={() => onTogglePublish(id)}
        style={[buttonStyle, is_published ? styles.publishActive : styles.publishInactive]}
      >
        <Eye size={buttonSize} color={is_published ? '#10b981' : '#6b7280'} />
      </Pressable>
      <Link to={`/admin/content/${id}/edit`} style={{ textDecoration: 'none' }}>
        <Pressable style={[buttonStyle, styles.editButton]}>
          <Text style={[styles.editText, isEpisode && styles.editTextSmall]}>
            {t('common.edit')}
          </Text>
        </Pressable>
      </Link>
      <Pressable
        onPress={() => onDelete(id)}
        style={[buttonStyle, styles.deleteButton]}
      >
        <Trash2 size={buttonSize} color="#ef4444" />
      </Pressable>
    </GlassTableCell.Actions>
  );
}

interface SubtitlesCellProps {
  subtitles: string[];
  isRTL: boolean;
  getLanguageFlag: (lang: string) => string;
  getLanguageName: (lang: string) => string;
}

export function SubtitlesCell({ subtitles, isRTL, getLanguageFlag, getLanguageName }: SubtitlesCellProps) {
  const textStyle = [
    styles.noSubtitlesText,
    isRTL ? styles.textRight : styles.textLeft,
  ];

  if (subtitles.length === 0) {
    return <Text style={textStyle}>-</Text>;
  }

  return (
    <View style={styles.subtitlesContainer}>
      {subtitles.map((lang) => (
        <Text key={lang} style={styles.flagText} title={getLanguageName(lang)}>
          {getLanguageFlag(lang)}
        </Text>
      ))}
    </View>
  );
}

interface SelectionCellProps {
  id: string;
  checked: boolean;
  onChange: (id: string) => void;
}

export function SelectionCell({ id, checked, onChange }: SelectionCellProps) {
  return (
    <View style={styles.selectionCell}>
      <GlassCheckbox checked={checked} onChange={() => onChange(id)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flexRow: {
    flexDirection: 'row',
  },
  flexRowReverse: {
    flexDirection: 'row-reverse',
  },
  textLeft: {
    textAlign: 'left',
  },
  textRight: {
    textAlign: 'right',
  },
  thumbnailContainer: {
    width: 60,
    paddingHorizontal: 4,
  },
  contentThumbnailWrapper: {
    width: 45,
    height: 65,
    borderRadius: 2,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeThumbnailImage: {
    width: 50,
    height: 30,
    borderRadius: 2,
  },
  episodeThumbnailPlaceholder: {
    width: 50,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCellContainer: {
    flex: 1,
    paddingHorizontal: 16,
    minWidth: 200,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgb(229, 229, 229)',
  },
  subtitleText: {
    fontSize: 12,
    color: 'rgb(156, 163, 175)',
    marginTop: 2,
  },
  seriesBadge: {
    backgroundColor: 'rgba(126, 34, 206, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
  },
  seriesBadgeText: {
    fontSize: 11,
    color: 'rgb(216, 180, 254)',
    fontWeight: '500',
  },
  episodeTitleContainer: {
    flex: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  episodeCode: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgb(96, 165, 250)',
    minWidth: 70,
  },
  episodeTitle: {
    fontSize: 14,
    color: 'rgb(229, 229, 229)',
    flex: 1,
  },
  durationText: {
    fontSize: 12,
    color: 'rgb(156, 163, 175)',
  },
  actionButton: {
    padding: 8,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonSmall: {
    padding: 4,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.5)',
  },
  featuredInactive: {
    backgroundColor: 'rgba(107, 114, 128, 0.25)',
  },
  publishActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.5)',
  },
  publishInactive: {
    backgroundColor: 'rgba(107, 114, 128, 0.5)',
  },
  editButton: {
    backgroundColor: 'rgba(147, 51, 234, 0.5)',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.5)',
  },
  editText: {
    fontSize: 12,
    color: 'rgb(216, 180, 254)',
    fontWeight: '500',
  },
  editTextSmall: {
    fontSize: 10,
  },
  noSubtitlesText: {
    fontSize: 14,
    color: 'rgb(156, 163, 175)',
  },
  subtitlesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  flagText: {
    fontSize: 18,
  },
  selectionCell: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
});

export { ContentThumbnail, EpisodeThumbnail };
