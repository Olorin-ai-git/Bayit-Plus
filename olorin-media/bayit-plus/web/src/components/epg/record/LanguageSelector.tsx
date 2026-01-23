/**
 * Language selector component for subtitle language selection
 * @module epg/record/LanguageSelector
 */

import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { platformClass } from '@/utils/platformClass'
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
    <View className={platformClass('mt-2')}>
      <Text
        className={platformClass('text-sm font-medium text-white/60 mb-2')}
        style={{ textAlign }}
      >
        {t('epg.subtitleLanguage')}
      </Text>

      {/* Language Grid */}
      <View className={platformClass('flex flex-row flex-wrap gap-2')}>
        {AVAILABLE_LANGUAGES.map((lang: LanguageOption) => {
          const isSelected = selectedLanguage === lang.code

          return (
            <Pressable
              key={lang.code}
              className={platformClass(
                `flex flex-row items-center gap-2 px-4 py-2 rounded-xl border min-w-[45%] flex-1 ${
                  isSelected
                    ? 'bg-purple-500/15 border-purple-500'
                    : 'bg-white/5 border-white/10'
                }`,
                `flex flex-row items-center gap-2 px-4 py-2 rounded-xl border min-w-[45%] flex-1 ${
                  isSelected
                    ? 'bg-purple-500/15 border-purple-500'
                    : 'bg-white/5 border-white/10'
                }`
              )}
              onPress={() => onLanguageChange(lang.code)}
            >
              <Text className={platformClass('text-lg')}>{lang.flag}</Text>
              <Text
                className={platformClass(
                  `text-sm font-medium flex-1 ${
                    isSelected ? 'text-white' : 'text-white/60'
                  }`
                )}
              >
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

export default LanguageSelector
