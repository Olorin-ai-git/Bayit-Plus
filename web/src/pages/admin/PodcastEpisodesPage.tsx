import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, X, AlertCircle, ChevronLeft } from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import { contentService } from '@/services/adminApi'
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
      const response: PaginatedResponse<PodcastEpisode> = await contentService.getPodcastEpisodes(
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
        const podcast = await contentService.getPodcastItem(podcastId)
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
      await contentService.updatePodcastEpisode(podcastId!, editingId!, editData)
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
          await contentService.deletePodcastEpisode(podcastId!, id)
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
      render: (episodeNum: number | undefined) => <Text style={styles.cellText}>{episodeNum || '-'}</Text>,
    },
    {
      key: 'title',
      label: t('admin.content.columns.title', { defaultValue: 'Title' }),
      render: (title: string) => <Text style={styles.cellText}>{title}</Text>,
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
      render: (duration: string | undefined) => <Text style={styles.cellText}>{duration || '-'}</Text>,
    },
    {
      key: 'published_at',
      label: t('admin.content.columns.publishedDate', { defaultValue: 'Published' }),
      render: (date: string | undefined) => (
        <Text style={styles.cellText}>{date ? new Date(date).toLocaleDateString() : '-'}</Text>
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
            style={[styles.actionButton, { backgroundColor: '#3b82f680' }]}
          >
            <Edit size={14} color="#3b82f6" />
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Pressable
        onPress={() => navigate('/admin/podcasts')}
        style={[styles.breadcrumb, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        <ChevronLeft size={16} color={colors.primary} />
        <Text style={styles.breadcrumbText}>Back to Podcasts</Text>
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
          <Text style={styles.errorText}>{error}</Text>
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
          <TextInput
            style={styles.input}
            placeholder="Episode title"
            placeholderTextColor={colors.textMuted}
            value={editData.title || ''}
            onChangeText={(value) => setEditData({ ...editData, title: value })}
          />
          <TextInput
            style={styles.input}
            placeholder="Description"
            placeholderTextColor={colors.textMuted}
            value={editData.description || ''}
            onChangeText={(value) => setEditData({ ...editData, description: value })}
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Episode number"
            placeholderTextColor={colors.textMuted}
            value={String(editData.episode_number || '')}
            onChangeText={(value) => setEditData({ ...editData, episode_number: parseInt(value) || 0 })}
            keyboardType="number-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Season number (optional)"
            placeholderTextColor={colors.textMuted}
            value={String(editData.season_number || '')}
            onChangeText={(value) => setEditData({ ...editData, season_number: parseInt(value) || undefined })}
            keyboardType="number-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Duration (e.g., 45:30)"
            placeholderTextColor={colors.textMuted}
            value={editData.duration || ''}
            onChangeText={(value) => setEditData({ ...editData, duration: value })}
          />
          <TextInput
            style={styles.input}
            placeholder="Audio URL (required)"
            placeholderTextColor={colors.textMuted}
            value={editData.audio_url || ''}
            onChangeText={(value) => setEditData({ ...editData, audio_url: value })}
          />
          <TextInput
            style={styles.input}
            placeholder="Published Date (YYYY-MM-DD)"
            placeholderTextColor={colors.textMuted}
            value={editData.published_at ? editData.published_at.split('T')[0] : ''}
            onChangeText={(value) => setEditData({ ...editData, published_at: value ? `${value}T00:00:00Z` : undefined })}
          />
          <View style={styles.formActions}>
            <Pressable onPress={() => setEditingId(null)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleSaveEdit} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Save</Text>
            </Pressable>
          </View>
        </View>
      )}

      <DataTable
        columns={isRTL ? [...columns].reverse() : columns}
        data={items}
        loading={isLoading}
        pagination={pagination}
        onPageChange={(page) => setPagination((prev) => ({ ...prev, page }))}
        emptyMessage={t('admin.podcasts.noEpisodes', { defaultValue: 'No episodes found' })}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  breadcrumbText: { color: colors.primary, fontSize: 14, fontWeight: '500' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.md },
  addButtonText: { color: colors.text, fontWeight: '500', fontSize: 14 },
  errorContainer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: '#ef444420', borderColor: '#ef444440', borderWidth: 1, borderRadius: borderRadius.md },
  errorText: { flex: 1, color: '#ef4444', fontSize: 14 },
  editForm: { backgroundColor: colors.backgroundLighter, padding: spacing.lg, borderRadius: borderRadius.lg, marginBottom: spacing.lg },
  formTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  input: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, fontSize: 14, marginBottom: spacing.md },
  formActions: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { color: colors.text, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: colors.text, fontWeight: '600' },
  cellText: { fontSize: 14, color: colors.text },
  descText: { fontSize: 12, color: colors.textMuted },
  actionsCell: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  actionButton: { padding: spacing.sm, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
})
