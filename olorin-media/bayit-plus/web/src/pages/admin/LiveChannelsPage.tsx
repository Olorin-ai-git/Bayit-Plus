import { useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, X, AlertCircle, Globe, ChevronDown, ChevronUp } from 'lucide-react'
import { adminContentService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassButton, GlassInput, GlassView, GlassToggle, GlassSelect, GlassPageHeader } from '@bayit/shared/ui'
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants'
import { GlassTable, GlassTableCell } from '@bayit/shared/ui/web'
import { useDirection } from '@/hooks/useDirection'
import { useNotifications } from '@olorin/glass-ui/hooks'
import logger from '@/utils/logger'
import type { LiveChannel, PaginatedResponse } from '@/types/content'

interface Pagination {
  page: number
  pageSize: number
  total: number
}

interface EditingChannel extends Partial<LiveChannel> {
  id?: string
}

// Supported languages for live translation
const SUPPORTED_LANGUAGES = [
  { value: 'he', label: '🇮🇱 Hebrew (עברית)' },
  { value: 'en', label: '🇺🇸 English' },
  { value: 'ar', label: '🇸🇦 Arabic (العربية)' },
  { value: 'es', label: '🇪🇸 Spanish (Español)' },
  { value: 'ru', label: '🇷🇺 Russian (Русский)' },
  { value: 'fr', label: '🇫🇷 French (Français)' },
  { value: 'de', label: '🇩🇪 German (Deutsch)' },
  { value: 'it', label: '🇮🇹 Italian (Italiano)' },
  { value: 'pt', label: '🇵🇹 Portuguese (Português)' },
  { value: 'yi', label: '🕍 Yiddish (ייִדיש)' },
]

