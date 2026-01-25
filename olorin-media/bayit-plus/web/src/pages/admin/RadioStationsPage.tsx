import { useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, X, AlertCircle } from 'lucide-react'
import { GlassInput, GlassCheckbox } from '@bayit/shared/ui'
import { GlassTable, GlassTableCell } from '@bayit/shared/ui/web'
import { adminContentService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassButton } from '@bayit/shared/ui'
import { useDirection } from '@/hooks/useDirection'
import { useNotifications } from '@olorin/glass-ui/hooks'
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
  const notifications = useNotifications()
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
      const msg = err instanceof Error ? err.message : t('admin.radioStations.errors.loadFailed', 'Failed to load radio stations')
      logger.error(msg, 'RadioStationsPage', err)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.pageSize, t])

  useEffect(() => {
    loadStations()
  }, [loadStations])

  const handleEdit = (item: RadioStation) => {
    setEditingId(item.id)
    setEditData(item)
  }

  const handleSaveEdit = async () => {
    if (!editData.name) {
      setError(t('admin.content.validation.nameRequired', 'Name is required'))
      return
    }
    if (!editData.stream_url) {
      setError(t('admin.content.validation.streamUrlRequired', 'Stream URL is required'))
      return
    }
    try {
      if (editingId === 'new') {
        await adminContentService.createRadioStation(editData)
      } else {
        await adminContentService.updateRadioStation(editingId!, editData)
      }
      setEditingId(null)
      setEditData({})
      await loadStations()
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('admin.radioStations.errors.saveFailed', 'Failed to save radio station')
      logger.error(msg, 'RadioStationsPage', err)
      setError(msg)
    }
  }

  const handleDelete = (id: string) => {
    notifications.show({
      level: 'warning',
      message: t('admin.content.confirmDelete', 'Delete this radio station?'),
      dismissable: true,
      action: {
        label: t('common.delete', 'Delete'),
        type: 'action',
        onPress: async () => {
          try {
            setDeleting(id)
            await adminContentService.deleteRadioStation(id)
            setItems(items.filter((item) => item.id !== id))
          } catch (err) {
            const msg = err instanceof Error ? err.message : t('admin.radioStations.errors.deleteFailed', 'Failed to delete radio station')
            logger.error(msg, 'RadioStationsPage', err)
            setError(msg)
          } finally {
            setDeleting(null)
          }
        },
      },
    })
  }

  const columns = [
    {
      key: 'logo',
      label: t('admin.content.columns.logo', 'Logo'),
      width: 80,
      render: (logo: string | undefined) => (
        <View style={styles.logoCell}>
          {logo ? (
            <Image source={{ uri: logo }} style={styles.logo} resizeMode="cover" />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>📻</Text>
            </View>
          )}
        </View>
      ),
    },
    {
      key: 'name',
      label: t('admin.content.columns.name', 'Name'),
      render: (name: string) => <Text style={styles.cellText}>{name}</Text>,
    },
    {
      key: 'genre',
      label: t('admin.content.columns.genre', 'Genre'),
      render: (genre: string | undefined) => <Text style={styles.cellText}>{genre || '-'}</Text>,
    },
    {
      key: 'stream_url',
      label: t('admin.content.columns.streamUrl', 'Stream URL'),
      render: (url: string) => (
        <Text style={[styles.cellText, styles.urlText]} numberOfLines={1}>
          {url}
        </Text>
      ),
    },
    {
      key: 'is_active',
      label: t('admin.content.columns.status', 'Status'),
      render: (isActive: boolean) => (
        <View style={[styles.badge, { backgroundColor: isActive ? '#10b98120' : '#6b728020' }]}>
          <Text style={[styles.badgeText, { color: isActive ? '#10b981' : '#6b7280' }]}>
            {isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
          </Text>
        </View>
      ),
    },
    {
      key: 'order',
      label: t('admin.content.columns.order', 'Order'),
      width: 80,
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
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg }}>
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.titles.radioStations', 'Radio Stations')}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('admin.radioStations.subtitle', 'Manage radio stations')}
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
          <Text style={styles.addButtonText}>{t('admin.actions.new', 'New')}</Text>
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
            {editingId === 'new'
              ? t('admin.radioStations.form.titleNew', 'New Radio Station')
              : t('admin.radioStations.form.titleEdit', 'Edit Radio Station')
            }
          </Text>
          <GlassInput
            label={t('admin.radioStations.form.name', 'Station name')}
            containerStyle={styles.input}
            placeholder={t('admin.radioStations.form.namePlaceholder', 'Station name')}
            value={editData.name || ''}
            onChangeText={(value) => setEditData({ ...editData, name: value })}
          />
          <GlassInput
            label={t('admin.content.editor.fields.stationLogo', 'Station Logo')}
            containerStyle={styles.input}
            placeholder={t('admin.content.editor.fields.logoPlaceholder', 'Logo URL')}
            value={editData.logo || ''}
            onChangeText={(value) => setEditData({ ...editData, logo: value })}
          />
          <GlassInput
            label={t('admin.radioStations.form.genre', 'Genre')}
            containerStyle={styles.input}
            placeholder={t('admin.radioStations.form.genrePlaceholder', 'Genre (e.g., Electronic, News)')}
            value={editData.genre || ''}
            onChangeText={(value) => setEditData({ ...editData, genre: value })}
          />
          <GlassInput
            label={t('admin.radioStations.form.streamUrl', 'Stream URL')}
            containerStyle={styles.input}
            placeholder={t('admin.radioStations.form.streamUrlPlaceholder', 'Stream URL (HLS/Audio)')}
            value={editData.stream_url || ''}
            onChangeText={(value) => setEditData({ ...editData, stream_url: value })}
          />
          <GlassInput
            label={t('admin.radioStations.form.currentShow', 'Current Show (optional)')}
            containerStyle={styles.input}
            placeholder={t('admin.radioStations.form.currentShowPlaceholder', 'Current Show (optional)')}
            value={editData.current_show || ''}
            onChangeText={(value) => setEditData({ ...editData, current_show: value })}
          />
          <GlassInput
            label={t('admin.radioStations.form.currentSong', 'Current Song (optional)')}
            containerStyle={styles.input}
            placeholder={t('admin.radioStations.form.currentSongPlaceholder', 'Current Song (optional)')}
            value={editData.current_song || ''}
            onChangeText={(value) => setEditData({ ...editData, current_song: value })}
          />
          <GlassInput
            label={t('admin.radioStations.form.order', 'Order')}
            containerStyle={styles.input}
            placeholder={t('admin.radioStations.form.orderPlaceholder', 'Order')}
            value={String(editData.order || '')}
            onChangeText={(value) => setEditData({ ...editData, order: parseInt(value) || 0 })}
            keyboardType="number-pad"
          />
          <View style={styles.checkboxRow}>
            <GlassCheckbox
              checked={editData.is_active || false}
              onCheckedChange={(checked) => setEditData({ ...editData, is_active: checked })}
              label={t('admin.common.active', 'Active')}
            />
          </View>
          <View style={styles.formActions}>
            <Pressable onPress={() => setEditingId(null)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>{t('common.cancel', 'Cancel')}</Text>
            </Pressable>
            <Pressable onPress={handleSaveEdit} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>{t('common.save', 'Save')}</Text>
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary.DEFAULT,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#ef444420',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    objectFit: 'cover',
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    fontSize: 24,
  },
  cellText: {
    fontSize: 14,
    color: colors.text,
  },
  urlText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsCell: {
    display: 'flex',
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editForm: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(12px)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.md,
  },
  checkboxRow: {
    marginBottom: spacing.md,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'flex-end',
    marginTop: spacing.md,
  },
  cancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.DEFAULT,
  },
  saveBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
})

