/**
 * MyRecordingsPage
 * Display and manage user's recorded live streams
 */

import { useState, useEffect } from 'react'
import { View, Text, FlatList, ActivityIndicator, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Circle, Trash2, Calendar, HardDrive } from 'lucide-react'
import { useDirection } from '@/hooks/useDirection'
import { recordingApi, Recording } from '@/services/recordingApi'
import { colors } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'
import { RecordingCard } from '@/components/recordings/RecordingCard'
import logger from '@/utils/logger'

export default function MyRecordingsPage() {
  const { t } = useTranslation()
  const { isRTL, flexDirection, textAlign } = useDirection()

  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [quota, setQuota] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    loadRecordings()
    loadQuota()
  }, [page])

  const loadRecordings = async () => {
    try {
      setLoading(true)
      const data = await recordingApi.listRecordings(page, 20)
      setRecordings(data.items)
      setTotalPages(data.total_pages)
    } catch (error) {
      logger.error('Failed to load recordings', 'MyRecordingsPage', error)
    } finally {
      setLoading(false)
    }
  }

  const loadQuota = async () => {
    try {
      const quotaData = await recordingApi.getQuota()
      setQuota(quotaData)
    } catch (error) {
      logger.error('Failed to load quota', 'MyRecordingsPage', error)
    }
  }

  const handleDelete = async (recordingId: string) => {
    try {
      await recordingApi.deleteRecording(recordingId)
      await loadRecordings()
      await loadQuota()
    } catch (error) {
      logger.error('Failed to delete recording', 'MyRecordingsPage', error)
      // Error handling is in RecordingCard via useModal
    }
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { flexDirection }]}>
        <View style={styles.headerIcon}>
          <Circle size={28} color={colors.primary} />
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { textAlign }]}>
            {t('recordings.title')}
          </Text>
          <Text style={[styles.headerSubtitle, { textAlign }]}>
            {t('recordings.subtitle')}
          </Text>
        </View>
      </View>

      {/* Storage Quota */}
      {quota && (
        <GlassView style={styles.quotaContainer}>
          <View style={[styles.quotaHeader, { flexDirection }]}>
            <HardDrive size={20} color={colors.primary} />
            <Text style={styles.quotaTitle}>{t('recordings.storageUsed')}</Text>
          </View>

          <View style={[styles.quotaStats, { flexDirection }]}>
            <Text style={styles.quotaUsage}>
              {quota.used_storage_formatted} / {quota.total_storage_formatted}
            </Text>
            <Text style={[styles.quotaPercentage, { color: quota.storage_usage_percentage > 90 ? colors.error : colors.text }]}>
              {quota.storage_usage_percentage.toFixed(1)}%
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(quota.storage_usage_percentage, 100)}%`,
                  backgroundColor: quota.storage_usage_percentage > 90 ? colors.error : colors.primary
                }
              ]}
            />
          </View>

          <View style={[styles.quotaFooter, { flexDirection }]}>
            <Text style={styles.quotaFooterText}>
              {t('recordings.totalRecordings')}: {quota.total_recordings}
            </Text>
            <Text style={styles.quotaFooterText}>
              {t('recordings.maxDuration')}: {quota.max_recording_duration_formatted}
            </Text>
          </View>
        </GlassView>
      )}

      {/* Recordings List */}
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      ) : recordings.length === 0 ? (
        <View style={styles.emptyState}>
          <Circle size={64} color={colors.textSecondary} strokeWidth={1.5} />
          <Text style={styles.emptyStateTitle}>{t('recordings.noRecordings')}</Text>
          <Text style={styles.emptyStateSubtitle}>{t('recordings.noRecordingsHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={recordings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecordingCard
              recording={item}
              onDelete={handleDelete}
              formatBytes={formatBytes}
              formatDuration={formatDuration}
              formatDate={formatDate}
            />
          )}
          contentContainerStyle={styles.listContent}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View style={[styles.pagination, { flexDirection }]}>
          <Pressable
            onPress={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}
          >
            <Text style={styles.paginationButtonText}>{t('common.previous')}</Text>
          </Pressable>

          <Text style={styles.paginationText}>
            {t('common.page')} {page} / {totalPages}
          </Text>

          <Pressable
            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={[styles.paginationButton, page === totalPages && styles.paginationButtonDisabled]}
          >
            <Text style={styles.paginationButtonText}>{t('common.next')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },

  // Header
  header: {
    padding: 24,
    gap: 16,
    alignItems: 'center',
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  // Quota
  quotaContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 8,
  },
  quotaHeader: {
    gap: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  quotaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  quotaStats: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quotaUsage: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  quotaPercentage: {
    fontSize: 16,
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(75, 85, 99, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  quotaFooter: {
    justifyContent: 'space-between',
  },
  quotaFooterText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Loading & Empty States
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 400,
  },

  // List
  listContent: {
    padding: 16,
  },
  columnWrapper: {
    gap: 16,
  },

  // Pagination
  pagination: {
    padding: 16,
    gap: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    borderRadius: 8,
  },
  paginationButtonDisabled: {
    opacity: 0.3,
  },
  paginationButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  paginationText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
})
