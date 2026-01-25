/**
 * DubbingControls Component
 * Premium feature for real-time audio dubbing of live streams
 * Uses Glass components for consistent styling and better UX
 */

import { useState, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Radio, Languages, Volume2 } from 'lucide-react'
import { GlassButton } from '@bayit/shared/components/ui/GlassButton'
import { GlassSlider } from '@bayit/shared/components/ui/GlassSlider'
import { colors, spacing, borderRadius } from '@olorin/design-tokens'
import { isTV } from '@bayit/shared/utils/platform'
import { GlassLiveControlButton } from '../controls/GlassLiveControlButton'
import { DubbingOnboarding } from './DubbingOnboarding'
import { VoiceSelector } from './VoiceSelector'
import { LiveDubbingService } from '@/services/liveDubbingService'
import logger from '@/utils/logger'

interface DubbingControlsProps {
  isEnabled: boolean
  isConnecting: boolean
  isAvailable: boolean
  isPremium: boolean
  targetLanguage: string
  availableLanguages: string[]
  latencyMs: number
  error: string | null
  onToggle: () => void
  onLanguageChange: (lang: string) => void
  onShowUpgrade?: () => void
  onDisableSubtitles?: () => void
  onOriginalVolumeChange?: (volume: number) => void
  onDubbedVolumeChange?: (volume: number) => void
  onVoiceChange?: (voiceId: string) => void
  onHoveredButtonChange?: (button: string | null) => void
}

export default function DubbingControls({
  isEnabled,
  isConnecting,
  isAvailable,
  isPremium,
  targetLanguage,
  availableLanguages,
  latencyMs,
  error,
  onToggle,
  onLanguageChange,
  onShowUpgrade,
  onDisableSubtitles,
  onOriginalVolumeChange,
  onDubbedVolumeChange,
  onVoiceChange,
  onHoveredButtonChange,
}: DubbingControlsProps) {
  const { t } = useTranslation()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showVoiceSelector, setShowVoiceSelector] = useState(false)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>()
  const [availableVoices, setAvailableVoices] = useState<Array<{ id: string; name: string; description: string }>>([])

  // Load available voices from ElevenLabs API
  useEffect(() => {
    if (availableVoices.length === 0) {
      LiveDubbingService.getVoices()
        .then((voices) => {
          logger.debug('Loaded ElevenLabs voices', 'DubbingControls', { count: voices.length })
          setAvailableVoices(
            voices.map((v) => ({
              id: v.id,
              name: v.name,
              description: v.description || `${v.language} voice`,
            }))
          )
          // Set default voice if none selected
          if (!selectedVoiceId && voices.length > 0) {
            setSelectedVoiceId(voices[0].id)
          }
        })
        .catch((error) => {
          logger.error('Failed to load voices', 'DubbingControls', error)
          // Fallback to generic voices if API fails
          setAvailableVoices([
            { id: 'default', name: 'Default Voice', description: 'Standard voice' },
          ])
        })
    }
  }, [])

  if (!isAvailable) return null

  const handlePress = () => {
    // Prevent action while connecting
    if (isConnecting) {
      return
    }

    if (!isPremium) {
      onShowUpgrade?.()
      return
    }

    // Disable subtitles for mutual exclusivity before toggling
    if (!isEnabled && onDisableSubtitles) {
      logger.debug('Disabling subtitles for mutual exclusivity', 'DubbingControls', {})
      onDisableSubtitles()
    }

    onToggle()
  }

  return (
    <>
      <View style={styles.container}>
        {/* Main Toggle Button */}
        <View
          onMouseEnter={() => onHoveredButtonChange?.('liveDubbing')}
          onMouseLeave={() => onHoveredButtonChange?.(null)}
        >
          <GlassLiveControlButton
            icon={
              <Radio
                size={18}
                color={isEnabled ? colors.primary : colors.textSecondary}
              />
            }
            label={t('dubbing.title', 'Live Dubbing')}
            isEnabled={isEnabled}
            isConnecting={isConnecting}
            isPremium={isPremium}
            onPress={handlePress}
          />
        </View>

        {/* Voice Control (only when enabled) */}
        {isEnabled && (
          <View
            onMouseEnter={() => onHoveredButtonChange?.('voiceSelector')}
            onMouseLeave={() => onHoveredButtonChange?.(null)}
          >
            <GlassButton
              title="🎤"
              variant="ghost"
              size="sm"
              onPress={() => setShowVoiceSelector(true)}
              accessibilityLabel={t('dubbing.selectVoice', 'Select Voice')}
              style={styles.iconButton}
            />
          </View>
        )}

        {/* Latency Indicator (only when connected) */}
        {isEnabled && !isConnecting && latencyMs > 0 && (
          <View style={styles.latencyBadge}>
            <Text style={styles.latencyText}>~{latencyMs}ms</Text>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Onboarding Modal */}
      <DubbingOnboarding
        isPremium={isPremium}
        onClose={(tryNow) => {
          setShowOnboarding(false)
          if (tryNow) {
            onToggle()
          }
        }}
      />

      {/* Voice Selector Modal */}
      <VoiceSelector
        visible={showVoiceSelector}
        voices={availableVoices}
        selectedVoiceId={selectedVoiceId}
        onSelect={(voiceId) => {
          setSelectedVoiceId(voiceId)
          onVoiceChange?.(voiceId)
          setShowVoiceSelector(false)
        }}
        onClose={() => setShowVoiceSelector(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    position: 'relative',
  },
  iconButton: {
    minWidth: 40,
  },
  latencyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  latencyText: {
    color: '#93c5fd',
    fontSize: isTV ? 12 : 11,
    fontWeight: '600',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 52,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(220, 38, 38, 0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    maxWidth: 220,
  },
  errorText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
})
