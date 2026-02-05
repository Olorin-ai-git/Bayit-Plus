import { View, Text, Pressable } from 'react-native'
import { Sparkles, FlaskConical } from 'lucide-react'
import { colors, fontSize, spacing } from '@olorin/design-tokens'
import {
  ThumbnailCell,
  TitleCell,
  TextCell,
  ActionsCell,
  GlassTooltip,
  createStarAction,
  createViewAction,
  createEditAction,
  createDeleteAction,
  type HierarchicalTableColumn,
} from '@bayit/shared/ui'
import { FlagWithSparkle } from '@/components/common/FlagWithSparkle'
import { isSeriesContent } from '@/utils/contentHelpers'

interface ContentItem {
  id: string
  title: string
  /** @deprecated Use isSeriesContent() helper instead */
  is_series?: boolean
  is_featured: boolean
  is_beta_content?: boolean
  category_name?: string
  year?: number
  episode_count?: number
  available_subtitles?: string[]
  ai_subtitles?: string[]  // Languages with AI-generated versions (nikud, shoresh, heblish)
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


// Custom action creator for Subtitle AI features (Hebrew & English)
const createSubtitleAIAction = (
  onClick: () => void,
  hasSubtitles: boolean = false,
  tooltip: string = 'Subtitle AI'
) => ({
  icon: (
    <GlassTooltip content={tooltip}>
      <Pressable
        onPress={onClick}
        style={{
          padding: 6,
          borderRadius: 6,
          backgroundColor: 'rgba(139, 92, 246, 0.15)',
        }}
      >
        <Sparkles size={16} color={hasSubtitles ? colors.primary.DEFAULT : colors.textSecondary} />
      </Pressable>
    </GlassTooltip>
  ),
  label: tooltip,
  onClick,
})

// Custom action creator for Beta toggle
const createBetaAction = (
  onClick: () => void,
  isBeta: boolean = false,
  tooltip?: string
) => {
  const label = tooltip || (isBeta ? 'Remove from Beta' : 'Add to Beta')
  return {
    icon: (
      <GlassTooltip content={label}>
        <Pressable
          onPress={onClick}
          style={{
            padding: 6,
            borderRadius: 6,
            backgroundColor: isBeta ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.1)',
          }}
        >
          <FlaskConical size={16} color={isBeta ? colors.info.DEFAULT : colors.textSecondary} />
        </Pressable>
      </GlassTooltip>
    ),
    label,
    onClick,
  }
}

