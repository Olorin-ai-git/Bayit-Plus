/**
 * DubbingControls Component
 * Premium feature for real-time audio dubbing of live streams
 * Uses Glass components for consistent styling and better UX
 */

import { useState, useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MessageSquare, Languages, Volume2 } from 'lucide-react'
import { GlassButton } from '@bayit/shared/components/ui/GlassButton'
import { GlassSlider } from '@bayit/shared/components/ui/GlassSlider'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'
import { GlassLiveControlButton } from '../controls/GlassLiveControlButton'
import { DubbingOnboarding } from './DubbingOnboarding'
import { VoiceSelector } from './VoiceSelector'
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
}: DubbingControlsProps) {
  const { t } = useTranslation()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showVoiceSelector, setShowVoiceSelector] = useState(false)
  const [showVolumePanel, setShowVolumePanel] = useState(false)
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>()
  const [originalVolume, setOriginalVolume] = useState(0)
  const [dubbedVolume, setDubbedVolume] = useState(1)
  const [availableVoices, setAvailableVoices] = useState<Array<{ id: string; name: string; description: string }>>([])

  useEffect(() => {
    if (isEnabled && availableVoices.length === 0) {
      // Load available voices from API
      // This would be replaced with actual API call
      setAvailableVoices([
        { id: 'voice_1', name: 'Voice 1', description: 'Natural male voice' },
        { id: 'voice_2', name: 'Voice 2', description: 'Natural female voice' },
      ])
    }
  }, [isEnabled])

  if (!isAvailable) return null

  const handlePress = () => {
    if (!isPremium) {
      onShowUpgrade?.()
      return
    }

    // Disable subtitles before enabling dubbing (mutual exclusivity)
    if (!isEnabled && onDisableSubtitles) {
      logger.debug('Disabling subtitles for mutual exclusivity', 'DubbingControls', {})
      onDisableSubtitles()
      setShowOnboarding(true)
      return
    }

    onToggle()
  }

  return (
    <>
      <View style={styles.container}>
        {/* Main Toggle Button */}
        <GlassLiveControlButton
          icon={
            <MessageSquare
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

        {/* Language Selector (only when enabled) */}
        {isEnabled && availableLanguages.length > 0 && (
          <View style={styles.languageSelector}>
            <Languages size={14} color={colors.textSecondary} />
            {availableLanguages.map((lang) => (
              <GlassButton
                key={lang}
                title={t(`dubbing.languages.${lang}`, lang.toUpperCase())}
                variant={targetLanguage === lang ? 'primary' : 'ghost'}
                size="sm"
                onPress={() => onLanguageChange(lang)}
                accessibilityLabel={t(`dubbing.languages.${lang}`, lang.toUpperCase())}
                accessibilityHint={t('dubbing.tapToSelect', 'Tap to select this language')}
                style={styles.langButton}
              />
            ))}
          </View>
        )}

        {/* Volume and Voice Controls (only when enabled) */}
        {isEnabled && (
          <View style={styles.controlButtons}>
            <GlassButton
              title="🔊"
              variant="ghost"
              size="sm"
              onPress={() => setShowVolumePanel(!showVolumePanel)}
              accessibilityLabel={t('dubbing.adjustVolume', 'Adjust Volume')}
              style={styles.iconButton}
            />
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

      {/* Volume Panel */}
      {isEnabled && showVolumePanel && (
        <View style={styles.volumePanel}>
          <View style={styles.volumeControl}>
            <Text style={styles.volumeLabel}>{t('dubbing.originalAudio', 'Original Audio')}</Text>
            <GlassSlider
              value={originalVolume}
              min={0}
              max={1}
              step={0.1}
              onValueChange={(value) => {
                setOriginalVolume(value)
                onOriginalVolumeChange?.(value)
              }}
              accessibilityLabel={t('dubbing.originalAudio', 'Original Audio')}
              style={styles.slider}
            />
            <Text style={styles.volumeValue}>{Math.round(originalVolume * 100)}%</Text>
          </View>

          <View style={styles.volumeControl}>
            <Text style={styles.volumeLabel}>{t('dubbing.dubbedAudio', 'Dubbed Audio')}</Text>
            <GlassSlider
              value={dubbedVolume}
              min={0}
              max={1}
              step={0.1}
              onValueChange={(value) => {
                setDubbedVolume(value)
                onDubbedVolumeChange?.(value)
              }}
              accessibilityLabel={t('dubbing.dubbedAudio', 'Dubbed Audio')}
              style={styles.slider}
            />
            <Text style={styles.volumeValue}>{Math.round(dubbedVolume * 100)}%</Text>
          </View>
        </View>
      )}

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
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  langButton: {
    minWidth: isTV ? 120 : 80,
  },
  controlButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
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
  volumePanel: {
    position: 'absolute',
    bottom: 60,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    minWidth: isTV ? 400 : 280,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  volumeControl: {
    marginBottom: spacing.md,
  },
  volumeLabel: {
    color: colors.text,
    fontSize: isTV ? 16 : 14,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  slider: {
    height: isTV ? 60 : 40,
    marginVertical: spacing.sm,
  },
  volumeValue: {
    color: colors.textSecondary,
    fontSize: isTV ? 14 : 12,
    textAlign: 'right',
  },
})
