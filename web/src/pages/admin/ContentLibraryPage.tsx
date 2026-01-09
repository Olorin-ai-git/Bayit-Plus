import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Download, Search, Trash2, Eye, Star, X, AlertCircle } from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import { contentService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassButton } from '@bayit/shared/ui'
import { useDirection } from '@/hooks/useDirection'
import logger from '@/utils/logger'
import { FreeContentImportWizard } from '@/components/admin/FreeContentImportWizard'
import type { Content, PaginatedResponse } from '@/types/content'

interface Pagination {
  page: number
  pageSize: number
  total: number
}

const statusColors: Record<string, { bg: string; text: string; labelKey: string }> = {
  published: { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E', labelKey: 'admin.content.status.published' },
  draft: { bg: 'rgba(107, 114, 128, 0.2)', text: '#6B7280', labelKey: 'admin.content.status.draft' },
}

export default function ContentLibraryPage() {
  const { t } = useTranslation()
  const { isRTL, textAlign, flexDirection } = useDirection()
  const [items, setItems] = useState<Content[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [showImportWizard, setShowImportWizard] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    search: '',
    is_published: undefined as boolean | undefined,
  })

  const loadContent = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response: PaginatedResponse<Content> = await contentService.getContent({
        page: pagination.page,
        page_size: pagination.pageSize,
        search: filters.search || undefined,
        is_published: filters.is_published,
      })
      setItems(response.items || [])
      setPagination((prev) => ({ ...prev, total: response.total || 0 }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load content'
      logger.error(msg, 'ContentLibraryPage', err)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.pageSize, filters])

  useEffect(() => {
    loadContent()
  }, [loadContent])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setFilters({ ...filters, search: query })
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleDeleteContent = async (id: string) => {
    if (!window.confirm(t('admin.content.confirmDelete'))) return
    try {
      setDeleting(id)
      await contentService.deleteContent(id)
      setItems(items.filter((item) => item.id !== id))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete content'
      logger.error(msg, 'ContentLibraryPage', err)
      setError(msg)
    } finally {
      setDeleting(null)
    }
  }

  const handleTogglePublish = async (id: string) => {
    try {
      await contentService.publishContent(id)
      await loadContent()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update content'
      logger.error(msg, 'ContentLibraryPage', err)
      setError(msg)
    }
  }

  const getStatusBadge = (isPublished: boolean) => {
    const status = isPublished ? 'published' : 'draft'
    const style = statusColors[status]
    return (
      <View style={[styles.badge, { backgroundColor: style.bg }]}>
        <Text style={[styles.badgeText, { color: style.text }]}>
          {t(style.labelKey, { defaultValue: status })}
        </Text>
      </View>
    )
  }

  const columns = [
    {
      key: 'title',
      label: t('admin.content.columns.title', { defaultValue: 'Title' }),
      render: (title: string, item: Content) => (
        <View>
          <View style={styles.titleRow}>
            {item.thumbnail && (
              <View
                style={[
                  styles.thumbnail,
                  { backgroundImage: `url(${item.thumbnail})` },
                ]}
              />
            )}
            <View>
              <Text style={styles.itemTitle}>{title}</Text>
              {item.is_series && (
                <Text style={styles.seriesInfo}>
                  S{item.season}:E{item.episode}
                </Text>
              )}
            </View>
          </View>
        </View>
      ),
    },
    {
      key: 'category_name',
      label: t('admin.content.columns.category', { defaultValue: 'Category' }),
      render: (category: string | undefined) => (
        <Text style={styles.cellText}>{category || '-'}</Text>
      ),
    },
    {
      key: 'year',
      label: t('admin.content.columns.year', { defaultValue: 'Year' }),
      render: (year: number | undefined) => (
        <Text style={styles.cellText}>{year || '-'}</Text>
      ),
    },
    {
      key: 'is_published',
      label: t('admin.content.columns.status', { defaultValue: 'Status' }),
      render: (isPublished: boolean) => getStatusBadge(isPublished),
    },
    {
      key: 'view_count',
      label: t('admin.content.columns.views', { defaultValue: 'Views' }),
      render: (views: number | undefined) => (
        <Text style={styles.cellText}>{views || 0}</Text>
      ),
    },
    {
      key: 'avg_rating',
      label: t('admin.content.columns.rating', { defaultValue: 'Rating' }),
      render: (rating: number | undefined) => (
        <Text style={styles.cellText}>{rating ? rating.toFixed(1) : '-'}</Text>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 150,
      render: (_: any, item: Content) => (
        <View style={[styles.actionsCell, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable
            onPress={() => handleTogglePublish(item.id)}
            style={[
              styles.actionButton,
              { backgroundColor: item.is_published ? '#10b98180' : '#6b728080' },
            ]}
          >
            <Eye size={14} color={item.is_published ? '#10b981' : '#6b7280'} />
          </Pressable>
          <Link to={`/admin/content/${item.id}/edit`} style={{ textDecoration: 'none' }}>
            <Pressable style={[styles.actionButton, { backgroundColor: '#3b82f680' }]}>
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
          </Link>
          <Pressable
            onPress={() => handleDeleteContent(item.id)}
            disabled={deleting === item.id}
            style={[
              styles.actionButton,
              { backgroundColor: '#ef444480', opacity: deleting === item.id ? 0.5 : 1 },
            ]}
          >
            <Trash2 size={14} color="#ef4444" />
          </Pressable>
        </View>
      ),
    },
  ]

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.titles.content', { defaultValue: 'Content Library' })}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('admin.content.subtitle', { defaultValue: 'Manage movies, series, and other video content' })}
          </Text>
        </View>
        <View style={[styles.actionButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable
            onPress={() => setShowImportWizard(true)}
            style={styles.importButton}
          >
            <Download size={18} color={colors.text} />
            <Text style={styles.importButtonText}>
              {t('admin.content.importFree', { defaultValue: 'Import Free Content' })}
            </Text>
          </Pressable>
          <Link to="/admin/content/new" style={{ textDecoration: 'none' }}>
            <GlassButton
              title={t('admin.actions.new', { defaultValue: 'Add Content' })}
              variant="primary"
              icon={<Plus size={18} color={colors.text} />}
            />
          </Link>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={[styles.filtersContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.searchWrapper}>
          <Search size={16} color={colors.textMuted} style={styles.searchIcon} />
          <input
            type="text"
            placeholder={t('admin.content.searchPlaceholder', { defaultValue: 'Search content...' })}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={styles.searchInput}
          />
        </View>
        <select
          value={filters.is_published === undefined ? '' : filters.is_published ? 'published' : 'draft'}
          onChange={(e) =>
            setFilters({
              ...filters,
              is_published:
                e.target.value === '' ? undefined : e.target.value === 'published',
            })
          }
          style={styles.filterSelect}
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </View>

      {/* Error Message */}
      {error && (
        <View style={styles.errorContainer}>
          <AlertCircle size={18} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <X size={18} color="#ef4444" />
          </Pressable>
        </View>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        searchPlaceholder={t('admin.content.searchPlaceholder', { defaultValue: 'Search content...' })}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        emptyMessage={t('admin.content.emptyMessage', { defaultValue: 'No content found' })}
      />

      {/* Import Wizard Modal */}
      <FreeContentImportWizard
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        onSuccess={() => loadContent()}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.lg,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: '#059669',
    marginRight: spacing.sm,
  },
  importButtonText: {
    color: colors.text,
    fontWeight: '500',
    fontSize: 14,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  searchWrapper: {
    flex: 1,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.md,
    zIndex: 1,
  },
  searchInput: {
    width: '100%',
    paddingLeft: spacing.lg + spacing.md + 8,
    paddingRight: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundLighter,
    color: colors.text,
    fontSize: 14,
  } as any,
  filterSelect: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundLighter,
    color: colors.text,
    fontSize: 14,
    minWidth: 150,
  } as any,
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: '#ef444420',
    borderWidth: 1,
    borderColor: '#ef444440',
    marginBottom: spacing.lg,
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumbnail: {
    width: 40,
    height: 60,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  seriesInfo: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  cellText: {
    fontSize: 14,
    color: colors.text,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionsCell: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '500',
  },
})
