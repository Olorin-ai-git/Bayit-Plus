import { useState, useEffect, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, Globe, ChevronDown, ChevronUp, Radio } from 'lucide-react'
import { adminLiveChannelsService } from '@/services/adminApi'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassButton, GlassInput, GlassView, GlassToggle, GlassSelect, GlassPageHeader, GlassErrorBanner } from '@bayit/shared/ui'
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
      const response: PaginatedResponse<LiveChannel> = await adminLiveChannelsService.getAll({
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
      if (editingId === 'new') {
        await adminLiveChannelsService.create(editData)
      } else {
        await adminLiveChannelsService.update(editingId!, editData)
      }
      setEditingId(null)
      setEditData({})
      await loadChannels()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save live channel'
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
            await adminLiveChannelsService.delete(id)
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
      key: 'logo',
      label: t('admin.content.columns.logo', { defaultValue: 'Logo' }),
      width: 80,
      render: (logo: string | undefined, item: LiveChannel) => (
        <View style={styles.logoContainer}>
          {logo ? (
            <Image
              source={{ uri: logo }}
              style={styles.logoImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Radio size={20} color={colors.textMuted} />
            </View>
          )}
        </View>
      ),
    },
    {
      key: 'name',
      label: t('admin.content.columns.name', { defaultValue: 'Name' }),
      render: (name: string) => <Text style={styles.nameText}>{name}</Text>,
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
        <Text style={styles.epgText}>{epg ? t('common.yes', 'Yes') : t('common.no', 'No')}</Text>
      ),
    },
    {
      key: 'is_active',
      label: t('admin.content.columns.status', { defaultValue: 'Status' }),
      render: (isActive: boolean) => (
        <View style={[styles.badge, isActive ? styles.badgeActive : styles.badgeInactive]}>
          <Text style={[styles.badgeText, isActive ? styles.badgeTextActive : styles.badgeTextInactive]}>
            {isActive ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
          </Text>
        </View>
      ),
    },
    {
      key: 'order',
      label: t('admin.content.columns.order', { defaultValue: 'Order' }),
      render: (order: number) => <Text style={styles.orderText}>{order}</Text>,
    },
    {
      key: 'supports_live_subtitles',
      label: t('admin.content.columns.subtitles', { defaultValue: 'Subtitles' }),
      render: (supported: boolean, item: LiveChannel) => (
        <View style={[styles.badge, supported ? styles.badgeSubtitles : styles.badgeNoSubtitles]}>
          <Text style={[styles.badgeText, supported ? styles.badgeTextSubtitles : styles.badgeTextInactive]}>
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
          <GlassButton
            variant="ghost"
            size="sm"
            onPress={() => handleEdit(item)}
            icon={<Edit size={18} color="#60a5fa" />}
            style={styles.actionButton}
            accessibilityLabel={t('admin.liveChannels.editChannel', { defaultValue: 'Edit channel' })}
          />
          <GlassButton
            variant="ghost"
            size="sm"
            onPress={() => handleDelete(item.id)}
            disabled={deleting === item.id}
            icon={<Trash2 size={18} color="#f87171" />}
            style={[styles.actionButton, deleting === item.id && styles.disabledButton]}
            accessibilityLabel={t('admin.liveChannels.deleteChannel', { defaultValue: 'Delete channel' })}
          />
        </View>
      ),
    },
  ]

  const pageConfig = ADMIN_PAGE_CONFIG['live-channels'];
  const IconComponent = pageConfig.icon;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <GlassPageHeader
        title={t('admin.titles.liveChannels', { defaultValue: 'Live Channels' })}
        subtitle={t('admin.liveChannels.subtitle', { defaultValue: 'Manage live TV channels' })}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        badge={items.length}
        isRTL={isRTL}
        action={
          <GlassButton
            variant="primary"
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
            icon={<Plus size={18} color={colors.text} />}
            accessibilityLabel={t('admin.actions.newChannel', { defaultValue: 'Create new channel' })}
          >
            {t('admin.actions.new', { defaultValue: 'New' })}
          </GlassButton>
        }
      />

      <GlassErrorBanner
        message={error}
        onDismiss={() => setError(null)}
        marginBottom={spacing.lg}
      />

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
  container: {
    flex: 1,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  nameText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  epgText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  orderText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
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
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  badgeInactive: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
  },
  badgeSubtitles: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  badgeNoSubtitles: {
    backgroundColor: 'rgba(156, 163, 175, 0.15)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  badgeTextActive: {
    color: '#22c55e',
  },
  badgeTextInactive: {
    color: '#9ca3af',
  },
  badgeTextSubtitles: {
    color: '#a78bfa',
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

