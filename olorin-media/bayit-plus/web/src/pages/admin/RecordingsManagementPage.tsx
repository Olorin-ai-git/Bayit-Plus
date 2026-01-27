/**
 * Admin Recordings Management Page
 * View and manage all user recordings across the platform
 */

import { useState, useEffect } from 'react'
import { View, Text, FlatList, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next'
import { Search, Trash2, Play, HardDrive, Users, Video } from 'lucide-react'
import { useDirection } from '@/hooks/useDirection'
import { useNotifications } from '@olorin/glass-ui/hooks'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassView, GlassInput, GlassPageHeader } from '@bayit/shared/ui'
import { ADMIN_PAGE_CONFIG } from '../../../../shared/utils/adminConstants'
import logger from '@/utils/logger'
import api from '@/services/api'

interface AdminRecording {
  id: string
  user_id: string
  user_email: string
  channel_name: string
  title: string
  recorded_at: string
  duration_seconds: number
  file_size_bytes: number
  video_url: string
  subtitle_url?: string
  auto_delete_at: string
}

interface RecordingStats {
  total_recordings: number
  total_storage_bytes: number
  total_users: number
  active_sessions: number
}

export default function RecordingsManagementPage() {
  const { t } = useTranslation()
  const { isRTL, flexDirection, textAlign } = useDirection()
  const notifications = useNotifications()

  const [recordings, setRecordings] = useState<AdminRecording[]>([])
  const [stats, setStats] = useState<RecordingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadRecordings()
    loadStats()
  }, [page, searchQuery])

  const loadRecordings = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('page', String(page))
      params.append('page_size', '20')
      if (searchQuery) params.append('search', searchQuery)

      const data = await api.get(`/admin/recordings?${params.toString()}`) as { items: AdminRecording[]; total_pages: number }

      setRecordings(data.items)
      setTotalPages(data.total_pages)
    } catch (error) {
      logger.error('Failed to load recordings', 'RecordingsManagementPage', error)
      notifications.showError(t('admin.recordings.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await api.get('/admin/recordings/stats') as RecordingStats
      setStats(data)
    } catch (error) {
      logger.error('Failed to load stats', 'RecordingsManagementPage', error)
    }
  }

  const handleDelete = (recording: AdminRecording) => {
    notifications.show({
      level: 'warning',
      message: t('admin.recordings.confirmDelete', { title: recording.title }),
      dismissable: true,
      action: {
        label: t('common.delete', 'Delete'),
        type: 'action',
        onPress: async () => {
          try {
            await api.delete(`/admin/recordings/${recording.id}`)

            notifications.showSuccess(t('admin.recordings.deleteSuccess'))
            await loadRecordings()
            await loadStats()
          } catch (error) {
            logger.error('Failed to delete recording', 'RecordingsManagementPage', error)
            notifications.showError(t('admin.recordings.deleteFailed'))
          }
        },
      },
    })
  }

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`
    return `${(bytes / 1024).toFixed(2)} KB`
  }

  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)

    if (hrs > 0) {
      return `${hrs}h ${mins}m`
    }
    return `${mins}m`
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(isRTL ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const pageConfig = ADMIN_PAGE_CONFIG.recordings;
  const IconComponent = pageConfig.icon;

  const renderHeader = () => (
    <>
      <GlassPageHeader
        title={t('admin.recordings.title')}
        icon={<IconComponent size={24} color={pageConfig.iconColor} strokeWidth={2} />}
        iconColor={pageConfig.iconColor}
        iconBackgroundColor={pageConfig.iconBackgroundColor}
        badge={stats?.total_recordings}
        isRTL={isRTL}
      />

      {/* Stats Cards */}
      <View style={styles.statsSection}>
        {stats && (
          <View style={[styles.statsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <GlassView style={styles.statCard}>
              <Video size={24} color={colors.primary} />
              <Text style={styles.statValue}>{stats.total_recordings}</Text>
              <Text style={styles.statLabel}>{t('admin.recordings.totalRecordings')}</Text>
            </GlassView>

            <GlassView style={styles.statCard}>
              <HardDrive size={24} color={colors.success} />
              <Text style={styles.statValue}>{formatBytes(stats.total_storage_bytes)}</Text>
              <Text style={styles.statLabel}>{t('admin.recordings.totalStorage')}</Text>
            </GlassView>

            <GlassView style={styles.statCard}>
              <Users size={24} color={colors.warning} />
              <Text style={styles.statValue}>{stats.total_users}</Text>
              <Text style={styles.statLabel}>{t('admin.recordings.totalUsers')}</Text>
            </GlassView>

            <GlassView style={styles.statCard}>
              <Play size={24} color={colors.error} />
              <Text style={styles.statValue}>{stats.active_sessions}</Text>
              <Text style={styles.statLabel}>{t('admin.recordings.activeSessions')}</Text>
            </GlassView>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <GlassInput
        leftIcon={<Search size={20} color={colors.textSecondary} />}
        placeholder={t('admin.recordings.searchPlaceholder')}
        value={searchQuery}
        onChangeText={setSearchQuery}
        containerStyle={styles.searchContainer}
      />
    </>
  )

  const renderRecordingItem = ({ item }: { item: AdminRecording }) => (
    <GlassView style={styles.recordingCard}>
      <View style={[styles.cardContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.cardInfo}>
          <Text style={[styles.recordingTitle, { textAlign }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.recordingMeta, { textAlign }]}>
            {t('admin.recordings.user')}: {item.user_email}
          </Text>
          <Text style={[styles.recordingMeta, { textAlign }]}>
            {formatDate(item.recorded_at)} • {formatDuration(item.duration_seconds)} • {formatBytes(item.file_size_bytes)}
          </Text>
          {item.subtitle_url && (
            <View style={styles.subtitleBadge}>
              <Text style={styles.subtitleText}>{t('recordings.subtitlesAvailable')}</Text>
            </View>
          )}
        </View>

        <View style={[styles.cardActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Pressable
            style={styles.actionButton}
            onPress={() => window.open(item.video_url, '_blank')}
          >
            <Play size={18} color={colors.primary} />
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item)}
          >
            <Trash2 size={18} color={colors.error} />
          </Pressable>
        </View>
      </View>
    </GlassView>
  )

  return (
    <View className="flex-1">
      {renderHeader()}

      {loading ? (
        <View className="flex-1 justify-center items-center gap-2">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-sm text-gray-400">{t('common.loading')}</Text>
        </View>
      ) : recordings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Video size={64} color={colors.textSecondary} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>{t('admin.recordings.noRecordings')}</Text>
          <Text style={styles.emptyText}>{t('admin.recordings.noRecordingsHint')}</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={recordings}
            keyExtractor={(item) => item.id}
            renderItem={renderRecordingItem}
            contentContainerStyle={styles.listContent}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={[styles.pagination, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Pressable
                onPress={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
              >
                <Text style={styles.pageButtonText}>{t('common.previous')}</Text>
              </Pressable>

              <Text style={styles.pageInfo}>
                {t('recordings.page')} {page} / {totalPages}
              </Text>

              <Pressable
                onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
              >
                <Text style={styles.pageButtonText}>{t('common.next')}</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  statsSection: {
    marginBottom: spacing.lg,
  },
  statsContainer: {
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  searchContainer: {
    marginBottom: spacing.lg,
  },
  recordingCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
  },
  cardContent: {
    gap: spacing.md,
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  recordingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  recordingMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  subtitleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  subtitleText: {
    fontSize: 11,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  cardActions: {
    gap: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  listContent: {
    padding: spacing.lg,
  },
  pagination: {
    padding: spacing.lg,
    gap: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
  },
  pageButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  pageInfo: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

