/**
 * LanguageSelector Component
 * Language selection for live subtitle translation
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'

// Validation schema
export const LanguageSelectorPropsSchema = z.object({
  availableLanguages: z.array(z.string()),
  currentLanguage: z.string(),
  onLanguageChange: z.function().args(z.string()).returns(z.void()),
})

export type LanguageSelectorProps = z.infer<typeof LanguageSelectorPropsSchema>

// Language metadata mapping
const langMap: Record<string, { flag: string; label: string }> = {
  'he': { flag: '🇮🇱', label: 'עברית' },
  'en': { flag: '🇺🇸', label: 'English' },
  'ar': { flag: '🇸🇦', label: 'العربية' },
  'es': { flag: '🇪🇸', label: 'Español' },
  'ru': { flag: '🇷🇺', label: 'Русский' },
  'fr': { flag: '🇫🇷', label: 'Français' },
  'de': { flag: '🇩🇪', label: 'Deutsch' },
  'it': { flag: '🇮🇹', label: 'Italiano' },
  'pt': { flag: '🇵🇹', label: 'Português' },
  'yi': { flag: '🕍', label: 'ייִדיש' },
}

export default function LanguageSelector({
  availableLanguages,
  currentLanguage,
  onLanguageChange,
}: LanguageSelectorProps) {
  const { t } = useTranslation()

  if (availableLanguages.length === 0) return null

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {t('subtitles.translateTo', 'Translate To')}
      </Text>
      <View style={styles.languageList}>
        {availableLanguages.map((langCode) => {
          const lang = langMap[langCode] || { flag: '🌐', label: langCode.toUpperCase() }
          const isActive = currentLanguage === langCode

          return (
            <Pressable
              key={langCode}
              style={[
                styles.languageButton,
                isActive ? styles.languageActive : styles.languageInactive,
              ]}
              onPress={() => onLanguageChange(langCode)}
            >
              <View style={styles.languageContent}>
                <Text style={styles.flag}>{lang.flag}</Text>
                <Text style={[styles.label, isActive ? styles.textActive : styles.textInactive]}>
                  {lang.label}
                </Text>
              </View>
              {isActive && <View style={styles.activeDot} />}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[6],
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing[2],
  },
  languageList: {
    gap: spacing[1],
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  languageActive: {
    borderColor: 'rgba(168, 85, 247, 0.5)',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  languageInactive: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    fontSize: 20,
    marginRight: spacing[3],
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  textActive: {
    color: '#c084fc',
    fontWeight: '600',
  },
  textInactive: {
    color: '#9ca3af',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    marginLeft: spacing[3],
  },
});
