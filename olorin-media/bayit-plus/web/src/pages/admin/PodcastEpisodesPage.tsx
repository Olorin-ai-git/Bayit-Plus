import { useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, ChevronLeft, Languages, RefreshCw } from 'lucide-react'
import { GlassInput, GlassSelect, GlassButton, GlassPageHeader, GlassErrorBanner } from '@bayit/shared/ui'
import { GlassTable } from '@bayit/shared/ui/web'
import { adminPodcastsService, adminPodcastEpisodesService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import { useNotifications } from '@olorin/glass-ui/hooks'
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

const TRANSLATION_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
]

function TranslationStatusBadge({ status }: { status?: TranslationStatus }) {
  const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', label: 'Pending' },
    processing: { bg: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6', label: 'Processing' },
    completed: { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', label: 'Completed' },
    failed: { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', label: 'Failed' },
  }
  const config = statusConfig[status || 'pending'] || statusConfig.pending
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  )
}

export default function PodcastEpisodesPage() {
  const { podcastId } = useParams<{ podcastId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isRTL, textAlign, flexDirection } = useDirection()
  const notifications = useNotifications()
  const [podcastTitle, setPodcastTitle] = useState('')
  const [items, setItems] = useState<PodcastEpisode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EditingEpisode>({})
  const [deleting, setDeleting] = useState<string | null>(null)
  const [translating, setTranslating] = useState<string | null>(null)
  const [bulkTranslating, setBulkTranslating] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')

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
            await adminPodcastEpisodesService.deleteEpisode(podcastId!, id)
            setItems(items.filter((item) => item.id !== id))
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to delete episode'
            logger.error(msg, 'PodcastEpisodesPage', err)
            setError(msg)
          } finally {
            setDeleting(null)
          }
        },
      },
    })
  }

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
      width: 100,
      render: (_: unknown, item: PodcastEpisode) => (
        <View style={[styles.actionsCell, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <GlassButton
            variant="ghost"
            size="sm"
            onPress={() => handleEdit(item)}
            icon={<Edit size={16} color="#a855f7" />}
            style={styles.actionButton}
            accessibilityLabel={t('admin.podcasts.editEpisode', { defaultValue: 'Edit episode' })}
          />
          <GlassButton
            variant="ghost"
            size="sm"
            onPress={() => handleDelete(item.id)}
            disabled={deleting === item.id}
            icon={<Trash2 size={16} color="#ef4444" />}
            style={styles.actionButton}
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
        subtitle={t('admin.podcastEpisodes.subtitle')}
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

      {editingId && (
        <View style={styles.editForm}>
          <Text style={styles.formTitle}>
            {editingId === 'new' ? t('admin.podcasts.newEpisode', 'New Episode') : t('admin.podcasts.editEpisode', 'Edit Episode')}
          </Text>
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
              accessibilityLabel={t('admin.common.saveEpisode', { defaultValue: 'Save episode' })}
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
  breadcrumbText: { color: colors.primary.DEFAULT, fontSize: 14 },
  header: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  headerActions: { gap: spacing.sm, alignItems: 'center' },
  pageTitle: { color: colors.text, fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: spacing.xs },
  btnDisabled: { opacity: 0.5 },
  filterRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  filterSelect: { width: 200 },
  editForm: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  formTitle: { color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: spacing.md },
  input: { marginBottom: spacing.md },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
  cellText: { color: colors.text, fontSize: 14 },
  descText: { color: colors.textSecondary },
  translationCell: { alignItems: 'center', gap: spacing.xs },
  translateBtn: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: borderRadius.md,
  },
  actionsCell: { gap: spacing.xs },
  actionButton: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: borderRadius.md,
  },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  badgeText: { fontSize: 12, fontWeight: '600' },
})
