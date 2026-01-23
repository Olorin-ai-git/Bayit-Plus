/**
 * DubbingControls Component
 * Premium feature for real-time audio dubbing of live streams
 * Uses GlassLiveControlButton for consistent styling
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MessageSquare, Languages } from 'lucide-react'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { isTV } from '@bayit/shared/utils/platform'
import { GlassLiveControlButton } from '../controls/GlassLiveControlButton'
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
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Español',
  ar: 'العربية',
  ru: 'Русский',
  fr: 'Français',
  de: 'Deutsch',
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
}: DubbingControlsProps) {
  const { t } = useTranslation()

  if (!isAvailable) return null

  const handlePress = () => {
    if (!isPremium) {
      onShowUpgrade?.()
      return
    }

    // Disable subtitles before enabling dubbing (mutual exclusivity)
    if (!isEnabled && onDisableSubtitles) {
      logger.debug('Disabling subtitles for mutual exclusivity', 'DubbingControls', {});
      onDisableSubtitles()
    }

    onToggle()
  }

  return (
    <View style={styles.container}>
      {/* Main Toggle Button */}
      <GlassLiveControlButton
        icon={
          <MessageSquare
            size={18}
            color={isEnabled ? colors.primary : colors.textSecondary}
          />
        }
        label={t('dubbing.liveDubbing', 'Live Dubbing')}
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
            <Pressable
              key={lang}
              onPress={() => onLanguageChange(lang)}
              style={({ hovered }) => [
                styles.langButton,
                targetLanguage === lang && styles.langButtonActive,
                hovered && styles.langButtonHovered,
              ]}
            >
              <Text
                style={[
                  styles.langText,
                  targetLanguage === lang && styles.langTextActive,
                ]}
              >
                {LANGUAGE_NAMES[lang] || lang.toUpperCase()}
              </Text>
            </Pressable>
          ))}
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
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  langButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  langButtonActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
  },
  langButtonHovered: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  langText: {
    color: colors.textSecondary,
    fontSize: isTV ? 14 : 12,
    fontWeight: '500',
  },
  langTextActive: {
    color: colors.text,
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
