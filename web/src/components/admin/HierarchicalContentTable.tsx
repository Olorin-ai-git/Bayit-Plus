/**
 * HierarchicalContentTable - Tree view for content with expandable series
 *
 * Displays movies as flat rows and series as expandable nodes
 * with episodes nested underneath.
 */

import { useState, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, ChevronLeft, Star, Eye, Trash2, Film, Tv } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassTable, GlassTableColumn, GlassTableCell } from '@bayit/shared/ui'
import { useDirection } from '@/hooks/useDirection'
import { contentService } from '@/services/adminApi'
import logger from '@/utils/logger'

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
  onUploadPoster: (id: string) => void
  onDelete: (id: string) => void
  pagination: Pagination
  onPageChange: (page: number) => void
  emptyMessage?: string
}

export default function HierarchicalContentTable({
  items,
  loading,
  onTogglePublish,
  onToggleFeatured,
  onUploadPoster,
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
            const response = await contentService.getSeriesEpisodes(seriesId)
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
            return <View style={styles.episodeIndent} />
          }
          const item = row as ContentItem & { rowType: 'content' }
          if (!item.is_series) {
            return <View style={styles.expandPlaceholder} />
          }
          return (
            <Pressable onPress={() => toggleExpand(item.id)} style={styles.expandButton}>
              {expandedSeries.has(item.id) ? (
                <ChevronDown size={20} color={colors.primary} />
              ) : isRTL ? (
                <ChevronLeft size={20} color={colors.primary} />
              ) : (
                <ChevronRight size={20} color={colors.primary} />
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
              <View style={styles.episodeThumbnailCell}>
                {episode.thumbnail ? (
                  <View style={[styles.episodeThumbnail, { backgroundImage: `url(${episode.thumbnail})` }]} />
                ) : (
                  <View style={styles.episodeThumbnailPlaceholder}>
                    <Film size={14} color={colors.textMuted} />
                  </View>
                )}
              </View>
            )
          }
          const item = row as ContentItem & { rowType: 'content' }
          return (
            <Pressable onPress={() => onUploadPoster(item.id)} style={styles.thumbnailCell} className="thumbnailCell">
              <View style={styles.thumbnailWrapper}>
                {item.thumbnail ? (
                  <View style={[styles.thumbnail, { backgroundImage: `url(${item.thumbnail})` }]} />
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    {item.is_series ? (
                      <Tv size={20} color={colors.textMuted} />
                    ) : (
                      <Film size={20} color={colors.textMuted} />
                    )}
                  </View>
                )}
                <View style={styles.thumbnailOverlay} className="thumbnailOverlay">
                  <Text style={styles.thumbnailOverlayText}>📷 Upload</Text>
                </View>
              </View>
            </Pressable>
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
              <View style={styles.episodeTitleCell}>
                <Text style={[styles.episodeNumber, { textAlign }]}>
                  S{String(episode.season || 1).padStart(2, '0')}E{String(episode.episode || 1).padStart(2, '0')}
                </Text>
                <Text style={[styles.episodeTitle, { textAlign }]} numberOfLines={1}>
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
            <View style={styles.titleCell}>
              <View style={[styles.titleRow, { flexDirection }]}>
                <Text style={[styles.titleText, { textAlign }]} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.is_series && (
                  <View style={styles.episodeBadge}>
                    <Text style={styles.episodeBadgeText}>
                      {item.episode_count || 0} {t('admin.content.episodes', { count: item.episode_count || 0 })}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.typeText, { textAlign }]}>
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
            return <Text style={[styles.cellText, { textAlign }]}>-</Text>
          }
          const item = row as ContentItem & { rowType: 'content' }
          return <Text style={[styles.cellText, { textAlign }]}>{item.category_name || '-'}</Text>
        },
      },
      {
        key: 'year',
        label: t('admin.content.columns.year'),
        width: 80,
        render: (_, row) => {
          if (row.rowType === 'episode') {
            return <Text style={[styles.cellText, { textAlign }]}>-</Text>
          }
          const item = row as ContentItem & { rowType: 'content' }
          return <Text style={[styles.cellText, { textAlign }]}>{item.year || '-'}</Text>
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
                  style={[
                    buttonStyle,
                    { backgroundColor: row.is_featured ? '#f59e0b80' : '#6b728040' },
                  ]}
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
                style={[
                  buttonStyle,
                  { backgroundColor: row.is_published ? '#10b98180' : '#6b728080' },
                ]}
              >
                <Eye size={buttonSize} color={row.is_published ? '#10b981' : '#6b7280'} />
              </Pressable>
              <Link to={`/admin/content/${row.id}/edit`} style={{ textDecoration: 'none' }}>
                <Pressable style={[buttonStyle, { backgroundColor: '#3b82f680' }]}>
                  <Text style={isEpisode ? styles.editTextSmall : styles.editText}>
                    {t('common.edit')}
                  </Text>
                </Pressable>
              </Link>
              <Pressable
                onPress={() => onDelete(row.id)}
                style={[buttonStyle, { backgroundColor: '#ef444480' }]}
              >
                <Trash2 size={buttonSize} color="#ef4444" />
              </Pressable>
            </GlassTableCell.Actions>
          )
        },
      },
    ],
    [t, textAlign, flexDirection, expandedSeries, toggleExpand, onToggleFeatured, onUploadPoster, onTogglePublish, onDelete]
  )

  return (
    <>
      <style>{`
        .thumbnailCell:hover .thumbnailOverlay {
          opacity: 1 !important;
        }
      `}</style>
      <GlassTable
        columns={columns}
        data={flattenedData}
        loading={loading}
        pagination={pagination}
        onPageChange={onPageChange}
        emptyMessage={emptyMessage}
        isRTL={isRTL}
        rowKey={(row) => `${row.rowType}-${row.id}`}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  headerCell: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    minHeight: 70,
  },

  // Cells
  expandCell: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandButton: {
    padding: spacing.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: borderRadius.md,
  },
  expandPlaceholder: {
    width: 20,
  },
  thumbnailCell: {
    width: 60,
    paddingHorizontal: spacing.xs,
    cursor: 'pointer',
  } as any,
  thumbnailWrapper: {
    width: 45,
    height: 65,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  } as any,
  thumbnail: {
    width: '100%',
    height: '100%',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } as any,
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'opacity 0.2s ease',
  } as any,
  thumbnailOverlayText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '600',
  },
  titleCell: {
    flex: 1,
    paddingHorizontal: spacing.md,
    minWidth: 200,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  typeText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  episodeBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  episodeBadgeText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '500',
  },
  categoryCell: {
    width: 140,
    paddingHorizontal: spacing.md,
  },
  yearCell: {
    width: 80,
    paddingHorizontal: spacing.md,
  },
  statusCell: {
    width: 100,
    paddingHorizontal: spacing.md,
  },
  actionsCell: {
    width: 180,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  cellText: {
    fontSize: 14,
    color: colors.text,
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadgeSmall: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  statusBadgeTextSmall: {
    fontSize: 10,
    fontWeight: '500',
  },

  // Action Buttons
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonSmall: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '500',
  },
  editTextSmall: {
    color: '#3b82f6',
    fontSize: 10,
    fontWeight: '500',
  },

  // Episode Rows
  episodesContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.03)',
    minHeight: 50,
    paddingVertical: spacing.xs,
  },
  episodeLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  episodeEmptyRow: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyEpisodeText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  episodeIndent: {
    width: 40,
    height: '100%',
    alignItems: 'center',
  },
  indentLine: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginLeft: -10,
  },
  episodeThumbnailCell: {
    width: 60,
    paddingHorizontal: spacing.xs,
  },
  episodeThumbnail: {
    width: 50,
    height: 30,
    borderRadius: borderRadius.xs,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } as any,
  episodeThumbnailPlaceholder: {
    width: 50,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeTitleCell: {
    flex: 1,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  episodeNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    minWidth: 70,
  },
  episodeTitle: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
  },
  episodeDurationCell: {
    width: 80,
    paddingHorizontal: spacing.md,
  },
  episodeDuration: {
    fontSize: 12,
    color: colors.textMuted,
  },
  episodeStatusCell: {
    width: 100,
    paddingHorizontal: spacing.md,
  },
  episodeActionsCell: {
    width: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
  },

  // Pagination
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  pageButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.md,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  pageInfo: {
    color: colors.textMuted,
    fontSize: 13,
  },
})
