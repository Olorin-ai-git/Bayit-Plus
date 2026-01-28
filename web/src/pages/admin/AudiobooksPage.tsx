/**
 * Admin Audiobooks Management Page
 * Main table with CRUD operations for audiobooks
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Plus, Edit, Trash2, Headphones } from 'lucide-react'
import { GlassButton, GlassPageHeader } from '@bayit/shared/ui'
import { GlassErrorBanner } from '@olorin/glass-ui'
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants'
import { GlassTable } from '@bayit/shared/ui/web'
import { adminAudiobookService } from '@/services/adminAudiobookService'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { useDirection } from '@/hooks/useDirection'
import { useNotifications } from '@olorin/glass-ui/hooks'
import logger from '@/utils/logger'
import type { Audiobook, AudiobookFilters } from '@/types/audiobook'
import AudiobookFormModal from './modals/AudiobookFormModal'
import AudiobookUploadModal from './modals/AudiobookUploadModal'
import AudiobookPublishModal from './modals/AudiobookPublishModal'
import AudiobookFeatureModal from './modals/AudiobookFeatureModal'

interface Pagination { page: number; pageSize: number; total: number }

export default function AdminAudiobooksPage() {
  const { t, i18n } = useTranslation()
  const { isRTL } = useDirection()
  const pageConfig = ADMIN_PAGE_CONFIG['audiobooks']
  const IconComponent = pageConfig?.icon || Headphones
  const notifications = useNotifications()
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedAudiobook, setSelectedAudiobook] = useState<Audiobook | null>(null)
  const [modals, setModals] = useState({ form: false, upload: false, publish: false, feature: false })

  const loadAudiobooks = useCallback(async () => {
    setIsLoading(true); setError(null)
    try {
      const response = await adminAudiobookService.getAudiobooksList({ page: pagination.page, page_size: pagination.pageSize })
      setAudiobooks(response.items || []); setPagination(p => ({ ...p, total: response.total || 0 }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('admin.audiobooks.loadError', 'Failed to load audiobooks')
      logger.error(msg, 'AdminAudiobooksPage', err); setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [pagination.page, pagination.pageSize, t])

  useEffect(() => { loadAudiobooks() }, [loadAudiobooks])

  const handleDelete = (id: string) => {
    notifications.show({
      level: 'warning',
      message: t('admin.audiobooks.confirmDelete', 'Delete this audiobook?'),
      action: { label: t('common.delete', 'Delete'), onPress: async () => {
        try {
          await adminAudiobookService.deleteAudiobook(id)
          setAudiobooks(audiobooks.filter(a => a.id !== id))
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to delete audiobook'
          logger.error(msg, 'AdminAudiobooksPage', err); setError(msg)
        }
      }}
    })
  }

  const openModal = (type: keyof typeof modals, audiobook?: Audiobook) => {
    if (audiobook) setSelectedAudiobook(audiobook); setSelectedId(audiobook?.id || null)
    setModals(m => ({ ...m, [type]: true }))
  }

  const closeModal = (type: keyof typeof modals) => {
    setModals(m => ({ ...m, [type]: false })); setSelectedAudiobook(null); setSelectedId(null)
  }

  const handleFormSave = async () => {
    await loadAudiobooks(); closeModal('form')
  }

  const columns = useMemo(() => [
    {
      key: 'thumbnail',
      label: t('admin.columns.cover', 'Cover'),
      width: 60,
      render: (thumbnail: string | undefined) => (
        <View style={styles.coverContainer}>
          {thumbnail ? <Image source={{ uri: thumbnail }} style={styles.cover} resizeMode="cover" /> : <Headphones size={18} color={colors.textMuted} />}
        </View>
      ),
    },
    {
      key: 'title',
      label: t('admin.columns.title', 'Title'),
      render: (title: string, item: Audiobook) => (
        <View>
          <Text style={styles.title}>{title}</Text>
          {item.author && <Text style={styles.subtitle}>{item.author}</Text>}
        </View>
      ),
    },
    {
      key: 'narrator',
      label: t('admin.columns.narrator', 'Narrator'),
      render: (narrator: string | undefined) => <Text style={styles.text}>{narrator || '-'}</Text>,
    },
    {
      key: 'duration',
      label: t('admin.columns.duration', 'Duration'),
      render: (duration: string | undefined) => <Text style={styles.text}>{duration || '-'}</Text>,
    },
    {
      key: 'is_published',
      label: t('admin.columns.published', 'Published'),
      render: (published: boolean) => <View style={[styles.badge, published ? styles.badgeActive : styles.badgeInactive]}><Text style={[styles.badgeText, published ? styles.badgeTextActive : styles.badgeTextInactive]}>{published ? t('common.yes', 'Yes') : t('common.no', 'No')}</Text></View>,
    },
    {
      key: 'actions',
      label: '',
      width: 200,
      render: (_: any, item: Audiobook) => (
        <View style={styles.actions}>
          <GlassButton variant="ghost" size="sm" onPress={() => openModal('form', item)} icon={<Edit size={16} color="#60a5fa" />} />
          <GlassButton variant="ghost" size="sm" onPress={() => openModal('upload', item)} icon={<Plus size={16} color="#10b981" />} />
          <GlassButton variant="ghost" size="sm" onPress={() => openModal('publish', item)} icon={<Headphones size={16} color="#f59e0b" />} />
          <GlassButton variant="ghost" size="sm" onPress={() => openModal('feature', item)} icon={<Headphones size={16} color="#8b5cf6" />} />
          <GlassButton variant="ghost" size="sm" onPress={() => handleDelete(item.id)} icon={<Trash2 size={16} color="#f87171" />} />
        </View>
      ),
    },
  ], [t, handleDelete, openModal])

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <GlassPageHeader
        icon={<IconComponent size={24} color={pageConfig?.iconColor} strokeWidth={2} />}
        iconColor={pageConfig?.iconColor}
        iconBackgroundColor={pageConfig?.iconBackgroundColor}
        title={t('admin.titles.audiobooks', 'Audiobooks')}
        subtitle={t('admin.audiobooks.subtitle', 'Manage audiobook library')}
        badge={audiobooks.length}
        isRTL={isRTL}
        action={
          <GlassButton
            variant="primary"
            onPress={() => openModal('form')}
            icon={<Plus size={18} color={colors.text} />}
            accessibilityLabel={t('admin.actions.newAudiobook', { defaultValue: 'Create new audiobook' })}
          >
            {t('admin.actions.new', 'New')}
          </GlassButton>
        }
      />

      <GlassErrorBanner
        message={error}
        onDismiss={() => setError(null)}
        marginBottom={spacing.lg}
      />

      <GlassTable columns={columns} data={audiobooks} loading={isLoading} pagination={pagination} onPageChange={(page) => setPagination(p => ({ ...p, page }))} emptyMessage={t('admin.audiobooks.emptyMessage', 'No audiobooks found')} isRTL={isRTL} />

      {modals.form && <AudiobookFormModal audiobook={selectedAudiobook} visible={modals.form} onClose={() => closeModal('form')} onSave={handleFormSave} />}
      {modals.upload && <AudiobookUploadModal audiobook={selectedAudiobook} visible={modals.upload} onClose={() => closeModal('upload')} />}
      {modals.publish && <AudiobookPublishModal audiobook={selectedAudiobook} visible={modals.publish} onClose={() => closeModal('publish')} onSuccess={loadAudiobooks} />}
      {modals.feature && <AudiobookFeatureModal audiobook={selectedAudiobook} visible={modals.feature} onClose={() => closeModal('feature')} />}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  coverContainer: { width: 50, height: 50, borderRadius: borderRadius.md, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  cover: { width: '100%', height: '100%' },
  title: { fontSize: 14, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  text: { fontSize: 14, color: colors.text },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  badgeActive: { backgroundColor: 'rgba(34,197,94,0.15)' },
  badgeInactive: { backgroundColor: 'rgba(156,163,175,0.15)' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  badgeTextActive: { color: '#22c55e' },
  badgeTextInactive: { color: '#9ca3af' },
  actions: { flexDirection: 'row', gap: spacing.xs },
})
