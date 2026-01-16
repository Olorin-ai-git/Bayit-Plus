/**
 * HierarchicalContentTable - Tree view for content with expandable series
 *
 * Displays movies as flat rows and series as expandable nodes
 * with episodes nested underneath.
 */

import { useState, useCallback, useMemo } from 'react'
import { View, Text, Pressable, ActivityIndicator } from 'react-native'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, ChevronLeft, Star, Eye, Trash2, Film, Tv } from 'lucide-react'
import { GlassTable, GlassTableColumn, GlassTableCell } from '@bayit/shared/ui'
import { useDirection } from '@/hooks/useDirection'
import { adminContentService } from '@/services/adminApi'
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
            return <View className="w-10 h-full" />
          }
          const item = row as ContentItem & { rowType: 'content' }
          if (!item.is_series) {
            return <View className="w-5" />
          }
          return (
            <Pressable onPress={() => toggleExpand(item.id)} className="p-2 bg-blue-500/15 backdrop-blur-md rounded-lg">
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
              <View className="w-[60px] px-1">
                {episode.thumbnail ? (
                  <View className="w-[50px] h-[30px] rounded bg-cover bg-center" style={{ backgroundImage: `url(${episode.thumbnail})` }} />
                ) : (
                  <View className="w-[50px] h-[30px] bg-white/5 rounded flex items-center justify-center">
                    <Film size={14} color="rgba(255,255,255,0.4)" />
                  </View>
                )}
              </View>
            )
          }
          const item = row as ContentItem & { rowType: 'content' }
          return (
            <View className="w-[60px] px-1 cursor-pointer">
              <View className="w-[45px] h-[65px] rounded overflow-hidden relative">
                {item.thumbnail ? (
                  <View className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${item.thumbnail})` }} />
                ) : (
                  <View className="w-full h-full bg-white/5 flex items-center justify-center">
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
              <View className="flex-1 px-4 flex flex-row items-center gap-2">
                <Text className={`text-xs font-semibold text-blue-500 min-w-[70px] ${isRTL ? 'text-right' : 'text-left'}`}>
                  S{String(episode.season || 1).padStart(2, '0')}E{String(episode.episode || 1).padStart(2, '0')}
                </Text>
                <Text className={`text-sm text-white flex-1 ${isRTL ? 'text-right' : 'text-left'}`} numberOfLines={1}>
                  {episode.title}
                </Text>
                {episode.duration && (
                  <Text className="text-xs text-white/60">{episode.duration}</Text>
                )}
              </View>
            )
          }
          const item = row as ContentItem & { rowType: 'content' }
          return (
            <View className="flex-1 px-4 min-w-[200px]">
              <View className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2`}>
                <Text className={`text-sm font-medium text-gray-100 ${isRTL ? 'text-right' : 'text-left'}`} numberOfLines={1}>
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
              <Text className={`text-xs text-gray-400 mt-0.5 ${isRTL ? 'text-right' : 'text-left'}`}>
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
            return <Text className={`text-sm text-white ${isRTL ? 'text-right' : 'text-left'}`}>-</Text>
          }
          const item = row as ContentItem & { rowType: 'content' }
          return <Text className={`text-sm text-white ${isRTL ? 'text-right' : 'text-left'}`}>{item.category_name || '-'}</Text>
        },
      },
      {
        key: 'year',
        label: t('admin.content.columns.year'),
        width: 80,
        render: (_, row) => {
          if (row.rowType === 'episode') {
            return <Text className={`text-sm text-white ${isRTL ? 'text-right' : 'text-left'}`}>-</Text>
          }
          const item = row as ContentItem & { rowType: 'content' }
          return <Text className={`text-sm text-white ${isRTL ? 'text-right' : 'text-left'}`}>{item.year || '-'}</Text>
        },
      },
      {
        key: 'subtitles',
        label: t('admin.content.columns.subtitles', 'Subtitles'),
        width: 120,
        render: (_, row) => {
          if (row.rowType === 'episode') {
            return <Text className={`text-sm text-white ${isRTL ? 'text-right' : 'text-left'}`}>-</Text>
          }
          const item = row as ContentItem & { rowType: 'content' }
          const subtitles = item.available_subtitles || []

          if (subtitles.length === 0) {
            return <Text className={`text-sm text-white/40 opacity-50 ${isRTL ? 'text-right' : 'text-left'}`}>-</Text>
          }

          return (
            <View className="flex flex-row items-center gap-1 flex-wrap">
              {subtitles.map((lang) => (
                <Text key={lang} className="text-lg cursor-pointer" title={getLanguageName(lang)}>
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
          const buttonClass = isEpisode
            ? "p-1 rounded justify-center items-center backdrop-blur-md"
            : "p-2 rounded-lg justify-center items-center backdrop-blur-md"

          return (
            <GlassTableCell.Actions>
              {!isEpisode && (
                <Pressable
                  onPress={() => onToggleFeatured(row.id)}
                  className={`${buttonClass} ${row.is_featured ? 'bg-amber-500/50' : 'bg-gray-500/25'}`}
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
                className={`${buttonClass} ${row.is_published ? 'bg-green-500/50' : 'bg-gray-500/50'}`}
              >
                <Eye size={buttonSize} color={row.is_published ? '#10b981' : '#6b7280'} />
              </Pressable>
              <Link to={`/admin/content/${row.id}/edit`} style={{ textDecoration: 'none' }}>
                <Pressable className={`${buttonClass} bg-purple-600/50`}>
                  <Text className={`${isEpisode ? 'text-[10px]' : 'text-xs'} text-purple-400 font-medium`}>
                    {t('common.edit')}
                  </Text>
                </Pressable>
              </Link>
              <Pressable
                onPress={() => onDelete(row.id)}
                className={`${buttonClass} bg-red-500/50`}
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
      className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
    />
  )
}
