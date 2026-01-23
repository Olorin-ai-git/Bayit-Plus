/**
 * TreeRow - Individual row in hierarchical content table
 * Renders content items (movies/series) and episodes with appropriate styling
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Link } from 'react-router-dom'
import { Star, Eye, Trash2, Film, Tv } from 'lucide-react'
import { GlassTableCell, GlassCheckbox } from '@bayit/shared/ui/web'
import { platformClass } from '@/utils/platformClass'
import { z } from 'zod'

// Schema for content items
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
})

// Schema for episodes
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
})

export type ContentItem = z.infer<typeof ContentItemSchema>
export type Episode = z.infer<typeof EpisodeSchema>

interface ThumbnailCellProps {
  item: ContentItem
  isRTL: boolean
}

function ContentThumbnail({ item, isRTL }: ThumbnailCellProps) {
  return (
    <View className={platformClass('w-[60px] px-1 cursor-pointer')}>
      <View className="w-[45px] h-[65px] rounded-sm overflow-hidden relative">
        {item.thumbnail ? (
          <View
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${item.thumbnail})` } as any}
          />
        ) : (
          <View className="w-full h-full bg-white/5 items-center justify-center">
            {item.is_series ? (
              <Tv size={20} color="rgba(255,255,255,0.4)" />
            ) : (
              <Film size={20} color="rgba(255,255,255,0.4)" />
            )}
          </View>
        )}
      </View>
    </View>
  )
}

interface EpisodeThumbnailProps {
  episode: Episode
  isRTL: boolean
}

function EpisodeThumbnail({ episode, isRTL }: EpisodeThumbnailProps) {
  return (
    <View className="w-[60px] px-1">
      {episode.thumbnail ? (
        <View
          className="w-[50px] h-[30px] rounded-sm bg-cover bg-center"
          style={{ backgroundImage: `url(${episode.thumbnail})` } as any}
        />
      ) : (
        <View className="w-[50px] h-[30px] bg-white/5 rounded-sm items-center justify-center">
          <Film size={14} color="rgba(255,255,255,0.4)" />
        </View>
      )}
    </View>
  )
}

interface ContentTitleCellProps {
  item: ContentItem
  isRTL: boolean
  t: (key: string, options?: any) => string
}

export function ContentTitleCell({ item, isRTL, t }: ContentTitleCellProps) {
  // Dynamic text alignment style
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
    <View className="flex-1 px-4 min-w-[200px]">
      <View style={containerStyle}>
        <Text
          style={titleTextStyle}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        {item.is_series && (
          <View className="bg-purple-700/30 backdrop-blur-md px-2 py-0.5 rounded-full">
            <Text className="text-[11px] text-purple-300 font-medium">
              {item.episode_count || 0} {t('admin.content.episodes', { count: item.episode_count || 0 })}
            </Text>
          </View>
        )}
      </View>
      <Text style={subtitleTextStyle}>
        {item.is_series ? t('admin.content.type.series') : t('admin.content.type.movie')}
      </Text>
    </View>
  )
}

interface EpisodeTitleCellProps {
  episode: Episode
  isRTL: boolean
}

export function EpisodeTitleCell({ episode, isRTL }: EpisodeTitleCellProps) {
  // Dynamic text alignment style
  const episodeCodeStyle = [
    styles.episodeCode,
    isRTL ? styles.textRight : styles.textLeft,
  ];

  const episodeTitleStyle = [
    styles.episodeTitle,
    isRTL ? styles.textRight : styles.textLeft,
  ];

  return (
    <View className="flex-1 px-4 flex flex-row items-center gap-2">
      <Text style={episodeCodeStyle}>
        S{String(episode.season || 1).padStart(2, '0')}E{String(episode.episode || 1).padStart(2, '0')}
      </Text>
      <Text style={episodeTitleStyle} numberOfLines={1}>
        {episode.title}
      </Text>
      {episode.duration && (
        <Text className="text-xs text-gray-400">{episode.duration}</Text>
      )}
    </View>
  )
}

interface ActionButtonsProps {
  id: string
  is_published: boolean
  is_featured: boolean
  isEpisode: boolean
  onTogglePublish: (id: string) => void
  onToggleFeatured: (id: string) => void
  onDelete: (id: string) => void
  t: (key: string) => string
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
  const buttonSize = isEpisode ? 12 : 14
  const buttonClass = isEpisode
    ? 'p-1 rounded-sm justify-center items-center backdrop-blur-md'
    : 'p-2 rounded-md justify-center items-center backdrop-blur-md'

  // Dynamic button background styles
  const featuredButtonStyle = is_featured ? styles.featuredActive : styles.featuredInactive;
  const publishButtonStyle = is_published ? styles.publishActive : styles.publishInactive;

  return (
    <GlassTableCell.Actions>
      {!isEpisode && (
        <Pressable
          onPress={() => onToggleFeatured(id)}
          className={platformClass(buttonClass)}
          style={featuredButtonStyle}
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
        className={platformClass(buttonClass)}
        style={publishButtonStyle}
      >
        <Eye size={buttonSize} color={is_published ? '#10b981' : '#6b7280'} />
      </Pressable>
      <Link to={`/admin/content/${id}/edit`} style={{ textDecoration: 'none' }}>
        <Pressable className={platformClass(buttonClass)} style={styles.editButton}>
          <Text className="text-purple-300 font-medium" style={[isEpisode ? styles.editTextSmall : styles.editTextNormal]}>
            {t('common.edit')}
          </Text>
        </Pressable>
      </Link>
      <Pressable
        onPress={() => onDelete(id)}
        className={platformClass(buttonClass)}
        style={styles.deleteButton}
      >
        <Trash2 size={buttonSize} color="#ef4444" />
      </Pressable>
    </GlassTableCell.Actions>
  )
}

interface SubtitlesCellProps {
  subtitles: string[]
  isRTL: boolean
  getLanguageFlag: (lang: string) => string
  getLanguageName: (lang: string) => string
}

export function SubtitlesCell({ subtitles, isRTL, getLanguageFlag, getLanguageName }: SubtitlesCellProps) {
  // Dynamic text alignment style
  const textStyle = [
    styles.noSubtitlesText,
    isRTL ? styles.textRight : styles.textLeft,
  ];

  if (subtitles.length === 0) {
    return <Text style={textStyle}>-</Text>
  }

  return (
    <View className="flex flex-row items-center gap-1 flex-wrap">
      {subtitles.map((lang) => (
        <Text key={lang} className={platformClass('text-lg cursor-pointer')} title={getLanguageName(lang)}>
          {getLanguageFlag(lang)}
        </Text>
      ))}
    </View>
  )
}

interface SelectionCellProps {
  id: string
  checked: boolean
  onChange: (id: string) => void
}

export function SelectionCell({ id, checked, onChange }: SelectionCellProps) {
  return (
    <View className="items-center justify-center min-h-[40px]">
      <GlassCheckbox checked={checked} onChange={() => onChange(id)} />
    </View>
  )
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
  noSubtitlesText: {
    fontSize: 14,
    color: 'rgb(156, 163, 175)',
  },
  editTextSmall: {
    fontSize: 10,
  },
  editTextNormal: {
    fontSize: 12,
  },
});

export { ContentThumbnail, EpisodeThumbnail }
