import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, X, AlertCircle, Music } from 'lucide-react'
import { GlassInput, GlassButton, GlassCheckbox, GlassPageHeader } from '@bayit/shared/ui'
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants'
import { GlassTable, GlassTableCell } from '@bayit/shared/ui/web'
import { SubtitleFlags } from '@bayit/shared/components/SubtitleFlags'
import { adminContentService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import { useNotifications } from '@olorin/glass-ui/hooks'
import logger from '@/utils/logger'
import { getLocalizedName } from '@bayit/shared-utils/contentLocalization'
import type { Podcast, PaginatedResponse } from '@/types/content'

interface Pagination {
  page: number
  pageSize: number
  total: number
}

interface EditingPodcast extends Partial<Podcast> {
  id?: string
}

export default function PodcastsPage() {
  const { t, i18n } = useTranslation()
  const { isRTL, textAlign, flexDirection } = useDirection()
  const notifications = useNotifications()
  const [items, setItems] = useState<Podcast[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EditingPodcast>({})
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadPodcasts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response: PaginatedResponse<Podcast> = await adminContentService.getPodcasts({
        page: pagination.page,
        page_size: pagination.pageSize,
      })
      setItems(response.items || [])
      setPagination((prev) => ({ ...prev, total: response.total || 0 }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load podcasts'
      logger.error(msg, 'PodcastsPage', err)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.pageSize])

  useEffect(() => {
    loadPodcasts()
  }, [loadPodcasts])

  const handleEdit = (item: Podcast) => {
    setEditingId(item.id)
    setEditData(item)
  }

  const handleSaveEdit = async () => {
    if (!editData.title) {
      setError(t('admin.content.validation.titleRequired', { defaultValue: 'Title is required' }))
      return
    }
    try {
      await adminContentService.updatePodcast(editingId!, editData)
      setEditingId(null)
      setEditData({})
      await loadPodcasts()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update podcast'
      logger.error(msg, 'PodcastsPage', err)
      setError(msg)
    }
  }

  const handleDelete = (id: string) => {
    notifications.show({
      level: 'warning',
      message: t('admin.content.confirmDelete'),
      dismissable: true,
      action: {
        label: t('common.delete', 'Delete'),
        type: 'action',
        onPress: async () => {
          try {
            setDeleting(id)
            await adminContentService.deletePodcast(id)
            setItems(items.filter((item) => item.id !== id))
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to delete podcast'
            logger.error(msg, 'PodcastsPage', err)
            setError(msg)
          } finally {
            setDeleting(null)
          }
        },
      },
    })
  }

  const columns = useMemo(() => [
    {
      key: 'title',
      label: t('admin.content.columns.title', { defaultValue: 'Title' }),
      render: (title: string, item: Podcast) => {
        const localizedTitle = getLocalizedName(item, i18n.language)
        const localizedAuthor = i18n.language === 'en' && item.author_en ? item.author_en
          : i18n.language === 'es' && item.author_es ? item.author_es
          : item.author

        return (
          <View>
            <Text style={styles.itemTitle}>{localizedTitle}</Text>
            {localizedAuthor && <Text style={styles.itemSubtext}>{localizedAuthor}</Text>}
          </View>
        )
      },
    },
    {
      key: 'category',
      label: t('admin.content.columns.category', { defaultValue: 'Category' }),
      render: (category: string | undefined, item: Podcast) => {
        const localizedCategory = i18n.language === 'en' && item.category_en ? item.category_en
          : i18n.language === 'es' && item.category_es ? item.category_es
          : item.category

        return <Text className="text-sm text-white">{localizedCategory || '-'}</Text>
      },
    },
    {
      key: 'episode_count',
      label: t('admin.content.columns.episodes', { defaultValue: 'Episodes' }),
      render: (count: number | undefined) => <Text className="text-sm text-white">{count || 0}</Text>,
    },
    {
      key: 'available_languages',
      label: t('admin.content.columns.languages', { defaultValue: 'Languages' }),
      width: 120,
      render: (languages: string[] | undefined) => (
        languages && languages.length > 0 ? (
          <View style={styles.languagesCell}>
            <SubtitleFlags
              languages={languages}
              size="small"
              showTooltip={true}
              isRTL={isRTL}
            />
          </View>
        ) : (
          <Text className="text-sm text-gray-500">-</Text>
        )
      ),
    },
    {
      key: 'is_active',
      label: t('admin.content.columns.status', { defaultValue: 'Status' }),
      render: (isActive: boolean) => (
        <View style={[styles.badge, { backgroundColor: isActive ? '#10b98120' : '#6b728020' }]}>
          <Text style={[styles.badgeText, { color: isActive ? '#10b981' : '#6b7280' }]}>
            {isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 150,
      render: (_: any, item: Podcast) => (
        <View style={[styles.actionsCell, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Link to={`/admin/podcasts/${item.id}/episodes`} style={{ textDecoration: 'none' }}>
            <GlassButton
              variant="ghost"
              size="sm"
              icon={<Music size={16} color="#8b5cf6" />}
              style={styles.actionButton}
              accessibilityLabel={t('admin.podcasts.viewEpisodes', { defaultValue: 'View episodes' })}
            />
          </Link>
          <GlassButton
            variant="ghost"
            size="sm"
            onPress={() => handleEdit(item)}
            icon={<Edit size={16} color="#a855f7" />}
            style={styles.actionButton}
            accessibilityLabel={t('admin.podcasts.editPodcast', { defaultValue: 'Edit podcast' })}
          />
          <GlassButton
            variant="ghost"
            size="sm"
            onPress={() => handleDelete(item.id)}
            disabled={deleting === item.id}
            icon={<Trash2 size={16} color="#ef4444" />}
            style={[styles.actionButton, deleting === item.id && styles.disabledButton]}
            accessibilityLabel={t('admin.podcasts.deletePodcast', { defaultValue: 'Delete podcast' })}
          />
        </View>
      ),
    },
  ], [t, i18n.language, isRTL, deleting, handleEdit, handleDelete])

  const pageConfig = ADMIN_PAGE_CONFIG.podcasts;
  const IconComponent = pageConfig.icon;

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg }}>
      <GlassPageHeader
        title={t('admin.titles.podcasts', { defaultValue: 'Podcasts' })}
        subtitle={t('admin.podcasts.subtitle', { defaultValue: 'Manage podcasts and episodes' })}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        badge={items.length}
        isRTL={isRTL}
        action={
          <GlassButton
            variant="primary"
            onPress={() => {
              setEditingId('new')
              setEditData({ is_active: true })
            }}
            icon={<Plus size={18} color={colors.text} />}
            accessibilityLabel={t('admin.actions.newPodcast', { defaultValue: 'Create new podcast' })}
          >
            {t('admin.actions.new', { defaultValue: 'New' })}
          </GlassButton>
        }
      />

      {error && (
        <View style={[styles.errorContainer, { marginBottom: spacing.lg }]}>
          <AlertCircle size={18} color="#ef4444" />
          <Text className="flex-1 text-red-500 text-sm">{error}</Text>
          <GlassButton
            variant="ghost"
            size="sm"
            onPress={() => setError(null)}
            icon={<X size={18} color="#ef4444" />}
            accessibilityLabel={t('common.dismissError', { defaultValue: 'Dismiss error' })}
          />
        </View>
      )}

      {editingId && (
        <View style={styles.editForm}>
          <Text style={styles.formTitle}>
            {editingId === 'new' ? 'New Podcast' : 'Edit Podcast'}
          </Text>
          <GlassInput
            label={t('admin.podcasts.form.title', 'Podcast title')}
            containerStyle={styles.input}
            placeholder="Podcast title"
            value={editData.title || ''}
            onChangeText={(value) => setEditData({ ...editData, title: value })}
          />
          <GlassInput
            label={t('admin.podcasts.form.author', 'Author')}
            containerStyle={styles.input}
            placeholder="Author"
            value={editData.author || ''}
            onChangeText={(value) => setEditData({ ...editData, author: value })}
          />
          <GlassInput
            label={t('admin.podcasts.form.description', 'Description')}
            containerStyle={styles.input}
            placeholder="Description"
            value={editData.description || ''}
            onChangeText={(value) => setEditData({ ...editData, description: value })}
            multiline
          />
          <GlassInput
            label={t('admin.podcasts.form.category', 'Category')}
            containerStyle={styles.input}
            placeholder="Category"
            value={editData.category || ''}
            onChangeText={(value) => setEditData({ ...editData, category: value })}
          />
          <GlassInput
            label={t('admin.podcasts.form.rssFeed', 'RSS Feed URL')}
            containerStyle={styles.input}
            placeholder="RSS Feed URL"
            value={editData.rss_feed || ''}
            onChangeText={(value) => setEditData({ ...editData, rss_feed: value })}
          />
          <GlassInput
            label={t('admin.podcasts.form.website', 'Website URL (optional)')}
            containerStyle={styles.input}
            placeholder="Website URL (optional)"
            value={editData.website || ''}
            onChangeText={(value) => setEditData({ ...editData, website: value })}
          />
          <View style={styles.checkboxRow}>
            <GlassCheckbox
              label={t('admin.common.active')}
              checked={editData.is_active || false}
              onChange={(checked) => setEditData({ ...editData, is_active: checked })}
            />
          </View>
          <View style={styles.formActions}>
            <GlassButton
              variant="secondary"
              onPress={() => setEditingId(null)}
              accessibilityLabel={t('admin.common.cancel')}
            >
              {t('admin.common.cancel')}
            </GlassButton>
            <GlassButton
              variant="primary"
              onPress={handleSaveEdit}
              accessibilityLabel={t('admin.common.savePodcast', { defaultValue: 'Save podcast' })}
            >
              {t('admin.common.save')}
            </GlassButton>
          </View>
        </View>
      )}

      <GlassTable
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        emptyMessage={t('admin.podcasts.emptyMessage', { defaultValue: 'No podcasts found' })}
        isRTL={isRTL}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  editForm: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
  },
  checkboxRow: {
    marginBottom: spacing.lg,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  itemSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsCell: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  languagesCell: {
    position: 'relative',
    minWidth: 60,
    height: 24,
  },
})

