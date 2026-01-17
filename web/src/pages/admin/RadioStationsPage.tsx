import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, X, AlertCircle } from 'lucide-react'
import { GlassInput } from '@bayit/shared/ui'
import { GlassTable, GlassTableCell } from '@bayit/shared/ui/web'
import { adminContentService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassButton } from '@bayit/shared/ui'
import { useDirection } from '@/hooks/useDirection'
import { useModal } from '@/contexts/ModalContext'
import logger from '@/utils/logger'
import type { RadioStation, PaginatedResponse } from '@/types/content'

interface Pagination {
  page: number
  pageSize: number
  total: number
}

interface EditingStation extends Partial<RadioStation> {
  id?: string
}

export default function RadioStationsPage() {
  const { t } = useTranslation()
  const { isRTL, textAlign, flexDirection } = useDirection()
  const { showConfirm } = useModal()
  const [items, setItems] = useState<RadioStation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EditingStation>({})
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadStations = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response: PaginatedResponse<RadioStation> = await adminContentService.getRadioStations({
        page: pagination.page,
        page_size: pagination.pageSize,
      })
      setItems(response.items || [])
      setPagination((prev) => ({ ...prev, total: response.total || 0 }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load radio stations'
      logger.error(msg, 'RadioStationsPage', err)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.pageSize])

  useEffect(() => {
    loadStations()
  }, [loadStations])

  const handleEdit = (item: RadioStation) => {
    setEditingId(item.id)
    setEditData(item)
  }

  const handleSaveEdit = async () => {
    if (!editData.name) {
      setError(t('admin.content.validation.nameRequired', { defaultValue: 'Name is required' }))
      return
    }
    if (!editData.stream_url) {
      setError(t('admin.content.validation.streamUrlRequired', { defaultValue: 'Stream URL is required' }))
      return
    }
    try {
      await adminContentService.updateRadioStation(editingId!, editData)
      setEditingId(null)
      setEditData({})
      await loadStations()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update radio station'
      logger.error(msg, 'RadioStationsPage', err)
      setError(msg)
    }
  }

  const handleDelete = (id: string) => {
    showConfirm(
      t('admin.content.confirmDelete'),
      async () => {
        try {
          setDeleting(id)
          await adminContentService.deleteRadioStation(id)
          setItems(items.filter((item) => item.id !== id))
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to delete radio station'
          logger.error(msg, 'RadioStationsPage', err)
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
      key: 'name',
      label: t('admin.content.columns.name', { defaultValue: 'Name' }),
      render: (name: string) => <Text style={styles.cellText}>{name}</Text>,
    },
    {
      key: 'genre',
      label: t('admin.content.columns.genre', { defaultValue: 'Genre' }),
      render: (genre: string | undefined) => <Text style={styles.cellText}>{genre || '-'}</Text>,
    },
    {
      key: 'stream_url',
      label: t('admin.content.columns.streamUrl', { defaultValue: 'Stream URL' }),
      render: (url: string) => (
        <Text style={[styles.cellText, styles.urlText]} numberOfLines={1}>
          {url}
        </Text>
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
      key: 'order',
      label: t('admin.content.columns.order', { defaultValue: 'Order' }),
      render: (order: number) => <Text style={styles.cellText}>{order}</Text>,
    },
    {
      key: 'actions',
      label: '',
      width: 100,
      render: (_: any, item: RadioStation) => (
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.titles.radioStations', { defaultValue: 'Radio Stations' })}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('admin.radioStations.subtitle', { defaultValue: 'Manage radio stations' })}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            setEditingId('new')
            setEditData({ is_active: true, order: items.length + 1 })
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
            {editingId === 'new' ? 'New Radio Station' : 'Edit Radio Station'}
          </Text>
          <GlassInput
            label={t('admin.radioStations.form.name', 'Station name')}
            containerStyle={styles.input}
            placeholder="Station name"
            value={editData.name || ''}
            onChangeText={(value) => setEditData({ ...editData, name: value })}
          />
          <GlassInput
            label={t('admin.radioStations.form.genre', 'Genre')}
            containerStyle={styles.input}
            placeholder="Genre (e.g., Electronic, News)"
            value={editData.genre || ''}
            onChangeText={(value) => setEditData({ ...editData, genre: value })}
          />
          <GlassInput
            label={t('admin.radioStations.form.streamUrl', 'Stream URL')}
            containerStyle={styles.input}
            placeholder="Stream URL (HLS/Audio)"
            value={editData.stream_url || ''}
            onChangeText={(value) => setEditData({ ...editData, stream_url: value })}
          />
          <GlassInput
            label={t('admin.radioStations.form.currentShow', 'Current Show (optional)')}
            containerStyle={styles.input}
            placeholder="Current Show (optional)"
            value={editData.current_show || ''}
            onChangeText={(value) => setEditData({ ...editData, current_show: value })}
          />
          <GlassInput
            label={t('admin.radioStations.form.currentSong', 'Current Song (optional)')}
            containerStyle={styles.input}
            placeholder="Current Song (optional)"
            value={editData.current_song || ''}
            onChangeText={(value) => setEditData({ ...editData, current_song: value })}
          />
          <GlassInput
            label={t('admin.radioStations.form.order', 'Order')}
            containerStyle={styles.input}
            placeholder="Order"
            value={String(editData.order || '')}
            onChangeText={(value) => setEditData({ ...editData, order: parseInt(value) || 0 })}
            keyboardType="number-pad"
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
        emptyMessage={t('admin.radioStations.emptyMessage', { defaultValue: 'No radio stations found' })}
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
  cellText: { fontSize: 14, color: colors.text },
  urlText: { fontSize: 12, color: colors.textMuted },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '500' },
  actionsCell: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  actionButton: { padding: spacing.sm, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
})
