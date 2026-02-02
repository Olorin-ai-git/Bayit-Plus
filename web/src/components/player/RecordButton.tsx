/**
 * RecordButton Component
 * Button to start/stop recording live streams
 */

import React, { useState, useCallback, useRef } from 'react'
import { View, Text, Pressable } from 'react-native'
import { Circle, Square, ChevronUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RecordOptionsPopover, RecordingOptions } from './RecordOptionsPopover'
import { useRecordingSession } from './useRecordingSession'
import { formatDuration } from '@/utils/formatters'
import { styles, getButtonIdleStyle, getOptionsToggleStyle } from './RecordButton.styles'
import { useRTL } from '@/hooks/useRTL'
import logger from '@/utils/logger'

const log = logger.scope('RecordButton')

interface RecordButtonProps {
  channelId: string
  isLive: boolean
  isPremium: boolean
  onShowUpgrade: () => void
  onRecordingStateChange?: (isRecording: boolean, duration: number) => void
}

export const RecordButton: React.FC<RecordButtonProps> = ({
  channelId, isLive, isPremium, onShowUpgrade, onRecordingStateChange,
}) => {
  const { t } = useTranslation()
  const { isRTL } = useRTL()
  const [isHovered, setIsHovered] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)

  const {
    isRecording, duration, recordingOptions,
    setRecordingOptions, startRecording, stopRecording,
  } = useRecordingSession({ channelId, onRecordingStateChange })

  const handlePress = async () => {
    log.debug('handlePress called', { isRecording, isPremium })
    if (!isPremium) { onShowUpgrade(); return }
    if (isRecording) {
      log.info('Stopping recording')
      await stopRecording()
    } else {
      log.info('Starting recording')
      await startRecording(recordingOptions)
    }
  }

  const handleLongPressIn = useCallback(() => {
    if (isRecording) return
    longPressTimer.current = setTimeout(() => {
      if (isPremium) setShowOptions(true)
    }, 500)
  }, [isRecording, isPremium])

  const handleLongPressOut = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleContextMenu = useCallback((e: any) => {
    if (!isPremium || isRecording) return
    e.preventDefault?.()
    setShowOptions(true)
  }, [isPremium, isRecording])

  const handleStartWithOptions = async (options: RecordingOptions) => {
    setRecordingOptions(options)
    await startRecording(options)
  }

  if (!isLive) return null

  return (
    <View style={styles.wrapper}>
      <RecordOptionsPopover
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        options={recordingOptions}
        onOptionsChange={setRecordingOptions}
        onStartRecording={handleStartWithOptions}
      />

      <View style={[styles.buttonGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable
          onPress={handlePress}
          onPressIn={handleLongPressIn}
          onPressOut={handleLongPressOut}
          onContextMenu={handleContextMenu}
          onHoverIn={() => setIsHovered(true)}
          onHoverOut={() => setIsHovered(false)}
          style={[
            styles.button,
            isRecording ? styles.buttonRecording : getButtonIdleStyle(isRTL),
            isHovered && !isRecording && styles.buttonHovered,
          ]}
        >
          {isRecording ? (
            <>
              <Square size={16} color="white" fill="white" />
              <Text style={styles.buttonText}>{formatDuration(duration)}</Text>
            </>
          ) : (
            <>
              <Circle size={16} color="white" />
              <Text style={styles.buttonText}>{t('recordings.record')}</Text>
            </>
          )}
        </Pressable>

        {!isRecording && isPremium && (
          <Pressable
            onPress={() => setShowOptions(!showOptions)}
            style={[getOptionsToggleStyle(isRTL), isHovered && styles.buttonHovered]}
          >
            <ChevronUp size={14} color="white" />
          </Pressable>
        )}
      </View>
    </View>
  )
}
