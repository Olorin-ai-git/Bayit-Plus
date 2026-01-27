import { View, Text } from 'react-native'
import { colors, fontSize, spacing } from '@olorin/design-tokens'
import {
  ThumbnailCell,
  TitleCell,
  TextCell,
  BadgeCell,
  ActionsCell,
  createStarAction,
  createViewAction,
  createEditAction,
  createDeleteAction,
  type HierarchicalTableColumn,
} from '@bayit/shared/ui'

interface ContentItem {
  id: string
  title: string
  is_series: boolean
  is_featured: boolean
  category_name?: string
  year?: number
  episode_count?: number
  available_subtitles?: string[]
  is_published: boolean
  content_type?: 'movie' | 'series' | 'podcast' | 'radio' | 'audiobook'
  author?: string  // For audiobooks
  narrator?: string  // For audiobooks
}

interface Episode {
  id: string
  title: string
  season?: number
  episode?: number
  is_featured: boolean
  is_published: boolean
}

const getLanguageFlag = (lang: string): string => {
  const flags: Record<string, string> = {
    'he': '🇮🇱', 'en': '🇺🇸', 'ar': '🇸🇦', 'ru': '🇷🇺',
    'es': '🇪🇸', 'fr': '🇫🇷', 'de': '🇩🇪', 'it': '🇮🇹',
    'pt': '🇵🇹', 'zh': '🇨🇳', 'ja': '🇯🇵', 'ko': '🇰🇷',
  }
  return flags[lang] || '🌐'
}

const getLanguageName = (lang: string): string => {
  const names: Record<string, string> = {
    'he': 'Hebrew', 'en': 'English', 'ar': 'Arabic', 'ru': 'Russian',
    'es': 'Spanish', 'fr': 'French', 'de': 'German', 'it': 'Italian',
    'pt': 'Portuguese', 'zh': 'Chinese', 'ja': 'Japanese', 'ko': 'Korean',
  }
  return names[lang] || lang
}

export function getContentTableColumns(
  t: (key: string, fallback?: string) => string,
  onToggleFeatured: (id: string) => void,
  onDelete: (id: string) => void
): HierarchicalTableColumn<ContentItem | Episode>[] {
  return [
    {
      key: 'thumbnail',
      label: '',
      width: 80,
      minWidth: 60,
      maxWidth: 120,
      resizable: false, // Don't allow resizing thumbnail column
      render: (value, row) => {
        const content = row as ContentItem
        const thumbnailType = content.content_type === 'series' ? 'series'
                            : content.content_type === 'podcast' ? 'podcast'
                            : content.content_type === 'radio' ? 'radio'
                            : content.content_type === 'audiobook' ? 'audiobook'
                            : 'movie'
        return (
          <ThumbnailCell
            uri={value}
            type={thumbnailType}
            size="medium"
          />
        )
      },
      renderChild: (value) => <ThumbnailCell uri={value} type="episode" size="small" />,
    },
    {
      key: 'title',
      label: t('admin.content.columns.title', 'Title'),
      render: (value, row) => {
        const content = row as ContentItem

        // Determine content type label
        let typeLabel = t('admin.content.type.movie', 'Movie')
        if (content.content_type === 'series') {
          typeLabel = t('admin.content.type.series', 'Series')
        } else if (content.content_type === 'podcast') {
          typeLabel = t('admin.content.type.podcast', 'Podcast')
        } else if (content.content_type === 'radio') {
          typeLabel = t('admin.content.type.radio', 'Radio')
        } else if (content.content_type === 'audiobook') {
          typeLabel = t('admin.content.type.audiobook', 'Audiobook')
        }

        return (
          <TitleCell
            title={value}
            subtitle={typeLabel}
            badge={content.is_series && content.episode_count ? `${content.episode_count} episodes` : undefined}
            badgeColor="#a855f7"
          />
        )
      },
      renderChild: (value, episode) => {
        const ep = episode as Episode
        return (
          <TitleCell
            title={value}
            subtitle={ep.season && ep.episode ? `S${ep.season}E${ep.episode}` : undefined}
          />
        )
      },
    },
    {
      key: 'category_name',
      label: t('admin.content.columns.category', 'Category'),
      width: 150,
      minWidth: 100,
      maxWidth: 250,
      render: (value) => <TextCell text={value || '-'} align="left" />,
    },
    {
      key: 'year',
      label: t('admin.content.columns.year', 'Year'),
      width: 100,
      minWidth: 80,
      maxWidth: 150,
      align: 'center',
      render: (value) => <TextCell text={value || '-'} align="center" />,
    },
    {
      key: 'available_subtitles',
      label: t('admin.content.columns.subtitles', 'Subtitles'),
      width: 150,
      minWidth: 120,
      maxWidth: 250,
      render: (value) => {
        const subtitles = value as string[] | undefined
        if (!subtitles || subtitles.length === 0) {
          return <TextCell text="-" muted align="center" />
        }
        return (
          <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', alignItems: 'center' }}>
            {subtitles.slice(0, 4).map((lang, index) => (
              <Text key={index} style={{ fontSize: 18 }} title={getLanguageName(lang)}>
                {getLanguageFlag(lang)}
              </Text>
            ))}
            {subtitles.length > 4 && (
              <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>
                +{subtitles.length - 4}
              </Text>
            )}
          </View>
        )
      },
    },
    {
      key: 'is_published',
      label: t('admin.content.columns.status', 'Status'),
      width: 120,
      minWidth: 100,
      maxWidth: 180,
      render: (value) => (
        <BadgeCell
          label={value ? t('admin.content.status.published', 'Published') : t('admin.content.status.draft', 'Draft')}
          variant={value ? 'success' : 'warning'}
        />
      ),
      renderChild: (value) => (
        <BadgeCell
          label={value ? t('admin.content.status.published', 'Published') : t('admin.content.status.draft', 'Draft')}
          variant={value ? 'success' : 'warning'}
        />
      ),
    },
    {
      key: 'actions',
      label: t('common.actions'),
      width: 180,
      minWidth: 150,
      maxWidth: 250,
      align: 'right',
      resizable: false, // Don't allow resizing actions column
      render: (_, row) => {
        const content = row as ContentItem
        return (
          <ActionsCell
            actions={[
              createStarAction(() => onToggleFeatured(content.id), content.is_featured),
              createViewAction(() => { window.location.href = `/admin/content/${content.id}` }),
              createEditAction(() => { window.location.href = `/admin/content/${content.id}/edit` }),
              createDeleteAction(() => onDelete(content.id)),
            ]}
            align="right"
          />
        )
      },
      renderChild: (_, episode) => {
        const ep = episode as Episode
        return (
          <ActionsCell
            actions={[
              createStarAction(() => onToggleFeatured(ep.id), ep.is_featured),
              createViewAction(() => { window.location.href = `/admin/episodes/${ep.id}` }),
              createEditAction(() => { window.location.href = `/admin/episodes/${ep.id}/edit` }),
              createDeleteAction(() => onDelete(ep.id)),
            ]}
            align="right"
          />
        )
      },
    },
  ]
}
