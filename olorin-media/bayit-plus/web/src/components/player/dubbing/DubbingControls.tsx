/**
 * DubbingControls Component
 * Premium feature for real-time audio dubbing of live streams
 */

import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Languages, MessageSquare } from 'lucide-react'
import { colors } from '@bayit/shared/theme'

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
}: DubbingControlsProps) {
  const { t } = useTranslation()

  // Don't render if dubbing not available for this channel
  if (!isAvailable) return null

  const handlePress = () => {
    if (!isPremium) {
      onShowUpgrade?.()
      return
    }
    onToggle()
  }

  return (
    <View style={styles.container}>
      {/* Main Toggle Button */}
      <Pressable
        onPress={handlePress}
        style={[
          styles.button,
          isEnabled ? styles.buttonEnabled : !isPremium ? styles.buttonPremium : styles.buttonDefault,
        ]}
      >
        <MessageSquare
          size={20}
          color={isEnabled ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.buttonText, isEnabled ? styles.textEnabled : styles.textDisabled]}>
          {isPremium ? t('dubbing.liveDubbing', 'Live Dubbing') : '⭐ Premium'}
        </Text>
        {isConnecting && <ActivityIndicator size="small" color={colors.primary} />}
        {isEnabled && !isConnecting && <View style={styles.connectedDot} />}
      </Pressable>

      {/* Language Selector (only when enabled) */}
      {isEnabled && availableLanguages.length > 0 && (
        <View style={styles.languageSelector}>
          <Languages size={16} color={colors.textSecondary} />
          {availableLanguages.map((lang) => (
            <Pressable
              key={lang}
              onPress={() => onLanguageChange(lang)}
              style={[styles.langButton, targetLanguage === lang && styles.langButtonActive]}
            >
              <Text style={[styles.langText, targetLanguage === lang && styles.langTextActive]}>
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
    gap: 8,
    position: 'relative',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
  },
  buttonEnabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: '#9333ea',
  },
  buttonPremium: {
    borderColor: '#eab308',
  },
  buttonDefault: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textEnabled: {
    color: '#fff',
  },
  textDisabled: {
    color: '#9ca3af',
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  langButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  langButtonActive: {
    backgroundColor: 'rgba(147, 51, 234, 0.3)',
  },
  langText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  langTextActive: {
    color: '#fff',
  },
  latencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)',
  },
  latencyText: {
    color: '#93c5fd',
    fontSize: 11,
    fontWeight: '500',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 60,
    right: 0,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: 250,
  },
  errorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
})
