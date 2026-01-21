import { useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, X, AlertCircle, ChevronLeft } from 'lucide-react'
import { GlassInput } from '@bayit/shared/ui'
import { GlassTable, GlassTableCell } from '@bayit/shared/ui/web'
import { adminContentService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { useDirection } from '@/hooks/useDirection'
import { useModal } from '@/contexts/ModalContext'
import logger from '@/utils/logger'
import type { PodcastEpisode, PaginatedResponse } from '@/types/content'

interface Pagination {
  page: number
  pageSize: number
  total: number
}

interface EditingEpisode extends Partial<PodcastEpisode> {
  id?: string
}

export default function PodcastEpisodesPage() {
  const { podcastId } = useParams<{ podcastId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isRTL, textAlign, flexDirection } = useDirection()
  const { showConfirm } = useModal()
  const [podcastTitle, setPodcastTitle] = useState('')
  const [items, setItems] = useState<PodcastEpisode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EditingEpisode>({})
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadEpisodes = useCallback(async () => {
    if (!podcastId) return
    setIsLoading(true)
    setError(null)
    try {
      const response: PaginatedResponse<PodcastEpisode> = await adminContentService.getPodcastEpisodes(
        podcastId,
        {
          page: pagination.page,
          page_size: pagination.pageSize,
        }
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
  }, [podcastId, pagination.page, pagination.pageSize])

  useEffect(() => {
    // Load podcast title
    const loadPodcast = async () => {
      if (!podcastId) return
      try {
        const podcast = await adminContentService.getPodcastItem(podcastId)
        setPodcastTitle(podcast.title)
      } catch (err) {
        logger.error('Failed to load podcast', 'PodcastEpisodesPage', err)
      }
    }
    loadPodcast()
    loadEpisodes()
  }, [podcastId, loadEpisodes])

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
      await adminContentService.updatePodcastEpisode(podcastId!, editingId!, editData)
      setEditingId(null)
      setEditData({})
      await loadEpisodes()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update episode'
      logger.error(msg, 'PodcastEpisodesPage', err)
      setError(msg)
    }
  }

  const handleDelete = (id: string) => {
    showConfirm(
      t('admin.content.confirmDelete'),
      async () => {
        try {
          setDeleting(id)
          await adminContentService.deletePodcastEpisode(podcastId!, id)
          setItems(items.filter((item) => item.id !== id))
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to delete episode'
          logger.error(msg, 'PodcastEpisodesPage', err)
          setError(msg)
        } finally {
          setDeleting(null)
        }
      },
      { destructive: true, confirmText: t('common.delete', 'Delete') }
    )
  }

  const columns = [
    {
      key: 'episode_number',
      label: t('admin.content.columns.episodeNumber', { defaultValue: 'Episode #' }),
      render: (episodeNum: number | undefined) => <Text className="text-sm text-white">{episodeNum || '-'}</Text>,
    },
    {
      key: 'title',
      label: t('admin.content.columns.title', { defaultValue: 'Title' }),
      render: (title: string) => <Text className="text-sm text-white">{title}</Text>,
    },
    {
      key: 'description',
      label: t('admin.content.columns.description', { defaultValue: 'Description' }),
      render: (desc: string | undefined) => (
        <Text style={[styles.cellText, styles.descText]} numberOfLines={2}>
          {desc || '-'}
        </Text>
      ),
    },
    {
      key: 'duration',
      label: t('admin.content.columns.duration', { defaultValue: 'Duration' }),
      render: (duration: string | undefined) => <Text className="text-sm text-white">{duration || '-'}</Text>,
    },
    {
      key: 'published_at',
      label: t('admin.content.columns.publishedDate', { defaultValue: 'Published' }),
      render: (date: string | undefined) => (
        <Text className="text-sm text-white">{date ? new Date(date).toLocaleDateString() : '-'}</Text>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 100,
      render: (_: any, item: PodcastEpisode) => (
        <View style={[styles.actionsCell, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable
            onPress={() => handleEdit(item)}
            style={[styles.actionButton, { backgroundColor: '#a855f780' }]}
          >
            <Edit size={14} color="#a855f7" />
          </Pressable>
          <Pressable
            onPress={() => handleDelete(item.id)}
            disabled={deleting === item.id}
            style={[styles.actionButton, { backgroundColor: '#ef444480', opacity: deleting === item.id ? 0.5 : 1 }]}
          >
            <Trash2 size={14} color="#ef4444" />
          </Pressable>
        </View>
      ),
    },
  ]

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg }}>
      <Pressable
        onPress={() => navigate('/admin/podcasts')}
        style={[styles.breadcrumb, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        <ChevronLeft size={16} color={colors.primary} />
        <Text style={styles.breadcrumbText}>{t('admin.common.back')} {t('admin.titles.podcasts')}</Text>
      </Pressable>

      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{podcastTitle}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('admin.podcasts.episodesSubtitle', { defaultValue: 'Manage episodes' })}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            setEditingId('new')
            setEditData({ episode_number: items.length + 1 })
          }}
          style={styles.addButton}
        >
          <Plus size={18} color={colors.text} />
          <Text style={styles.addButtonText}>{t('admin.actions.new', { defaultValue: 'New' })}</Text>
        </Pressable>
      </View>

      {error && (
        <View style={[styles.errorContainer, { marginBottom: spacing.lg }]}>
          <AlertCircle size={18} color="#ef4444" />
          <Text className="flex-1 text-red-500 text-sm">{error}</Text>
          <Pressable onPress={() => setError(null)}>
            <X size={18} color="#ef4444" />
          </Pressable>
        </View>
      )}

      {editingId && (
        <View style={styles.editForm}>
          <Text style={styles.formTitle}>
            {editingId === 'new' ? 'New Episode' : 'Edit Episode'}
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
            label={t('admin.podcasts.episodes.form.seasonNumber', 'Season number (optional)')}
            containerStyle={styles.input}
            placeholder="Season number (optional)"
            value={String(editData.season_number || '')}
            onChangeText={(value) => setEditData({ ...editData, season_number: parseInt(value) || undefined })}
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
            <Pressable onPress={() => setEditingId(null)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>{t('admin.common.cancel')}</Text>
            </Pressable>
            <Pressable onPress={handleSaveEdit} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{t('admin.common.save')}</Text>
            </Pressable>
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

