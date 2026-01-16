/**
 * HierarchicalContentTable - Tree view for content with expandable series
 *
 * Displays movies as flat rows and series as expandable nodes
 * with episodes nested underneath.
 */

import { useState, useCallback, useMemo } from 'react'
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, ChevronLeft, Star, Eye, Trash2, Film, Tv } from 'lucide-react'
import { GlassTable, GlassTableColumn, GlassTableCell } from '@bayit/shared/ui'
import { useDirection } from '@/hooks/useDirection'
import { adminContentService } from '@/services/adminApi'
import logger from '@/utils/logger'
import { spacing, borderRadius } from '@bayit/shared/theme'

interface ContentItem {
  id: string
  title: string
  description?: string
  thumbnail?: string
  category_name?: string
  year?: number
  is_series: boolean
  is_published: boolean
  is_featured: boolean
  episode_count?: number
  view_count?: number
  avg_rating?: number
  available_subtitles?: string[]
}

interface Episode {
  id: string
  title: string
  thumbnail?: string
  duration?: string
  season?: number
  episode?: number
  is_published: boolean
  is_featured: boolean
  view_count?: number
}

// Union type for table rows (either content or episode)
type TableRow =
  | ({ rowType: 'content' } & ContentItem)
  | ({ rowType: 'episode'; parentId: string } & Episode)

interface Pagination {
  page: number
  pageSize: number
  total: number
}

interface HierarchicalContentTableProps {
  items: ContentItem[]
  loading: boolean
  onTogglePublish: (id: string) => void
  onToggleFeatured: (id: string) => void
  onDelete: (id: string) => void
  pagination: Pagination
  onPageChange: (page: number) => void
  emptyMessage?: string
}

// Language flag mapping
const getLanguageFlag = (lang: string): string => {
  const flags: Record<string, string> = {
    'he': '🇮🇱',
    'en': '🇺🇸',
    'ar': '🇸🇦',
    'ru': '🇷🇺',
    'es': '🇪🇸',
    'fr': '🇫🇷',
    'de': '🇩🇪',
    'it': '🇮🇹',
    'pt': '🇵🇹',
    'zh': '🇨🇳',
    'ja': '🇯🇵',
    'ko': '🇰🇷',
  }
  return flags[lang] || '🌐'
}

// Language name mapping
const getLanguageName = (lang: string): string => {
  const names: Record<string, string> = {
    'he': 'Hebrew',
    'en': 'English',
    'ar': 'Arabic',
    'ru': 'Russian',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'zh': 'Chinese',
    'ja': 'Japanese',
    'ko': 'Korean',
  }
  return names[lang] || lang
}

