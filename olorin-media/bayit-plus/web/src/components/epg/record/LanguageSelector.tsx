/**
 * Language selector component for subtitle language selection
 * @module epg/record/LanguageSelector
 */

import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { useDirection } from '@/hooks/useDirection'
import { AVAILABLE_LANGUAGES, LanguageOption } from './types'

/**
 * Props schema
 */
const LanguageSelectorPropsSchema = z.object({
  selectedLanguage: z.string().min(2).max(5),
  onLanguageChange: z.function().args(z.string()).returns(z.void()),
})

type LanguageSelectorProps = z.infer<typeof LanguageSelectorPropsSchema>

/**
 * Language selector component
 */
const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageChange,
}) => {
  const { t } = useTranslation()
  const { textAlign } = useDirection()

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { textAlign }]}>
        {t('epg.subtitleLanguage')}
      </Text>

      <View style={styles.grid}>
        {AVAILABLE_LANGUAGES.map((lang: LanguageOption) => {
          const isSelected = selectedLanguage === lang.code

          return (
            <Pressable
              key={lang.code}
              style={[
                styles.languageButton,
                isSelected && styles.languageButtonSelected,
              ]}
              onPress={() => onLanguageChange(lang.code)}
            >
              <Text style={styles.flag}>{lang.flag}</Text>
              <Text style={[
                styles.languageText,
                isSelected && styles.languageTextSelected,
              ]}>
                {lang.label}
              </Text>
              {isSelected && <Check size={16} color="#a855f7" />}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minWidth: '45%',
    flex: 1,
  },
  languageButtonSelected: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#a855f7',
  },
  flag: {
    fontSize: 18,
  },
  languageText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.6)',
    flex: 1,
  },
  languageTextSelected: {
    color: '#ffffff',
  },
})

export default LanguageSelector
