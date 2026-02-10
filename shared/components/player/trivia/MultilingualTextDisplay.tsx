/**
 * MultilingualTextDisplay Component
 * Displays trivia fact text in selected subtitle language
 * Supports RTL (Hebrew) and LTR (English/Spanish) text direction
 *
 * NEW: Syncs with subtitle track selection instead of app locale
 */

import React from 'react'
import { View, Text, StyleSheet, Platform, TextStyle, ViewStyle } from 'react-native'
import { useTranslation } from 'react-i18next'
import { TriviaFact, getTriviaLanguageInfo } from '@bayit/shared-types/trivia'

interface MultilingualTextDisplayProps {
  fact: TriviaFact
  displayLanguages: string[]  // Deprecated - now uses currentSubtitleLang
  currentSubtitleLang?: string  // NEW: Current subtitle language (e.g., 'en', 'he', 'es')
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
 * Get text for a specific language from fact.
 *
 * NEW: Supports new translations dictionary with fallback to legacy fields.
 * Priority:
 * 1. translations[langCode] (new schema)
 * 2. text_* legacy fields (old schema)
 * 3. text field if langCode matches source_language
 * 4. text field as fallback (English source)
 */
function getTextForLanguage(fact: TriviaFact, langCode: string): string | null {
  // NEW SCHEMA: Check translations dictionary first
  if (fact.translations && fact.translations[langCode]) {
    return fact.translations[langCode]
  }

  // If requesting source language, return source text
  if (fact.source_language && langCode === fact.source_language) {
    return fact.text
  }

  // LEGACY SCHEMA: Fallback to text_* fields
  switch (langCode) {
    case 'he':
      return fact.text_he || (fact.source_language === 'he' ? fact.text : null)
    case 'en':
      return fact.text_en || (fact.source_language === 'en' ? fact.text : null)
    case 'es':
      return fact.text_es || null
    default:
      return null
  }
}

export function MultilingualTextDisplay({
  fact,
  displayLanguages,
  currentSubtitleLang,
  isTV = false,
}: MultilingualTextDisplayProps) {
  const { i18n } = useTranslation()

  // NEW: Use subtitle language if provided, otherwise fall back to app locale
  const currentLang = currentSubtitleLang || i18n.language || 'en'

  // Get text and language info for subtitle language
  const langInfo = getTriviaLanguageInfo(currentLang) || { rtl: false, nativeName: currentLang, flag: '' }
  let text = getTextForLanguage(fact, currentLang)

  // Fallback chain: requested lang → English → fact.text
  if (!text) {
    // Try English as fallback
    text = getTextForLanguage(fact, 'en')
    if (!text) {
      // Final fallback: use fact.text (English source or legacy Hebrew)
      text = fact.text
    }
  }

  // Safety: If still no text, don't render
  if (!text) {
    return null
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
