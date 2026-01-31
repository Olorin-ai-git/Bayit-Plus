/**
 * FlagWithSparkle Component
 * Displays a language flag emoji with an optional sparkle overlay
 * for AI-enhanced subtitle tracks (nikud, shoresh, heblish, etc.)
 */

import { View, Text, StyleSheet } from 'react-native'
import { Sparkles } from 'lucide-react'
import { colors, borderRadius } from '@olorin/design-tokens'
import { GlassTooltip } from '@bayit/shared/ui'

// Language flag mapping
const LANGUAGE_FLAGS: Record<string, string> = {
  'he': '🇮🇱',
  'en': '🇺🇸',
  'ar': '🇸🇦',
  'ru': '🇷🇺',
  'es': '🇪🇸',
  'fr': '🇫🇷',
  'de': '🇩🇪',
  'it': '🇮🇹',
  'pt': '🇵🇹',
  'zh': '🇨🇳',
  'ja': '🇯🇵',
  'ko': '🇰🇷',
  'yi': '🕍',
}

// Language name mapping
const LANGUAGE_NAMES: Record<string, string> = {
  'he': 'Hebrew',
  'en': 'English',
  'ar': 'Arabic',
  'ru': 'Russian',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'yi': 'Yiddish',
}

export interface FlagWithSparkleProps {
  /** ISO 639-1 language code (e.g., "he", "en") */
  language: string
  /** Whether this language has AI-enhanced versions available */
  hasAI?: boolean
  /** Size of the flag emoji */
  size?: 'small' | 'medium' | 'large'
  /** Whether to show the tooltip */
  showTooltip?: boolean
  /** Custom tooltip text (overrides default) */
  tooltipText?: string
}

export function getLanguageFlag(language: string): string {
  return LANGUAGE_FLAGS[language] || '🌐'
}

export function getLanguageName(language: string): string {
  return LANGUAGE_NAMES[language] || language.toUpperCase()
}

const FLAG_SIZES = {
  small: 14,
  medium: 18,
  large: 24,
}

const SPARKLE_SIZES = {
  small: 6,
  medium: 8,
  large: 10,
}

export function FlagWithSparkle({
  language,
  hasAI = false,
  size = 'medium',
  showTooltip = true,
  tooltipText,
}: FlagWithSparkleProps) {
  const flag = getLanguageFlag(language)
  const name = getLanguageName(language)
  const tooltip = tooltipText || (hasAI ? `${name} (AI Enhanced)` : name)
  const fontSize = FLAG_SIZES[size]
  const sparkleSize = SPARKLE_SIZES[size]

  const content = (
    <View style={styles.container}>
      <Text style={[styles.flag, { fontSize }]}>{flag}</Text>
      {hasAI && (
        <View style={[styles.sparkleBadge, sparklePositions[size]]}>
          <Sparkles size={sparkleSize} color="#fff" />
        </View>
      )}
    </View>
  )

  if (showTooltip) {
    return (
      <GlassTooltip content={tooltip}>
        {content}
      </GlassTooltip>
    )
  }

  return content
}

const sparklePositions = StyleSheet.create({
  small: {
    bottom: -1,
    right: -3,
    padding: 1,
  },
  medium: {
    bottom: -2,
    right: -4,
    padding: 1,
  },
  large: {
    bottom: -2,
    right: -5,
    padding: 2,
  },
})

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginRight: 2,
  },
  flag: {
    lineHeight: 1.2,
  },
  sparkleBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(168, 85, 247, 0.9)',
    borderRadius: borderRadius.sm,
  },
})

export default FlagWithSparkle
