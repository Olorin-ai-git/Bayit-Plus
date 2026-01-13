/**
 * Admin Recordings Management Page
 * View and manage all user recordings across the platform
 */

import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, TextInput } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Search, Trash2, Play, HardDrive, Users, Video } from 'lucide-react'
import { useDirection } from '@/hooks/useDirection'
import { useModal } from '@/contexts/ModalContext'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

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
  const { showConfirm, showError, showSuccess } = useModal()

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
      const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}')
      const token = authData?.state?.token

      const response = await axios.get(`${API_BASE_URL}/admin/recordings`, {
        params: {
          page,
          page_size: 20,
          search: searchQuery || undefined
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      setRecordings(response.data.items)
      setTotalPages(response.data.total_pages)
    } catch (error) {
      console.error('Failed to load recordings:', error)
      showError(t('admin.recordings.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}')
      const token = authData?.state?.token

      const response = await axios.get(`${API_BASE_URL}/admin/recordings/stats`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      setStats(response.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleDelete = (recording: AdminRecording) => {
    showConfirm(
      t('admin.recordings.confirmDelete', { title: recording.title }),
      async () => {
        try {
          const authData = JSON.parse(localStorage.getItem('bayit-auth') || '{}')
          const token = authData?.state?.token

          await axios.delete(`${API_BASE_URL}/admin/recordings/${recording.id}`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })

          showSuccess(t('admin.recordings.deleteSuccess'))
          await loadRecordings()
          await loadStats()
        } catch (error) {
          console.error('Failed to delete recording:', error)
          showError(t('admin.recordings.deleteFailed'))
        }
      },
      {
        title: t('admin.recordings.deleteRecording'),
        confirmText: t('common.delete'),
        cancelText: t('common.cancel'),
        destructive: true
      }
    )
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

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.pageTitle, { textAlign }]}>
        {t('admin.recordings.title')}
      </Text>

      {/* Stats Cards */}
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

      {/* Search Bar */}
      <GlassView style={styles.searchContainer}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { textAlign: isRTL ? 'right' : 'left' }]}
          placeholder={t('admin.recordings.searchPlaceholder')}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </GlassView>
    </View>
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
    <View style={styles.container}>
      {renderHeader()}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    gap: spacing.lg,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  statsContainer: {
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  statCard: {
    flex: 1,
    minWidth: 200,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 400,
  },
  listContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  recordingCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  cardContent: {
    alignItems: 'center',
    gap: spacing.md,
  },
  cardInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  recordingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  recordingMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  subtitleBadge: {
    backgroundColor: `${colors.primary}30`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  subtitleText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  cardActions: {
    gap: spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: `${colors.error}20`,
  },
  pagination: {
    padding: spacing.lg,
    gap: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.primary}20`,
    borderRadius: borderRadius.md,
  },
  pageButtonDisabled: {
    opacity: 0.3,
  },
  pageButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  pageInfo: {
    fontSize: 14,
    color: colors.textSecondary,
  },
})
