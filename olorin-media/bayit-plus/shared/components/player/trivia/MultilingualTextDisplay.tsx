/**
 * MultilingualTextDisplay Component
 * Displays trivia fact text in current locale language only
 * Supports RTL (Hebrew) and LTR (English/Spanish) text direction
 */

import React from 'react'
import { View, Text, StyleSheet, Platform, TextStyle, ViewStyle } from 'react-native'
import { useTranslation } from 'react-i18next'
import { TriviaFact, getTriviaLanguageInfo } from '@bayit/shared-types/trivia'

interface MultilingualTextDisplayProps {
  fact: TriviaFact
  displayLanguages: string[]  // Deprecated - now uses current i18n language
  isTV?: boolean
}

interface LanguageVersion {
  langCode: string
  langInfo: {
    code: string
    name: string
    nativeName: string
    flag: string
    rtl: boolean
  }
  text: string
}

/**
 * Get text for a specific language from fact
 */
function getTextForLanguage(fact: TriviaFact, langCode: string): string | null {
  switch (langCode) {
    case 'he':
      return fact.text_he || fact.text
    case 'en':
      return fact.text_en || null
    case 'es':
      return fact.text_es || null
    default:
      return null
  }
}

export function MultilingualTextDisplay({
  fact,
  displayLanguages,
  isTV = false,
}: MultilingualTextDisplayProps) {
  const { i18n } = useTranslation()

  // Get current language from i18n
  const currentLang = i18n.language || 'he'

  // Get text and language info for current locale only
  const langInfo = getTriviaLanguageInfo(currentLang)
  const text = getTextForLanguage(fact, currentLang)

  // Fallback: Show fact.text (Hebrew) if current language not available
  if (!langInfo || !text) {
    return <Text style={styles.factText}>{fact.text}</Text>
  }

  // tvOS font size requirements
  const tvFontSize = isTV ? 32 : 14
  const tvLineHeight = isTV ? 42 : 20

  return (
    <View style={styles.multilingualContainer}>
      <View
        style={[
          styles.languageRow,
          langInfo.rtl && styles.languageRowRTL,
        ]}
        accessible={true}
        accessibilityLabel={`${langInfo.nativeName}: ${text}`}
        accessibilityRole="text"
      >
        <Text style={[styles.flagIcon, isTV && styles.flagIconTV]}>
          {langInfo.flag}
        </Text>
        <Text
          style={[
            styles.factText,
            langInfo.rtl && styles.factTextRTL,
            { fontSize: tvFontSize, lineHeight: tvLineHeight },
          ]}
          numberOfLines={2}
        >
          {text}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  multilingualContainer: {
    marginBottom: 8,
    gap: 6,
  } as ViewStyle,
  languageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  } as ViewStyle,
  languageRowRTL: {
    flexDirection: 'row-reverse',
  } as ViewStyle,
  flagIcon: {
    fontSize: 16,
    lineHeight: 20,
    marginTop: 2,
  } as TextStyle,
  flagIconTV: {
    fontSize: 24,
    lineHeight: 32,
    marginTop: 4,
  } as TextStyle,
  factText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  } as TextStyle,
  factTextRTL: {
    textAlign: 'right',
  } as TextStyle,
})

export default MultilingualTextDisplay