export default function LiveChannelsPage() {
  const { t } = useTranslation()
  const { isRTL, textAlign, flexDirection } = useDirection()
  const notifications = useNotifications()
  const [items, setItems] = useState<LiveChannel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<EditingChannel>({})
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showSubtitleSettings, setShowSubtitleSettings] = useState(false)

  const loadChannels = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response: PaginatedResponse<LiveChannel> = await adminContentService.getLiveChannels({
        page: pagination.page,
        page_size: pagination.pageSize,
      })
      setItems(response.items || [])
      setPagination((prev) => ({ ...prev, total: response.total || 0 }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load live channels'
      logger.error(msg, 'LiveChannelsPage', err)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.pageSize])

  useEffect(() => {
    loadChannels()
  }, [loadChannels])

  const handleEdit = (item: LiveChannel) => {
    setEditingId(item.id)
    setEditData(item)
    setShowSubtitleSettings(item.supports_live_subtitles || false)
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
      await adminContentService.updateLiveChannel(editingId!, editData)
      setEditingId(null)
      setEditData({})
      await loadChannels()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update live channel'
      logger.error(msg, 'LiveChannelsPage', err)
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
            await adminContentService.deleteLiveChannel(id)
            setItems(items.filter((item) => item.id !== id))
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to delete live channel'
            logger.error(msg, 'LiveChannelsPage', err)
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
      key: 'name',
      label: t('admin.content.columns.name', { defaultValue: 'Name' }),
      render: (name: string) => <Text className="text-sm text-white">{name}</Text>,
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
      key: 'epg_source',
      label: t('admin.content.columns.epgSource', { defaultValue: 'EPG Source' }),
      render: (epg: string | undefined) => (
        <Text className="text-sm text-white">{epg ? 'Yes' : 'No'}</Text>
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
      render: (order: number) => <Text className="text-sm text-white">{order}</Text>,
    },
    {
      key: 'supports_live_subtitles',
      label: t('admin.content.columns.subtitles', { defaultValue: 'Subtitles' }),
      render: (supported: boolean, item: LiveChannel) => (
        <View style={[styles.badge, { backgroundColor: supported ? '#8b5cf620' : '#6b728020' }]}>
          <Text style={[styles.badgeText, { color: supported ? '#8b5cf6' : '#6b7280' }]}>
            {supported ? `✓ ${item.primary_language?.toUpperCase()}` : '—'}
          </Text>
        </View>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 100,
      render: (_: any, item: LiveChannel) => (
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

  const pageConfig = ADMIN_PAGE_CONFIG['live-channels'];
  const IconComponent = pageConfig.icon;

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg }}>
      <GlassPageHeader
        title={t('admin.titles.liveChannels', { defaultValue: 'Live Channels' })}
        subtitle={t('admin.liveChannels.subtitle', { defaultValue: 'Manage live TV channels' })}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        badge={items.length}
        isRTL={isRTL}
        action={
          <Pressable
            onPress={() => {
              setEditingId('new')
              setEditData({
                is_active: true,
                order: items.length + 1,
                supports_live_subtitles: false,
                primary_language: 'he',
                available_translation_languages: ['en', 'es', 'ar']
              })
              setShowSubtitleSettings(false)
            }}
            style={styles.addButton}
          >
            <Plus size={18} color={colors.text} />
            <Text style={styles.addButtonText}>{t('admin.actions.new', { defaultValue: 'New' })}</Text>
          </Pressable>
        }
      />

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
            {editingId === 'new' ? 'New Live Channel' : 'Edit Live Channel'}
          </Text>
          <GlassInput
            label={t('admin.liveChannels.form.name', 'Channel name')}
            containerStyle={styles.input}
            placeholder="Channel name"
            value={editData.name || ''}
            onChangeText={(value) => setEditData({ ...editData, name: value })}
          />
          <GlassInput
            label={t('admin.liveChannels.form.streamUrl', 'Stream URL')}
            containerStyle={styles.input}
            placeholder="Stream URL (HLS/DASH)"
            value={editData.stream_url || ''}
            onChangeText={(value) => setEditData({ ...editData, stream_url: value })}
          />
          <GlassInput
            label={t('admin.liveChannels.form.epgSource', 'EPG Source URL (optional)')}
            containerStyle={styles.input}
            placeholder="EPG Source URL (optional)"
            value={editData.epg_source || ''}
            onChangeText={(value) => setEditData({ ...editData, epg_source: value })}
          />
          <GlassInput
            label={t('admin.liveChannels.form.currentShow', 'Current Show')}
            containerStyle={styles.input}
            placeholder="Current Show (optional)"
            value={editData.current_show || ''}
            onChangeText={(value) => setEditData({ ...editData, current_show: value })}
          />
          <GlassInput
            label={t('admin.liveChannels.form.order', 'Order')}
            containerStyle={styles.input}
            placeholder="Order"
            value={String(editData.order || '')}
            onChangeText={(value) => setEditData({ ...editData, order: parseInt(value) || 0 })}
            keyboardType="number-pad"
          />
          <GlassToggle
            value={editData.is_active || false}
            onValueChange={(value) => setEditData({ ...editData, is_active: value })}
            label={t('admin.common.active')}
            isRTL={isRTL}
          />

          {/* Live Subtitle Settings Section */}
          <GlassView style={styles.subtitleSection}>
            <Pressable
              onPress={() => setShowSubtitleSettings(!showSubtitleSettings)}
              style={styles.subtitleHeader}
            >
              <View style={styles.subtitleHeaderLeft}>
                <Globe size={18} color={colors.primary} />
                <Text style={styles.subtitleHeaderText}>
                  {t('admin.liveChannels.subtitleSettings', 'Live Subtitle Settings')}
                </Text>
              </View>
              {showSubtitleSettings ? (
                <ChevronUp size={18} color={colors.textMuted} />
              ) : (
                <ChevronDown size={18} color={colors.textMuted} />
              )}
            </Pressable>

            {showSubtitleSettings && (
              <View style={styles.subtitleContent}>
                <GlassToggle
                  value={editData.supports_live_subtitles || false}
                  onValueChange={(value) => setEditData({ ...editData, supports_live_subtitles: value })}
                  label={t('admin.liveChannels.form.supportsSubtitles', 'Enable Live Subtitles')}
                  isRTL={isRTL}
                />

                {editData.supports_live_subtitles && (
                  <>
                    <GlassSelect
                      label={t('admin.liveChannels.form.primaryLanguage', 'Primary Language (Source)')}
                      value={editData.primary_language || 'he'}
                      onChange={(value) => setEditData({ ...editData, primary_language: value })}
                      options={SUPPORTED_LANGUAGES}
                    />

                    <View style={styles.selectGroup}>
                      <Text style={styles.selectLabel}>
                        {t('admin.liveChannels.form.targetLanguages', 'Available Translation Languages')}
                      </Text>
                      <View style={styles.languageChips}>
                        {SUPPORTED_LANGUAGES.map((lang) => {
                          const isSelected = editData.available_translation_languages?.includes(lang.value)
                          return (
                            <Pressable
                              key={lang.value}
                              onPress={() => {
                                const current = editData.available_translation_languages || []
                                const updated = isSelected
                                  ? current.filter((l) => l !== lang.value)
                                  : [...current, lang.value]
                                setEditData({ ...editData, available_translation_languages: updated })
                              }}
                              style={[
                                styles.languageChip,
                                isSelected && styles.languageChipSelected
                              ]}
                            >
                              <Text
                                style={[
                                  styles.languageChipText,
                                  isSelected && styles.languageChipTextSelected
                                ]}
                              >
                                {lang.label}
                              </Text>
                            </Pressable>
                          )
                        })}
                      </View>
                      <Text style={styles.helperText}>
                        {t('admin.liveChannels.form.targetLanguagesHelp', 'Select which languages users can translate to in real-time')}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </GlassView>

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
        emptyMessage={t('admin.liveChannels.emptyMessage', { defaultValue: 'No live channels found' })}
        isRTL={isRTL}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  cellText: {
    fontSize: 13,
    color: colors.text,
  },
  urlText: {
    fontFamily: 'monospace',
    color: colors.textSecondary,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsCell: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editForm: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
  subtitleSection: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  subtitleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  subtitleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  subtitleHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  subtitleContent: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  selectGroup: {
    gap: spacing.sm,
  },
  selectLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  languageChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  languageChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  languageChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  languageChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  languageChipTextSelected: {
    color: colors.text,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  formActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});

