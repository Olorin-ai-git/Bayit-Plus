/**
 * MyRecordingsPage
 * Display and manage user's recorded live streams
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { View, Text, FlatList, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Circle, HardDrive } from 'lucide-react'
import { useDirection } from '@/hooks/useDirection'
import { recordingApi, Recording } from '@/services/recordingApi'
import { colors } from '@olorin/design-tokens'
import { GlassView, GlassPageHeader, GlassEmptyState } from '@bayit/shared/ui'
import { RecordingCard } from '@/components/recordings/RecordingCard'
import {
  RecordingsFilterBar, RecordingFilter, RecordingSortField, RecordingSortOrder,
} from '@/components/recordings/RecordingsFilterBar'
import logger from '@/utils/logger'
import { styles } from './MyRecordingsPage.styles'
import { RecordingsQuotaPanel } from '@/components/recordings/RecordingsQuotaPanel'
import { formatBytes, formatDuration, formatDateLocalized } from '@/utils/formatters'

export default function MyRecordingsPage() {
  const { t } = useTranslation()
  const { isRTL, flexDirection, textAlign } = useDirection()

  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [quota, setQuota] = useState<any>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [activeFilter, setActiveFilter] = useState<RecordingFilter>('all')
  const [sortField, setSortField] = useState<RecordingSortField>('date')
  const [sortOrder, setSortOrder] = useState<RecordingSortOrder>('desc')

  useEffect(() => { loadRecordings(); loadQuota() }, [page])

  const filteredRecordings = useMemo(() => {
    const filtered = filterRecordings(recordings, activeFilter)
    return sortRecordings(filtered, sortField, sortOrder)
  }, [recordings, activeFilter, sortField, sortOrder])

  const handleFilterChange = useCallback((f: RecordingFilter) => setActiveFilter(f), [])

  const handleSortChange = useCallback((field: RecordingSortField) => {
    if (field === sortField) { setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc') }
    else { setSortField(field); setSortOrder('desc') }
  }, [sortField])

  const loadRecordings = async () => {
    try {
      setLoading(true)
      const data = await recordingApi.listRecordings(page, 20)
      setRecordings(data.items)
      setTotalPages(data.total_pages)
    } catch (error) {
      logger.error('Failed to load recordings', 'MyRecordingsPage', error)
    } finally { setLoading(false) }
  }

  const loadQuota = async () => {
    try { setQuota(await recordingApi.getQuota()) }
    catch (error) { logger.error('Failed to load quota', 'MyRecordingsPage', error) }
  }

  const handleDelete = async (recordingId: string) => {
    try { await recordingApi.deleteRecording(recordingId); await loadRecordings(); await loadQuota() }
    catch (error) { logger.error('Failed to delete recording', 'MyRecordingsPage', error) }
  }

  return (
    <View style={styles.container}>
      <GlassPageHeader title={t('recordings.title')} pageType="recordings" badge={recordings.length} isRTL={isRTL} />

      <View style={[styles.header, { flexDirection }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { textAlign }]}>{t('recordings.title')}</Text>
          <Text style={[styles.headerSubtitle, { textAlign }]}>{t('recordings.subtitle')}</Text>
        </View>
      </View>

      {quota && <RecordingsQuotaPanel quota={quota} flexDirection={flexDirection} />}

      {!loading && recordings.length > 0 && (
        <RecordingsFilterBar
          activeFilter={activeFilter} onFilterChange={handleFilterChange}
          sortField={sortField} sortOrder={sortOrder}
          onSortChange={handleSortChange}
          onSortOrderToggle={() => setSortOrder(p => p === 'asc' ? 'desc' : 'asc')}
          totalCount={filteredRecordings.length}
        />
      )}

      {loading ? (
        <LoadingState message={t('recordings.loading', 'Loading recordings...')} spinnerColor={colors.primary} />
      ) : filteredRecordings.length === 0 ? (
        <GlassEmptyState
          variant="no-content"
          icon={<Circle size={72} color={colors.textSecondary} strokeWidth={1.5} />}
          title={t('recordings.noRecordings')} description={t('recordings.noRecordingsHint')}
        />
      ) : (
        <FlatList
          data={filteredRecordings} keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecordingCard recording={item} onDelete={handleDelete}
              formatBytes={formatBytes} formatDuration={formatDuration} formatDate={formatDateLocalized}
            />
          )}
          contentContainerStyle={styles.listContent} numColumns={2} columnWrapperStyle={styles.columnWrapper}
        />
      )}

      {totalPages > 1 && (
        <View style={[styles.pagination, { flexDirection }]}>
          <Pressable onPress={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={[styles.paginationButton, page === 1 && styles.paginationButtonDisabled]}>
            <Text style={styles.paginationButtonText}>{t('common.previous')}</Text>
          </Pressable>
          <Text style={styles.paginationText}>{t('common.page')} {page} / {totalPages}</Text>
          <Pressable onPress={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={[styles.paginationButton, page === totalPages && styles.paginationButtonDisabled]}>
            <Text style={styles.paginationButtonText}>{t('common.next')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

function filterRecordings(recordings: Recording[], filter: RecordingFilter): Recording[] {
  if (filter === 'manual') return recordings.filter(r => !r.series_rule_id && !r.epg_entry_id)
  if (filter === 'scheduled') return recordings.filter(r => r.epg_entry_id && !r.series_rule_id)
  if (filter === 'series') return recordings.filter(r => !!r.series_rule_id)
  return recordings
}

function sortRecordings(items: Recording[], field: RecordingSortField, order: RecordingSortOrder): Recording[] {
  return [...items].sort((a, b) => {
    let cmp = 0
    if (field === 'date') cmp = new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    else if (field === 'size') cmp = a.file_size_bytes - b.file_size_bytes
    else if (field === 'duration') cmp = a.duration_seconds - b.duration_seconds
    else if (field === 'title') cmp = (a.title || '').localeCompare(b.title || '')
    return order === 'desc' ? -cmp : cmp
  })
}
