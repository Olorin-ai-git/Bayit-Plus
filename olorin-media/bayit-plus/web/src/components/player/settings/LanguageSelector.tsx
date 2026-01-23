/**
 * LanguageSelector Component
 * Language selection for live subtitle translation
 */

import { View, Text, Pressable, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { colors } from '@bayit/shared/theme'

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
    <View className="mb-6">
      <Text className="text-sm font-semibold text-white mb-2">
        {t('subtitles.translateTo', 'Translate To')}
      </Text>
      <View className="gap-1">
        {availableLanguages.map((langCode) => {
          const lang = langMap[langCode] || { flag: '🌐', label: langCode.toUpperCase() }
          const isActive = currentLanguage === langCode

          return (
            <Pressable
              key={langCode}
              className="flex-row items-center justify-between p-4 rounded-xl border"
              style={[isActive ? styles.languageActive : styles.languageInactive]}
              onPress={() => onLanguageChange(langCode)}
            >
              <View className="flex-row items-center flex-1">
                <Text className="text-xl mr-3">{lang.flag}</Text>
                <Text
                  className="text-sm font-medium"
                  style={[isActive ? styles.textActive : styles.textInactive]}
                >
                  {lang.label}
                </Text>
              </View>
              {isActive && (
                <View
                  className="w-2 h-2 rounded-full ml-3"
                  style={{ backgroundColor: colors.primary }}
                />
              )}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  languageActive: {
    borderColor: 'rgba(168, 85, 247, 0.5)',
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
  },
  languageInactive: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  textActive: {
    color: '#c084fc',
    fontWeight: '600',
  },
  textInactive: {
    color: '#9ca3af',
  },
});
