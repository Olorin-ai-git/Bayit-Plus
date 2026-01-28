import { useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, ChevronLeft, Languages, RefreshCw } from 'lucide-react'
import { GlassInput, GlassSelect, GlassButton, GlassPageHeader, GlassModal, GlassErrorBanner } from '@bayit/shared/ui'
import { GlassTable } from '@bayit/shared/ui/web'
import { adminPodcastsService, adminPodcastEpisodesService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants'
import logger from '@/utils/logger'
import type { PodcastEpisode, PaginatedResponse, TranslationStatus } from '@/types/content'

interface Pagination {
  page: number
  pageSize: number
  total: number
}

interface EditingEpisode extends Partial<PodcastEpisode> {
  id?: string
}

function TranslationStatusBadge({ status }: { status?: TranslationStatus }) {
  const { t } = useTranslation()
  const statusConfig: Record<string, { bg: string; color: string; labelKey: string }> = {
    pending: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', labelKey: 'admin.translation.status.pending' },
    processing: { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', labelKey: 'admin.translation.status.processing' },
    completed: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', labelKey: 'admin.translation.status.completed' },
    failed: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', labelKey: 'admin.translation.status.failed' },
  }
  const config = statusConfig[status || 'pending'] || statusConfig.pending
  const label = t(config.labelKey, { defaultValue: status?.charAt(0).toUpperCase() + status?.slice(1) || 'Pending' })
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{label}</Text>
    </View>
  )
}

export default function PodcastEpisodesPage() {
  const { podcastId } = useParams<{ podcastId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isRTL, textAlign, flexDirection } = useDirection()
  const [podcastTitle, setPodcastTitle] = useState('')
  const [items, setItems] = useState<PodcastEpisode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EditingEpisode>({})
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [translating, setTranslating] = useState<string | null>(null)
  const [bulkTranslating, setBulkTranslating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const TRANSLATION_STATUS_OPTIONS = [
    { value: 'all', label: t('admin.common.all', { defaultValue: 'All' }) },
    { value: 'pending', label: t('admin.translation.status.pending', { defaultValue: 'Pending' }) },
    { value: 'processing', label: t('admin.translation.status.processing', { defaultValue: 'Processing' }) },
    { value: 'completed', label: t('admin.translation.status.completed', { defaultValue: 'Completed' }) },
    { value: 'failed', label: t('admin.translation.status.failed', { defaultValue: 'Failed' }) },
  ]

  const loadEpisodes = useCallback(async () => {
    if (!podcastId) return
    setIsLoading(true)
    setError(null)
    try {
      const filters: { page: number; page_size: number; translation_status?: TranslationStatus } = {
        page: pagination.page,
        page_size: pagination.pageSize,
      }
      if (statusFilter !== 'all') {
        filters.translation_status = statusFilter as TranslationStatus
      }
      const response: PaginatedResponse<PodcastEpisode> = await adminPodcastEpisodesService.getEpisodes(
        podcastId,
        filters
      )
      setItems(response.items || [])
      setPagination((prev) => ({ ...prev, total: response.total || 0 }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load episodes'
      logger.error(msg, 'PodcastEpisodesPage', err)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [podcastId, pagination.page, pagination.pageSize, statusFilter])

  useEffect(() => {
    const loadPodcast = async () => {
      if (!podcastId) return
      try {
        const podcast = await adminPodcastsService.getPodcast(podcastId)
        setPodcastTitle(podcast.title)
      } catch (err) {
        logger.error('Failed to load podcast', 'PodcastEpisodesPage', err)
      }
    }
    loadPodcast()
  }, [podcastId])

  useEffect(() => {
    loadEpisodes()
  }, [loadEpisodes])

  const handleEdit = (item: PodcastEpisode) => {
    setEditingId(item.id)
    setEditData(item)
  }

  const handleSaveEdit = async () => {
    if (!editData.title) {
      setError(t('admin.content.validation.titleRequired', { defaultValue: 'Title is required' }))
      return
    }
    if (!editData.audio_url) {
      setError(t('admin.content.validation.audioUrlRequired', { defaultValue: 'Audio URL is required' }))
      return
    }
    try {
      if (editingId === 'new') {
        await adminPodcastEpisodesService.createEpisode(podcastId!, editData)
      } else {
        await adminPodcastEpisodesService.updateEpisode(podcastId!, editingId!, editData)
      }
      setEditingId(null)
      setEditData({})
      await loadEpisodes()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save episode'
      logger.error(msg, 'PodcastEpisodesPage', err)
      setError(msg)
    }
  }

  const handleDelete = useCallback((id: string) => {
    setDeleteConfirmId(id)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirmId) return
    try {
      setIsDeleting(true)
      await adminPodcastEpisodesService.deleteEpisode(podcastId!, deleteConfirmId)
      setItems((prevItems) => prevItems.filter((item) => item.id !== deleteConfirmId))
      setDeleteConfirmId(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete episode'
      logger.error(msg, 'PodcastEpisodesPage', err)
      setError(msg)
    } finally {
      setIsDeleting(false)
    }
  }, [deleteConfirmId, podcastId])

  const handleTranslate = async (episodeId: string) => {
    try {
      setTranslating(episodeId)
      await adminPodcastEpisodesService.triggerTranslation(podcastId!, episodeId)
      await loadEpisodes()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to queue translation'
      logger.error(msg, 'PodcastEpisodesPage', err)
      setError(msg)
    } finally {
      setTranslating(null)
    }
  }

  const handleTranslateAll = async () => {
    try {
      setBulkTranslating(true)
      const result = await adminPodcastsService.triggerBulkTranslation(podcastId!)
      setError(null)
      logger.info(`Queued ${result.episodes_queued} episodes for translation`, 'PodcastEpisodesPage')
      await loadEpisodes()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to queue bulk translation'
      logger.error(msg, 'PodcastEpisodesPage', err)
      setError(msg)
    } finally {
      setBulkTranslating(false)
    }
  }

  const columns = [
    {
      key: 'episode_number',
      label: t('admin.content.columns.episodeNumber', { defaultValue: 'Episode #' }),
      width: 80,
      render: (episodeNum: number | undefined) => <Text style={styles.cellText}>{episodeNum || '-'}</Text>,
    },
    {
      key: 'title',
      label: t('admin.content.columns.title', { defaultValue: 'Title' }),
      render: (title: string) => <Text style={styles.cellText}>{title}</Text>,
    },
    {
      key: 'duration',
      label: t('admin.content.columns.duration', { defaultValue: 'Duration' }),
      width: 100,
      render: (duration: string | undefined) => <Text style={styles.cellText}>{duration || '-'}</Text>,
    },
    {
      key: 'published_at',
      label: t('admin.content.columns.publishedDate', { defaultValue: 'Published' }),
      width: 120,
      render: (date: string | undefined) => (
        <Text style={styles.cellText}>{date ? new Date(date).toLocaleDateString() : '-'}</Text>
      ),
    },
    {
      key: 'translation_status',
      label: t('admin.content.columns.translationStatus', { defaultValue: 'Translation' }),
      width: 140,
      render: (status: TranslationStatus | undefined, item: PodcastEpisode) => (
        <View style={[styles.translationCell, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TranslationStatusBadge status={status} />
          <GlassButton
            variant="ghost"
            size="sm"
            onPress={() => handleTranslate(item.id)}
            disabled={translating === item.id || status === 'processing'}
            title={t('admin.podcasts.translate', { defaultValue: 'Translate' })}
            icon={translating === item.id ? <RefreshCw size={16} color={colors.primary} /> : <Languages size={16} color={colors.primary} />}
            style={styles.translateBtn}
            accessibilityLabel={t('admin.podcasts.translateEpisode', { defaultValue: 'Translate episode' })}
          />
        </View>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 180,
      render: (_: unknown, item: PodcastEpisode) => (
        <View style={[styles.actionsCell, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <GlassButton
            variant="ghost"
            size="sm"
            onPress={() => handleEdit(item)}
            icon={<Edit size={18} color="#a855f7" />}
            style={styles.actionButton}
            accessibilityLabel={t('admin.podcasts.editEpisode', { defaultValue: 'Edit episode' })}
          />
          <GlassButton
            variant="ghost"
            size="sm"
            onPress={() => handleDelete(item.id)}
            disabled={isDeleting}
            icon={<Trash2 size={18} color="#ef4444" />}
            style={[styles.actionButton, isDeleting && styles.disabledButton]}
            accessibilityLabel={t('admin.podcasts.deleteEpisode', { defaultValue: 'Delete episode' })}
          />
        </View>
      ),
    },
  ]

  const pageConfig = ADMIN_PAGE_CONFIG['podcast-episodes'];
  const IconComponent = pageConfig.icon;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <GlassButton
        variant="ghost"
        onPress={() => navigate('/admin/podcasts')}
        style={[styles.breadcrumb, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        icon={<ChevronLeft size={16} color={colors.primary} />}
        accessibilityLabel={t('admin.common.backToPodcasts', { defaultValue: 'Back to podcasts' })}
      >
        <Text style={styles.breadcrumbText}>{t('admin.common.back')} {t('admin.titles.podcasts')}</Text>
      </GlassButton>

      <GlassPageHeader
        title={podcastTitle}
        subtitle={t('admin.podcastEpisodes.subtitle', { defaultValue: 'Manage podcast episodes and metadata' })}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        badge={pagination.total}
        isRTL={isRTL}
        action={
          <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <GlassButton
              variant="secondary"
              onPress={handleTranslateAll}
              disabled={bulkTranslating}
              icon={<Languages size={18} color="white" />}
              accessibilityLabel={t('admin.podcasts.translateAllEpisodes', { defaultValue: 'Translate all episodes' })}
            >
              {bulkTranslating ? t('common.loading') : t('admin.podcasts.translateAll', 'Translate All')}
            </GlassButton>
            <GlassButton
              variant="primary"
              onPress={() => {
                setEditingId('new')
                setEditData({ episode_number: items.length + 1 })
              }}
              icon={<Plus size={18} color="white" />}
              accessibilityLabel={t('admin.actions.newEpisode', { defaultValue: 'Create new episode' })}
            >
              {t('admin.actions.new', { defaultValue: 'New' })}
            </GlassButton>
          </View>
        }
      />

      <GlassErrorBanner
        message={error}
        onDismiss={() => setError(null)}
        marginBottom={spacing.lg}
      />

      <View style={styles.filterRow}>
        <GlassSelect
          value={statusFilter}
          onChange={(value) => {
            setStatusFilter(value)
            setPagination((prev) => ({ ...prev, page: 1 }))
          }}
          options={TRANSLATION_STATUS_OPTIONS}
          label={t('admin.podcasts.filterByStatus', 'Filter by Status')}
          containerStyle={styles.filterSelect}
        />
      </View>

      <GlassModal
        visible={editingId !== null}
        title={editingId === 'new' ? t('admin.podcasts.newEpisode', 'New Episode') : t('admin.podcasts.editEpisode', 'Edit Episode')}
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
            label={t('admin.podcasts.episodes.form.title', 'Episode title')}
            containerStyle={styles.input}
            placeholder="Episode title"
            value={editData.title || ''}
            onChangeText={(value) => setEditData({ ...editData, title: value })}
          />
          <GlassInput
            label={t('admin.podcasts.episodes.form.description', 'Description')}
            containerStyle={styles.input}
            placeholder="Description"
            value={editData.description || ''}
            onChangeText={(value) => setEditData({ ...editData, description: value })}
            multiline
          />
          <GlassInput
            label={t('admin.podcasts.episodes.form.episodeNumber', 'Episode number')}
            containerStyle={styles.input}
            placeholder="Episode number"
            value={String(editData.episode_number || '')}
            onChangeText={(value) => setEditData({ ...editData, episode_number: parseInt(value) || 0 })}
            keyboardType="number-pad"
          />
          <GlassInput
            label={t('admin.podcasts.episodes.form.duration', 'Duration')}
            containerStyle={styles.input}
            placeholder="Duration (e.g., 45:30)"
            value={editData.duration || ''}
            onChangeText={(value) => setEditData({ ...editData, duration: value })}
          />
          <GlassInput
            label={t('admin.podcasts.episodes.form.audioUrl', 'Audio URL (required)')}
            containerStyle={styles.input}
            placeholder="Audio URL (required)"
            value={editData.audio_url || ''}
            onChangeText={(value) => setEditData({ ...editData, audio_url: value })}
          />
          <GlassInput
            label={t('admin.podcasts.episodes.form.publishedDate', 'Published Date (YYYY-MM-DD)')}
            containerStyle={styles.input}
            placeholder="Published Date (YYYY-MM-DD)"
            value={editData.published_at ? editData.published_at.split('T')[0] : ''}
            onChangeText={(value) => setEditData({ ...editData, published_at: value ? `${value}T00:00:00Z` : undefined })}
          />
        </ScrollView>
      </GlassModal>

      <GlassModal
        visible={deleteConfirmId !== null}
        type="error"
        title={t('admin.common.deleteConfirmTitle', { defaultValue: 'Delete Episode' })}
        message={t('admin.common.deleteEpisodeMessage', { defaultValue: 'Are you sure you want to delete this episode? This action cannot be undone.' })}
        onClose={() => setDeleteConfirmId(null)}
        dismissable={!isDeleting}
        loading={isDeleting}
        buttons={[
          {
            text: t('admin.common.cancel', { defaultValue: 'Cancel' }),
            style: 'cancel',
            onPress: () => setDeleteConfirmId(null),
          },
          {
            text: t('common.delete', { defaultValue: 'Delete' }),
            style: 'destructive',
            onPress: handleConfirmDelete,
          },
        ]}
      />

      <GlassTable
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        emptyMessage={t('admin.podcasts.noEpisodes', { defaultValue: 'No episodes found' })}
        isRTL={isRTL}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  breadcrumb: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  breadcrumbText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  headerActions: { gap: spacing.sm, alignItems: 'center' },
  filterRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  filterSelect: { width: 200 },
  modalContent: {
    maxHeight: 500,
  },
  input: { marginBottom: spacing.md },
  cellText: { color: colors.text, fontSize: 14 },
  translationCell: { alignItems: 'center', gap: spacing.xs },
  translateBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: borderRadius.md,
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
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  badgeText: { fontSize: 12, fontWeight: '600' },
})
