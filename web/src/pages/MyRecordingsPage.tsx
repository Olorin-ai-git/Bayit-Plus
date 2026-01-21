/**
 * MyRecordingsPage
 * Display and manage user's recorded live streams
 */

import { useState, useEffect } from 'react'
import { View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Circle, Trash2, Calendar, HardDrive } from 'lucide-react'
import { useDirection } from '@/hooks/useDirection'
import { recordingApi, Recording } from '@/services/recordingApi'
import { colors } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'
import { RecordingCard } from '@/components/recordings/RecordingCard'

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
      console.error('Failed to load recordings:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadQuota = async () => {
    try {
      const quotaData = await recordingApi.getQuota()
      setQuota(quotaData)
    } catch (error) {
      console.error('Failed to load quota:', error)
    }
  }

  const handleDelete = async (recordingId: string) => {
    try {
      await recordingApi.deleteRecording(recordingId)
      await loadRecordings()
      await loadQuota()
    } catch (error) {
      console.error('Failed to delete recording:', error)
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
    <View className="flex-1 bg-[#0d0d1a]">
      {/* Header */}
      <View className="p-6 gap-4 items-center" style={{ flexDirection }}>
        <View className="w-14 h-14 rounded-full bg-purple-500/20 items-center justify-center">
          <Circle size={28} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-[28px] font-bold text-white mb-1" style={{ textAlign }}>
            {t('recordings.title')}
          </Text>
          <Text className="text-sm text-gray-400" style={{ textAlign }}>
            {t('recordings.subtitle')}
          </Text>
        </View>
      </View>

      {/* Storage Quota */}
      {quota && (
        <GlassView className="mx-6 mb-4 p-4 rounded-lg">
          <View className="gap-2 items-center mb-4" style={{ flexDirection }}>
            <HardDrive size={20} color={colors.primary} />
            <Text className="text-base font-semibold text-white">{t('recordings.storageUsed')}</Text>
          </View>

          <View className="justify-between items-center mb-2" style={{ flexDirection }}>
            <Text className="text-lg font-semibold text-white">
              {quota.used_storage_formatted} / {quota.total_storage_formatted}
            </Text>
            <Text className="text-base font-medium" style={{ color: quota.storage_usage_percentage > 90 ? colors.error : colors.text }}>
              {quota.storage_usage_percentage.toFixed(1)}%
            </Text>
          </View>

          {/* Progress Bar */}
          <View className="h-2 bg-gray-600/20 rounded overflow-hidden mb-4">
            <View
              className="h-full rounded"
              style={{
                width: `${Math.min(quota.storage_usage_percentage, 100)}%`,
                backgroundColor: quota.storage_usage_percentage > 90 ? colors.error : colors.primary
              }}
            />
          </View>

          <View className="justify-between" style={{ flexDirection }}>
            <Text className="text-xs text-gray-400">
              {t('recordings.totalRecordings')}: {quota.total_recordings}
            </Text>
            <Text className="text-xs text-gray-400">
              {t('recordings.maxDuration')}: {quota.max_recording_duration_formatted}
            </Text>
          </View>
        </GlassView>
      )}

      {/* Recordings List */}
      {loading ? (
        <View className="flex-1 items-center justify-center gap-4">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-base text-gray-400">{t('common.loading')}</Text>
        </View>
      ) : recordings.length === 0 ? (
        <View className="flex-1 items-center justify-center p-6 gap-4">
          <Circle size={64} color={colors.textSecondary} strokeWidth={1.5} />
          <Text className="text-xl font-semibold text-white">{t('recordings.noRecordings')}</Text>
          <Text className="text-sm text-gray-400 text-center max-w-[400px]">{t('recordings.noRecordingsHint')}</Text>
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
          contentContainerStyle={{ padding: 16 }}
          numColumns={2}
          columnWrapperStyle={{ gap: 16 }}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <View className="p-4 gap-4 items-center justify-center" style={{ flexDirection }}>
          <Pressable
            onPress={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className={`px-4 py-2 bg-purple-500/20 rounded-lg ${page === 1 ? 'opacity-30' : ''}`}
          >
            <Text className="text-purple-500 font-semibold">{t('common.previous')}</Text>
          </Pressable>

          <Text className="text-sm text-gray-400">
            {t('common.page')} {page} / {totalPages}
          </Text>

          <Pressable
            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className={`px-4 py-2 bg-purple-500/20 rounded-lg ${page === totalPages ? 'opacity-30' : ''}`}
          >
            <Text className="text-purple-500 font-semibold">{t('common.next')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}
