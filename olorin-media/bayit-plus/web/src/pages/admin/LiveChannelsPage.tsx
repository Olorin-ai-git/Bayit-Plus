import { useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, X, AlertCircle, Globe, ChevronDown, ChevronUp } from 'lucide-react'
import { adminContentService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassButton, GlassInput, GlassView, GlassToggle, GlassSelect } from '@bayit/shared/ui'
import { GlassTable, GlassTableCell } from '@bayit/shared/ui/web'
import { useDirection } from '@/hooks/useDirection'
import { useModal } from '@/contexts/ModalContext'
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
  const { showConfirm } = useModal()
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
    showConfirm(
      t('admin.content.confirmDelete'),
      async () => {
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
      { destructive: true, confirmText: t('common.delete', 'Delete') }
    )
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

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.lg }}>
      <View style={[styles.header, { flexDirection }]}>
        <View>
          <Text style={[styles.pageTitle, { textAlign }]}>{t('admin.titles.liveChannels', { defaultValue: 'Live Channels' })}</Text>
          <Text style={[styles.subtitle, { textAlign }]}>
            {t('admin.liveChannels.subtitle', { defaultValue: 'Manage live TV channels' })}
          </Text>
        </View>
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