export default function HierarchicalContentTable({
  items,
  loading,
  onTogglePublish,
  onToggleFeatured,
  onDelete,
  pagination,
  onPageChange,
  emptyMessage,
}: HierarchicalContentTableProps) {
  const { t } = useTranslation()
  const { isRTL, textAlign, flexDirection } = useDirection()

  // Track expanded series
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set())
  // Cache loaded episodes
  const [episodeCache, setEpisodeCache] = useState<Record<string, Episode[]>>({})
  // Track loading states
  const [loadingEpisodes, setLoadingEpisodes] = useState<Set<string>>(new Set())

  const toggleExpand = useCallback(
    async (seriesId: string) => {
      const newExpanded = new Set(expandedSeries)

      if (newExpanded.has(seriesId)) {
        // Collapse
        newExpanded.delete(seriesId)
        setExpandedSeries(newExpanded)
      } else {
        // Expand - load episodes if not cached
        newExpanded.add(seriesId)
        setExpandedSeries(newExpanded)

        if (!episodeCache[seriesId]) {
          try {
            setLoadingEpisodes((prev) => new Set(prev).add(seriesId))
            const response = await adminContentService.getSeriesEpisodes(seriesId)
            setEpisodeCache((prev) => ({
              ...prev,
              [seriesId]: response.episodes || [],
            }))
          } catch (err) {
            logger.error('Failed to load episodes', 'HierarchicalContentTable', err)
          } finally {
            setLoadingEpisodes((prev) => {
              const next = new Set(prev)
              next.delete(seriesId)
              return next
            })
          }
        }
      }
    },
    [expandedSeries, episodeCache]
  )

  // Flatten data: include episodes when their parent series is expanded
  const flattenedData = useMemo<TableRow[]>(() => {
    const result: TableRow[] = []

    items.forEach((item) => {
      // Add the main content item
      result.push({ rowType: 'content', ...item })

      // If series is expanded, add its episodes
      if (item.is_series && expandedSeries.has(item.id)) {
        const episodes = episodeCache[item.id] || []
        episodes.forEach((episode) => {
          result.push({ rowType: 'episode', parentId: item.id, ...episode })
        })

        // Add loading indicator row if episodes are loading
        if (loadingEpisodes.has(item.id) && episodes.length === 0) {
          // We'll handle this in the render function
        }
      }
    })

    return result
  }, [items, expandedSeries, episodeCache, loadingEpisodes])

  // Define table columns
  const columns = useMemo<GlassTableColumn<TableRow>[]>(
    () => [
      {
        key: 'expand',
        label: '',
        width: 50,
        align: 'center',
        render: (_, row) => {
          if (row.rowType === 'episode') {
            return <View style={{ width: 40, height: '100%' }} />
          }
          const item = row as ContentItem & { rowType: 'content' }
          if (!item.is_series) {
            return <View style={{ width: 20 }} />
          }
          return (
            <Pressable onPress={() => toggleExpand(item.id)} style={styles.expandButton}>
              {expandedSeries.has(item.id) ? (
                <ChevronDown size={20} color="#3b82f6" />
              ) : isRTL ? (
                <ChevronLeft size={20} color="#3b82f6" />
              ) : (
                <ChevronRight size={20} color="#3b82f6" />
              )}
            </Pressable>
          )
        },
      },
      {
        key: 'thumbnail',
        label: '',
        width: 80,
        render: (_, row) => {
          if (row.rowType === 'episode') {
            const episode = row as Episode & { rowType: 'episode' }
            return (
              <View style={styles.episodeThumbnailWrapper}>
                {episode.thumbnail ? (
                  <View style={[styles.episodeThumbnail, { backgroundImage: `url(${episode.thumbnail})` } as any]} />
                ) : (
                  <View style={styles.episodeThumbnailPlaceholder}>
                    <Film size={14} color="rgba(255,255,255,0.4)" />
                  </View>
                )}
              </View>
            )
          }
          const item = row as ContentItem & { rowType: 'content' }
          return (
            <View style={styles.contentThumbnailWrapper}>
              <View style={styles.contentThumbnail}>
                {item.thumbnail ? (
                  <View style={[styles.thumbnailImage, { backgroundImage: `url(${item.thumbnail})` } as any]} />
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
          )
        },
      },
      {
        key: 'title',
        label: t('admin.content.columns.title'),
        render: (_, row) => {
          if (row.rowType === 'episode') {
            const episode = row as Episode & { rowType: 'episode'; parentId: string }
            return (
              <View style={styles.episodeTitleContainer}>
                <Text style={[styles.episodeNumber, { textAlign: isRTL ? 'right' : 'left' }]}>
                  S{String(episode.season || 1).padStart(2, '0')}E{String(episode.episode || 1).padStart(2, '0')}
                </Text>
                <Text style={[styles.episodeTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                  {episode.title}
                </Text>
                {episode.duration && (
                  <Text style={styles.episodeDuration}>{episode.duration}</Text>
                )}
              </View>
            )
          }
          const item = row as ContentItem & { rowType: 'content' }
          return (
            <View style={styles.contentTitleContainer}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: spacing.sm }}>
                <Text style={[styles.contentTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.is_series && (
                  <View style={styles.episodeCountBadge}>
                    <Text style={styles.episodeCountText}>
                      {item.episode_count || 0} {t('admin.content.episodes', { count: item.episode_count || 0 })}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.contentType, { textAlign: isRTL ? 'right' : 'left' }]}>
                {item.is_series ? t('admin.content.type.series') : t('admin.content.type.movie')}
              </Text>
            </View>
          )
        },
      },
      {
        key: 'category',
        label: t('admin.content.columns.category'),
        width: 140,
        render: (_, row) => {
          if (row.rowType === 'episode') {
            return <Text style={[styles.cellTextMuted, { textAlign: isRTL ? 'right' : 'left' }]}>-</Text>
          }
          const item = row as ContentItem & { rowType: 'content' }
          return <Text style={[styles.cellText, { textAlign: isRTL ? 'right' : 'left' }]}>{item.category_name || '-'}</Text>
        },
      },
      {
        key: 'year',
        label: t('admin.content.columns.year'),
        width: 80,
        render: (_, row) => {
          if (row.rowType === 'episode') {
            return <Text style={[styles.cellTextMuted, { textAlign: isRTL ? 'right' : 'left' }]}>-</Text>
          }
          const item = row as ContentItem & { rowType: 'content' }
          return <Text style={[styles.cellText, { textAlign: isRTL ? 'right' : 'left' }]}>{item.year || '-'}</Text>
        },
      },
      {
        key: 'subtitles',
        label: t('admin.content.columns.subtitles', 'Subtitles'),
        width: 120,
        render: (_, row) => {
          if (row.rowType === 'episode') {
            return <Text style={[styles.cellTextMuted, { textAlign: isRTL ? 'right' : 'left' }]}>-</Text>
          }
          const item = row as ContentItem & { rowType: 'content' }
          const subtitles = item.available_subtitles || []

          if (subtitles.length === 0) {
            return <Text style={[styles.cellTextMuted, { textAlign: isRTL ? 'right' : 'left' }]}>-</Text>
          }

          return (
            <View style={styles.subtitlesContainer}>
              {subtitles.map((lang) => (
                <Text key={lang} style={styles.subtitleFlag} title={getLanguageName(lang)}>
                  {getLanguageFlag(lang)}
                </Text>
              ))}
            </View>
          )
        },
      },
      {
        key: 'status',
        label: t('admin.content.columns.status'),
        width: 120,
        render: (_, row) => {
          const isPublished = row.is_published
          return (
            <GlassTableCell.Badge variant={isPublished ? 'success' : 'default'}>
              {isPublished ? t('admin.content.status.published') : t('admin.content.status.draft')}
            </GlassTableCell.Badge>
          )
        },
      },
      {
        key: 'actions',
        label: t('common.actions'),
        width: 180,
        render: (_, row) => {
          const isEpisode = row.rowType === 'episode'
          const buttonSize = isEpisode ? 12 : 14
          const buttonStyle = isEpisode ? styles.actionButtonSmall : styles.actionButton

          return (
            <GlassTableCell.Actions>
              {!isEpisode && (
                <Pressable
                  onPress={() => onToggleFeatured(row.id)}
                  style={[buttonStyle, row.is_featured ? styles.actionButtonFeatured : styles.actionButtonInactive]}
                >
                  <Star
                    size={buttonSize}
                    color={row.is_featured ? '#f59e0b' : '#6b7280'}
                    fill={row.is_featured ? '#f59e0b' : 'transparent'}
                  />
                </Pressable>
              )}
              <Pressable
                onPress={() => onTogglePublish(row.id)}
                style={[buttonStyle, row.is_published ? styles.actionButtonPublished : styles.actionButtonUnpublished]}
              >
                <Eye size={buttonSize} color={row.is_published ? '#10b981' : '#6b7280'} />
              </Pressable>
              <Link to={`/admin/content/${row.id}/edit`} style={{ textDecoration: 'none' }}>
                <Pressable style={[buttonStyle, styles.actionButtonEdit]}>
                  <Text style={isEpisode ? styles.editTextSmall : styles.editText}>
                    {t('common.edit')}
                  </Text>
                </Pressable>
              </Link>
              <Pressable
                onPress={() => onDelete(row.id)}
                style={[buttonStyle, styles.actionButtonDelete]}
              >
                <Trash2 size={buttonSize} color="#ef4444" />
              </Pressable>
            </GlassTableCell.Actions>
          )
        },
      },
    ],
    [t, textAlign, flexDirection, expandedSeries, toggleExpand, onToggleFeatured, onTogglePublish, onDelete]
  )

  return (
    <GlassTable
      columns={columns}
      data={flattenedData}
      loading={loading}
      pagination={pagination}
      onPageChange={onPageChange}
      emptyMessage={emptyMessage}
      isRTL={isRTL}
      rowKey={(row) => `${row.rowType}-${row.id}`}
      style={styles.table}
    />
  )
}

const styles = StyleSheet.create({
  expandButton: {
    padding: spacing.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderRadius: borderRadius.md,
  },
  episodeThumbnailWrapper: {
    width: 60,
    paddingHorizontal: 4,
  },
  episodeThumbnail: {
    width: 50,
    height: 30,
    borderRadius: borderRadius.sm,
    // @ts-ignore - Web CSS
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  episodeThumbnailPlaceholder: {
    width: 50,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentThumbnailWrapper: {
    width: 60,
    paddingHorizontal: 4,
    // @ts-ignore - Web CSS
    cursor: 'pointer',
  },
  contentThumbnail: {
    width: 45,
    height: 65,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    // @ts-ignore - Web CSS
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeTitleContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  episodeNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#60a5fa',
    minWidth: 70,
  },
  episodeTitle: {
    fontSize: 14,
    color: '#e5e7eb',
    flex: 1,
  },
  episodeDuration: {
    fontSize: 12,
    color: '#9ca3af',
  },
  contentTitleContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
    minWidth: 200,
  },
  contentTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e5e7eb',
  },
  episodeCountBadge: {
    backgroundColor: 'rgba(126, 34, 206, 0.3)',
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  episodeCountText: {
    fontSize: 11,
    color: '#d8b4fe',
    fontWeight: '500',
  },
  contentType: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  cellText: {
    fontSize: 14,
    color: '#e5e7eb',
  },
  cellTextMuted: {
    fontSize: 14,
    color: '#9ca3af',
  },
  subtitlesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  subtitleFlag: {
    fontSize: 18,
    // @ts-ignore - Web CSS
    cursor: 'pointer',
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  },
  actionButtonSmall: {
    padding: 4,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
  },
  actionButtonFeatured: {
    backgroundColor: 'rgba(245, 158, 11, 0.5)',
  },
  actionButtonInactive: {
    backgroundColor: 'rgba(107, 114, 128, 0.25)',
  },
  actionButtonPublished: {
    backgroundColor: 'rgba(16, 185, 129, 0.5)',
  },
  actionButtonUnpublished: {
    backgroundColor: 'rgba(107, 114, 128, 0.5)',
  },
  actionButtonEdit: {
    backgroundColor: 'rgba(147, 51, 234, 0.5)',
  },
  actionButtonDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.5)',
  },
  editText: {
    fontSize: 12,
    color: '#c084fc',
    fontWeight: '500',
  },
  editTextSmall: {
    fontSize: 10,
    color: '#c084fc',
    fontWeight: '500',
  },
  table: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    // @ts-ignore - Web CSS
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
})
