/**
 * TranscriptTimeline Component
 * Displays a scrollable timeline of live transcript segments
 * with auto-refresh and RTL support
 */

import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, FlatList, Platform } from 'react-native'
import { GlassLoadingSpinner } from '@bayit/shared/ui'
import { useTranslation } from 'react-i18next'
import { FileText, X } from 'lucide-react-native'
import { GlassButton } from '@bayit/shared/components/ui/GlassButton'
import { getTranscriptTimeline, type TranscriptSegment } from '@/services/liveCatchupApi'
import { TranscriptSegmentCard } from './TranscriptSegmentCard'
import { catchupStyles as styles, getTvStyles } from './catchupStyles'
import logger from '@bayit/shared-utils/logger'

const LOG_CONTEXT = 'TranscriptTimeline'
const REFRESH_INTERVAL_MS = 10000
const DEFAULT_WINDOW_MINUTES = 15

interface TranscriptTimelineProps {
  channelId: string
  onClose?: () => void
  onTimestampSelect?: (timestamp: string) => void
  windowMinutes?: number
  isRTL?: boolean
}

export function TranscriptTimeline({
  channelId,
  onClose,
  onTimestampSelect,
  windowMinutes = DEFAULT_WINDOW_MINUTES,
  isRTL = false,
}: TranscriptTimelineProps) {
  const { t, i18n } = useTranslation()
  const isTV = Platform.isTV || Platform.OS === 'tvos'
  const tvStyles = getTvStyles(isTV)

  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const isHebrew = i18n.language === 'he' || isRTL

  const fetchTranscripts = useCallback(async () => {
    try {
      const response = await getTranscriptTimeline(channelId, windowMinutes)
      setTranscripts(response.transcripts)
      setTotalCount(response.total)
    } catch (err) {
      logger.error('Failed to fetch transcript timeline', LOG_CONTEXT, {
        channelId,
        windowMinutes,
        error: err,
      })
    } finally {
      setLoading(false)
    }
  }, [channelId, windowMinutes])

  useEffect(() => {
    fetchTranscripts()
    const interval = setInterval(fetchTranscripts, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchTranscripts])

  const renderSegment = useCallback(
    ({ item }: { item: TranscriptSegment }) => (
      <TranscriptSegmentCard
        segment={item}
        onPress={onTimestampSelect}
        isRTL={isHebrew}
      />
    ),
    [onTimestampSelect, isHebrew]
  )

  const renderEmpty = () => {
    if (loading) return null

    return (
      <View style={styles.emptyContainer}>
        <FileText size={isTV ? 48 : 32} color="rgba(255, 255, 255, 0.5)" />
        <Text style={styles.emptyText}>
          {t('catchup.timeline.empty')}
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.panelContainer}>
      <View style={[styles.panelHeader, isHebrew && styles.panelHeaderRTL]}>
        <Text style={[styles.panelTitle, tvStyles.headerText]}>
          {t('catchup.timeline.title')}
        </Text>
        {onClose && (
          <GlassButton
            icon={<X size={isTV ? 24 : 16} color="#9CA3AF" />}
            onPress={onClose}
            variant="ghost"
            size={isTV ? 'md' : 'sm'}
            accessibilityLabel={t('common.close')}
          />
        )}
      </View>

      {!loading && transcripts.length > 0 && (
        <View style={[styles.statsBar, isHebrew && styles.statsBarRTL]}>
          <Text style={styles.statsText}>
            {t('catchup.timeline.count', { count: totalCount })}
          </Text>
          <Text style={styles.statsText}>
            {t('catchup.timeline.window', { minutes: windowMinutes })}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <GlassLoadingSpinner size={isTV ? 'large' : 'small'} />
        </View>
      ) : (
        <FlatList
          data={transcripts}
          keyExtractor={(item, index) => `${item.timestamp}-${index}`}
          renderItem={renderSegment}
          ListEmptyComponent={renderEmpty}
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
          inverted
        />
      )}
    </View>
  )
}

export default TranscriptTimeline
