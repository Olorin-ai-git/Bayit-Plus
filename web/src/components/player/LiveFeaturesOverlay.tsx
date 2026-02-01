/**
 * LiveFeaturesOverlay Component
 * Container for live stream feature panels: Highlights, Search, Transcript Timeline
 */

import React from 'react'
import { View, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { HighlightsPanel } from './highlights'
import { LiveSearchPanel } from './search'
import { TranscriptTimeline } from './catchup'

export type LiveFeaturePanelType = 'highlights' | 'search' | 'timeline' | null

interface LiveFeaturesOverlayProps {
  channelId: string
  activePanel: LiveFeaturePanelType
  onPanelClose: () => void
  onTimestampSelect?: (timestamp: string) => void
  isRTL?: boolean
}

export default function LiveFeaturesOverlay({
  channelId,
  activePanel,
  onPanelClose,
  onTimestampSelect,
  isRTL = false,
}: LiveFeaturesOverlayProps) {
  const { i18n } = useTranslation()
  const isHebrew = i18n.language === 'he' || isRTL

  if (!activePanel) return null

  return (
    <View style={[styles.container, isHebrew && styles.containerRTL]}>
      {activePanel === 'highlights' && (
        <HighlightsPanel
          channelId={channelId}
          onClose={onPanelClose}
          isRTL={isHebrew}
        />
      )}

      {activePanel === 'search' && (
        <LiveSearchPanel
          channelId={channelId}
          onClose={onPanelClose}
          onTimestampSelect={onTimestampSelect}
          isRTL={isHebrew}
        />
      )}

      {activePanel === 'timeline' && (
        <TranscriptTimeline
          channelId={channelId}
          onClose={onPanelClose}
          onTimestampSelect={onTimestampSelect}
          isRTL={isHebrew}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 90,
    maxWidth: 420,
    maxHeight: '70%',
  },
  containerRTL: {
    right: undefined,
    left: 16,
  },
})
