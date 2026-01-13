import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, X, AlertCircle, Globe, ChevronDown, ChevronUp } from 'lucide-react'
import { contentService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassButton, GlassTable, GlassTableCell, GlassInput, GlassView } from '@bayit/shared/ui'
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
      const response: PaginatedResponse<LiveChannel> = await contentService.getLiveChannels({
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
      await contentService.updateLiveChannel(editingId!, editData)
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
          await contentService.deleteLiveChannel(id)
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
      render: (name: string) => <Text style={styles.cellText}>{name}</Text>,
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
        <Text style={styles.cellText}>{epg ? 'Yes' : 'No'}</Text>
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
          <Text style={styles.errorText}>{error}</Text>
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
                <View style={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    id="supports_live_subtitles"
                    checked={editData.supports_live_subtitles || false}
                    onChange={(e) => setEditData({ ...editData, supports_live_subtitles: e.target.checked })}
                    style={styles.checkbox}
                  />
                  <Text style={styles.checkboxLabel}>
                    {t('admin.liveChannels.form.supportsSubtitles', 'Enable Live Subtitles')}
                  </Text>
                </View>

                {editData.supports_live_subtitles && (
                  <>
                    <View style={styles.selectGroup}>
                      <Text style={styles.selectLabel}>
                        {t('admin.liveChannels.form.primaryLanguage', 'Primary Language (Source)')}
                      </Text>
                      <select
                        value={editData.primary_language || 'he'}
                        onChange={(e) => setEditData({ ...editData, primary_language: e.target.value })}
                        style={styles.select as any}
                      >
                        <option value="he">🇮🇱 Hebrew (עברית)</option>
                        <option value="en">🇺🇸 English</option>
                        <option value="ar">🇸🇦 Arabic (العربية)</option>
                        <option value="es">🇪🇸 Spanish (Español)</option>
                        <option value="ru">🇷🇺 Russian (Русский)</option>
                        <option value="fr">🇫🇷 French (Français)</option>
                      </select>
                    </View>

                    <View style={styles.selectGroup}>
                      <Text style={styles.selectLabel}>
                        {t('admin.liveChannels.form.targetLanguages', 'Available Translation Languages')}
                      </Text>
                      <View style={styles.languageChips}>
                        {['en', 'es', 'ar', 'ru', 'fr'].map((lang) => {
                          const langLabels: Record<string, string> = {
                            en: '🇺🇸 English',
                            es: '🇪🇸 Spanish',
                            ar: '🇸🇦 Arabic',
                            ru: '🇷🇺 Russian',
                            fr: '🇫🇷 French'
                          }
                          const isSelected = editData.available_translation_languages?.includes(lang)
                          return (
                            <Pressable
                              key={lang}
                              onPress={() => {
                                const current = editData.available_translation_languages || []
                                const updated = isSelected
                                  ? current.filter((l) => l !== lang)
                                  : [...current, lang]
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
                                {langLabels[lang]}
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
  // Subtitle Settings
  subtitleSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  subtitleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 217, 255, 0.1)',
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
    padding: spacing.md,
    gap: spacing.md,
  },
  selectGroup: {
    marginTop: spacing.sm,
  },
  selectLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  select: {
    width: '100%',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: 14,
  },
  languageChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  languageChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  languageChipSelected: {
    backgroundColor: 'rgba(0, 217, 255, 0.15)',
    borderColor: colors.primary,
  },
  languageChipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  languageChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
})