export function getContentTableColumns(
  t: (key: string, fallback?: string) => string,
  onToggleFeatured: (id: string) => void,
  onDelete: (id: string) => void,
  onHebrewAI?: (id: string, title: string) => void,
  onToggleBeta?: (id: string) => void
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
      width: 280,
      minWidth: 200,
      maxWidth: 400,
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

        // Show warning badge for series without episodes
        const hasNoEpisodes = isSeriesContent(content) && (!content.episode_count || content.episode_count === 0)
        const episodeBadge = hasNoEpisodes
          ? t('admin.content.noEpisodes', 'No Episodes')
          : isSeriesContent(content) && content.episode_count
            ? `${content.episode_count} episodes`
            : undefined
        const badgeColor = hasNoEpisodes ? '#ef4444' : '#a855f7'  // Red for warning, purple for normal

        return (
          <TitleCell
            title={value}
            subtitle={typeLabel}
            badge={episodeBadge}
            badgeColor={badgeColor}
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
      width: 100,
      minWidth: 80,
      maxWidth: 150,
      render: (value) => <TextCell text={value || '-'} align="left" />,
    },
    {
      key: 'year',
      label: t('admin.content.columns.year', 'Year'),
      width: 70,
      minWidth: 60,
      maxWidth: 100,
      align: 'center',
      render: (value) => <TextCell text={value || '-'} align="center" />,
    },
    {
      key: 'available_subtitles',
      label: t('admin.content.columns.subtitles', 'Subtitles'),
      width: 200,
      minWidth: 150,
      maxWidth: 300,
      render: (value, row) => {
        const content = row as ContentItem
        const subtitles = value as string[] | undefined
        const aiSubtitles = content.ai_subtitles || []

        if (!subtitles || subtitles.length === 0) {
          return <TextCell text="-" muted align="center" />
        }
        return (
          <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', alignItems: 'center' }}>
            {subtitles.slice(0, 4).map((lang, index) => (
              <FlagWithSparkle
                key={index}
                language={lang}
                hasAI={aiSubtitles.includes(lang)}
              />
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
      key: 'actions',
      label: t('common.actions'),
      width: 220,
      minWidth: 180,
      maxWidth: 280,
      align: 'right',
      resizable: false, // Don't allow resizing actions column
      render: (_, row) => {
        const content = row as ContentItem
        const hasHebrew = content.available_subtitles?.includes('he') || false
        const isBeta = content.is_beta_content || false

        // Determine the correct view URL based on content type
        const getViewUrl = () => {
          switch (content.content_type) {
            case 'series':
              return `/vod/series/${content.id}`
            case 'podcast':
              return `/podcasts/${content.id}`
            case 'radio':
              return `/radio/${content.id}`
            case 'audiobook':
              return `/audiobooks/${content.id}`
            case 'movie':
            default:
              // Also check is_series for backwards compatibility
              return isSeriesContent(content) ? `/vod/series/${content.id}` : `/vod/movie/${content.id}`
          }
        }

        const actions = [
          createStarAction(
            () => onToggleFeatured(content.id),
            content.is_featured,
            content.is_featured ? t('admin.content.unfeature', 'Remove from Featured') : t('admin.content.feature', 'Add to Featured')
          ),
          createViewAction(
            () => { window.open(getViewUrl(), '_blank') },
            t('common.view', 'View')
          ),
          createEditAction(
            () => { window.location.href = `/admin/content/${content.id}/edit` },
            t('common.edit', 'Edit')
          ),
          createDeleteAction(
            () => onDelete(content.id),
            t('common.delete', 'Delete')
          ),
        ]
        // Add Beta toggle action if handler is provided
        if (onToggleBeta) {
          actions.splice(1, 0, createBetaAction(
            () => onToggleBeta(content.id),
            isBeta,
            isBeta ? t('admin.content.removeFromBeta', 'Remove from Beta') : t('admin.content.markAsBeta', 'Add to Beta')
          ))
        }
        // Add Subtitle AI action if handler is provided (Hebrew & English)
        if (onHebrewAI) {
          const hasEnglish = content.available_subtitles?.includes('en') || false
          const hasAnySubtitles = hasHebrew || hasEnglish
          actions.splice(onToggleBeta ? 2 : 1, 0, createSubtitleAIAction(
            () => onHebrewAI(content.id, content.title),
            hasAnySubtitles,
            t('admin.content.subtitleAI', 'Subtitle AI (Hebrew & English)')
          ))
        }
        return (
          <ActionsCell
            actions={actions}
            align="right"
            showTooltips
          />
        )
      },
      renderChild: (_, episode) => {
        const ep = episode as Episode
        return (
          <ActionsCell
            actions={[
              createStarAction(
                () => onToggleFeatured(ep.id),
                ep.is_featured,
                ep.is_featured ? t('admin.content.unfeature', 'Remove from Featured') : t('admin.content.feature', 'Add to Featured')
              ),
              createViewAction(
                () => { window.open(`/vod/${ep.id}`, '_blank') },
                t('common.view', 'View')
              ),
              createEditAction(
                () => { window.location.href = `/admin/content/${ep.id}/edit` },
                t('common.edit', 'Edit')
              ),
              createDeleteAction(
                () => onDelete(ep.id),
                t('common.delete', 'Delete')
              ),
            ]}
            align="right"
            showTooltips
          />
        )
      },
    },
  ]
}
