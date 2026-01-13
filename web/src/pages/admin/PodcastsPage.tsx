import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, X, AlertCircle, Music } from 'lucide-react'
import { GlassTable, GlassTableCell } from '@bayit/shared/ui'
import { contentService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassButton } from '@bayit/shared/ui'
import { useDirection } from '@/hooks/useDirection'
import { useModal } from '@/contexts/ModalContext'
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
  const { showConfirm } = useModal()
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
      const response: PaginatedResponse<Podcast> = await contentService.getPodcasts({
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
      await contentService.updatePodcast(editingId!, editData)
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
    showConfirm(
      t('admin.content.confirmDelete'),
      async () => {
        try {
          setDeleting(id)
          await contentService.deletePodcast(id)
          setItems(items.filter((item) => item.id !== id))
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to delete podcast'
          logger.error(msg, 'PodcastsPage', err)
          setError(msg)
        } finally {
          setDeleting(null)
        }
      },
      { destructive: true, confirmText: t('common.delete', 'Delete') }
    )
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

        return <Text style={styles.cellText}>{localizedCategory || '-'}</Text>
      },
    },
    {
      key: 'episode_count',
      label: t('admin.content.columns.episodes', { defaultValue: 'Episodes' }),
      render: (count: number | undefined) => <Text style={styles.cellText}>{count || 0}</Text>,
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
            <Pressable style={[styles.actionButton, { backgroundColor: '#8b5cf680' }]}>
              <Music size={14} color="#8b5cf6" />
            </Pressable>
          </Link>
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
  ], [t, i18n.language, isRTL, deleting, handleEdit, handleDelete])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.titles.podcasts', { defaultValue: 'Podcasts' })}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('admin.podcasts.subtitle', { defaultValue: 'Manage podcasts and episodes' })}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            setEditingId('new')
            setEditData({ is_active: true })
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
            {editingId === 'new' ? 'New Podcast' : 'Edit Podcast'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Podcast title"
            placeholderTextColor={colors.textMuted}
            value={editData.title || ''}
            onChangeText={(value) => setEditData({ ...editData, title: value })}
          />
          <TextInput
            style={styles.input}
            placeholder="Author"
            placeholderTextColor={colors.textMuted}
            value={editData.author || ''}
            onChangeText={(value) => setEditData({ ...editData, author: value })}
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
            placeholder="Category"
            placeholderTextColor={colors.textMuted}
            value={editData.category || ''}
            onChangeText={(value) => setEditData({ ...editData, category: value })}
          />
          <TextInput
            style={styles.input}
            placeholder="RSS Feed URL"
            placeholderTextColor={colors.textMuted}
            value={editData.rss_feed || ''}
            onChangeText={(value) => setEditData({ ...editData, rss_feed: value })}
          />
          <TextInput
            style={styles.input}
            placeholder="Website URL (optional)"
            placeholderTextColor={colors.textMuted}
            value={editData.website || ''}
            onChangeText={(value) => setEditData({ ...editData, website: value })}
          />
          <View style={styles.checkboxRow}>
            <input
              type="checkbox"
              id="is_active"
              checked={editData.is_active || false}
              onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
              style={styles.checkbox}
            />
            <Text style={styles.checkboxLabel}>{t('admin.common.active')}</Text>
          </View>
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
        emptyMessage={t('admin.podcasts.emptyMessage', { defaultValue: 'No podcasts found' })}
        isRTL={isRTL}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: spacing.lg },
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
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  checkbox: { width: 18, height: 18 },
  checkboxLabel: { color: colors.text, fontSize: 14 },
  formActions: { flexDirection: 'row', gap: spacing.md },
  cancelBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { color: colors.text, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: colors.text, fontWeight: '600' },
  itemTitle: { fontSize: 14, fontWeight: '500', color: colors.text },
  itemSubtext: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
  cellText: { fontSize: 14, color: colors.text },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '500' },
  actionsCell: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  actionButton: { padding: spacing.sm, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
})
