/**
 * HighlightsPanel Component
 * Panel displaying list of detected highlights for a live channel
 */

import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, Platform } from 'react-native'
import { GlassLoadingSpinner } from '@bayit/shared/ui'
import { useTranslation } from 'react-i18next'
import { Sparkles, X } from 'lucide-react-native'
import { GlassButton } from '@bayit/shared/components/ui/GlassButton'
import { getChannelHighlights, type Highlight } from '@/services/liveHighlightsApi'
import { HighlightCard } from './HighlightCard'
import { highlightStyles as styles, getTvStyles, ICON_COLORS } from './highlightStyles'
import logger from '@bayit/shared-utils/logger'

const LOG_CONTEXT = 'HighlightsPanel'
const POLL_INTERVAL_MS = 30000

interface HighlightsPanelProps {
  channelId: string
  onClose?: () => void
  isRTL?: boolean
}

export function HighlightsPanel({ channelId, onClose, isRTL = false }: HighlightsPanelProps) {
  const { t, i18n } = useTranslation()
  const isTV = Platform.isTV || Platform.OS === 'tvos'
  const tvStyles = getTvStyles(isTV)

  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isHebrew = i18n.language === 'he' || isRTL

  const fetchHighlights = useCallback(async () => {
    try {
      const response = await getChannelHighlights(channelId)
      setHighlights(response.highlights)
      setError(null)
    } catch (err) {
      logger.error('Failed to fetch highlights', LOG_CONTEXT, { channelId, error: err })
      setError(t('highlights.fetchError'))
    } finally {
      setLoading(false)
    }
  }, [channelId, t])

  useEffect(() => {
    fetchHighlights()

    const interval = setInterval(fetchHighlights, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchHighlights])

  const handleDismissHighlight = useCallback((highlightId: string) => {
    setHighlights(prev => prev.filter(h => h.highlight_id !== highlightId))
  }, [])

  const renderHighlight = useCallback(({ item }: { item: Highlight }) => (
    <HighlightCard
      highlight={item}
      onDismiss={() => handleDismissHighlight(item.highlight_id)}
      isRTL={isHebrew}
    />
  ), [isHebrew, handleDismissHighlight])

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Sparkles size={isTV ? 48 : 32} color={ICON_COLORS.muted} />
      <Text style={styles.emptyText}>
        {t('highlights.noHighlights')}
      </Text>
    </View>
  )

  if (loading) {
    return (
      <View style={styles.panelContainer}>
        <View style={[styles.panelHeader, isHebrew && styles.panelHeaderRTL]}>
          <Text style={[styles.panelTitle, tvStyles.headerText]}>
            {t('highlights.title')}
          </Text>
        </View>
        <View style={styles.emptyContainer}>
          <GlassLoadingSpinner size={isTV ? 'large' : 'small'} />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.panelContainer}>
      {/* Header */}
      <View style={[styles.panelHeader, isHebrew && styles.panelHeaderRTL]}>
        <Text style={[styles.panelTitle, tvStyles.headerText]}>
          {t('highlights.title')}
        </Text>
        {onClose && (
          <GlassButton
            icon={<X size={isTV ? 24 : 16} color={ICON_COLORS.secondary} />}
            onPress={onClose}
            variant="ghost"
            size={isTV ? 'md' : 'sm'}
            accessibilityLabel={t('common.close')}
          />
        )}
      </View>

      {/* Error Message */}
      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}

      {/* Highlights List */}
      <FlatList
        data={highlights}
        keyExtractor={(item: any) => item.highlight_id}
        renderItem={renderHighlight}
        ListEmptyComponent={renderEmpty}
        style={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

export default HighlightsPanel
