import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, X, AlertCircle, Music } from 'lucide-react'
import { GlassInput, GlassButton, GlassCheckbox, GlassPageHeader, GlassModal } from '@bayit/shared/ui'
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants'
import { GlassTable, GlassTableCell } from '@bayit/shared/ui/web'
import { SubtitleFlags } from '@bayit/shared/components/SubtitleFlags'
import { adminPodcastsService } from '@/services/adminApi'
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
      const response: PaginatedResponse<Podcast> = await adminPodcastsService.getPodcasts({
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
      await adminPodcastsService.updatePodcast(editingId!, editData)
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
            await adminPodcastsService.deletePodcast(id)
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
      key: 'cover',
      label: t('admin.content.columns.cover', { defaultValue: 'Cover' }),
      width: 80,
      render: (cover: string | undefined, item: Podcast) => (
        <View style={styles.coverContainer}>
          {cover ? (
            <Image
              source={{ uri: cover }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Music size={20} color={colors.textMuted} />
            </View>
          )}
        </View>
      ),
    },
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

        return <Text style={styles.categoryText}>{localizedCategory || '-'}</Text>
      },
    },
    {
      key: 'episode_count',
      label: t('admin.content.columns.episodes', { defaultValue: 'Episodes' }),
      render: (count: number | undefined) => <Text style={styles.episodeCount}>{count || 0}</Text>,
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
          <Text style={styles.emptyText}>-</Text>
        )
      ),
    },
    {
      key: 'is_active',
      label: t('admin.content.columns.status', { defaultValue: 'Status' }),
      render: (isActive: boolean) => (
        <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
            {isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
          </Text>
        </View>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 220,
      render: (_: any, item: Podcast) => (
        <View style={[styles.actionsCell, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Link to={`/admin/podcasts/${item.id}/episodes`} style={{ textDecoration: 'none' }}>
            <GlassButton
              variant="ghost"
              size="sm"
              icon={<Music size={18} color="#a78bfa" />}
              style={styles.actionButton}
              accessibilityLabel={t('admin.podcasts.viewEpisodes', { defaultValue: 'View episodes' })}
            >
              {t('admin.podcasts.viewEpisodes', { defaultValue: 'Episodes' })}
            </GlassButton>
          </Link>
          <GlassButton
            variant="ghost"
            size="sm"
            onPress={() => handleEdit(item)}
            icon={<Edit size={18} color="#60a5fa" />}
            style={styles.actionButton}
            accessibilityLabel={t('admin.podcasts.editPodcast', { defaultValue: 'Edit podcast' })}
          >
            {t('admin.common.edit', { defaultValue: 'Edit' })}
          </GlassButton>
          <GlassButton
            variant="ghost"
            size="sm"
            onPress={() => handleDelete(item.id)}
            disabled={deleting === item.id}
            icon={<Trash2 size={18} color="#f87171" />}
            style={[styles.actionButton, deleting === item.id && styles.disabledButton]}
            accessibilityLabel={t('admin.podcasts.deletePodcast', { defaultValue: 'Delete podcast' })}
          >
            {t('common.delete', { defaultValue: 'Delete' })}
          </GlassButton>
        </View>
      ),
    },
  ], [t, i18n.language, isRTL, deleting, handleEdit, handleDelete])

  const pageConfig = ADMIN_PAGE_CONFIG.podcasts;
  const IconComponent = pageConfig.icon;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
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
          <Text style={styles.errorText}>{error}</Text>
          <GlassButton
            variant="ghost"
            size="sm"
            onPress={() => setError(null)}
            icon={<X size={18} color="#ef4444" />}
            accessibilityLabel={t('common.dismissError', { defaultValue: 'Dismiss error' })}
          />
        </View>
      )}

      <GlassModal
        visible={editingId !== null}
        title={editingId === 'new' ? t('admin.podcasts.newTitle', { defaultValue: 'New Podcast' }) : t('admin.podcasts.editTitle', { defaultValue: 'Edit Podcast' })}
        onClose={() => setEditingId(null)}
        dismissable={false}
        buttons={[
          {
            text: t('admin.common.cancel', { defaultValue: 'Cancel' }),
            style: 'cancel',
            onPress: () => setEditingId(null),
          },
          {
            text: t('admin.common.save', { defaultValue: 'Save' }),
            style: 'default',
            onPress: handleSaveEdit,
          },
        ]}
      >
        <ScrollView style={styles.modalContent}>
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
              label={t('admin.common.active', { defaultValue: 'Active' })}
              checked={editData.is_active || false}
              onChange={(checked) => setEditData({ ...editData, is_active: checked })}
            />
          </View>
        </ScrollView>
      </GlassModal>

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
  container: {
    flex: 1,
  },
  coverContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
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
    color: colors.textSecondary,
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
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#ef4444',
  },
  modalContent: {
    maxHeight: 400,
  },
  input: {
    marginBottom: spacing.md,
  },
  checkboxRow: {
    marginBottom: spacing.lg,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  itemSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  categoryText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  episodeCount: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  badgeInactive: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  badgeTextActive: {
    color: '#22c55e',
  },
  badgeTextInactive: {
    color: '#9ca3af',
  },
  actionsCell: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
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

