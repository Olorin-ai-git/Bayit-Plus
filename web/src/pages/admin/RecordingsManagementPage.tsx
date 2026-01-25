/**
 * Admin Recordings Management Page
 * View and manage all user recordings across the platform
 */

import { useState, useEffect } from 'react'
import { View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next'
import { Search, Trash2, Play, HardDrive, Users, Video } from 'lucide-react'
import { useDirection } from '@/hooks/useDirection'
import { useModal } from '@/contexts/ModalContext'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { GlassView, GlassInput } from '@bayit/shared/ui'
import logger from '@/utils/logger'
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
      logger.error('Failed to load recordings', 'RecordingsManagementPage', error)
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
      logger.error('Failed to load stats', 'RecordingsManagementPage', error)
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
          logger.error('Failed to delete recording', 'RecordingsManagementPage', error)
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
    <View className="flex flex-row justify-between items-start mb-6">
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
      <GlassInput
        leftIcon={<Search size={20} color={colors.textSecondary} />}
        placeholder={t('admin.recordings.searchPlaceholder')}
        value={searchQuery}
        onChangeText={setSearchQuery}
        containerStyle={styles.searchContainer}
      />
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

