/**
 * SubtitleLanguageMenu Component
 * Menu for selecting subtitle language with flag preview and list
 */

import { View, Text, Pressable, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { z } from 'zod'
import { GlassView } from '@bayit/shared/ui'
import { platformClass, platformStyle } from '@/utils/platformClass'
import SubtitleFlagsPreview from './SubtitleFlagsPreview'
import SubtitleLanguageList from './SubtitleLanguageList'

// Zod schema for props
const SubtitleLanguageMenuPropsSchema = z.object({
  availableLanguages: z.array(z.any()),
  currentLanguage: z.string().nullable(),
  enabled: z.boolean(),
  isLoading: z.boolean(),
  onLanguageSelect: z.function().args(z.string()).returns(z.void()),
  onDisable: z.function().args().returns(z.void()),
  onClose: z.function().args().returns(z.void()),
})

export type SubtitleLanguageMenuProps = z.infer<typeof SubtitleLanguageMenuPropsSchema>

interface SubtitleLanguageMenuWithChildrenProps extends SubtitleLanguageMenuProps {
  children?: React.ReactNode
}

export default function SubtitleLanguageMenu({
  availableLanguages,
  currentLanguage,
  enabled,
  isLoading,
  onLanguageSelect,
  onDisable,
  onClose,
  children,
}: SubtitleLanguageMenuWithChildrenProps) {
  const { t } = useTranslation()

  // Validate props in development
  if (process.env.NODE_ENV === 'development') {
    SubtitleLanguageMenuPropsSchema.parse({
      availableLanguages,
      currentLanguage,
      enabled,
      isLoading,
      onLanguageSelect,
      onDisable,
      onClose,
    })
  }

  const stopPropagation = (e: any) => {
    e.stopPropagation()
    e.preventDefault()
  }

  const handleClosePress = (e: any) => {
    e?.stopPropagation?.()
    onClose()
  }

  return (
    <GlassView
      className={platformClass(
        'absolute bottom-20 right-4 w-80 max-h-[500px] rounded-xl z-[200]'
      )}
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
      style={platformStyle({
        web: { pointerEvents: 'auto' },
        native: {},
      })}
    >
      {/* Header */}
      <View className="flex-row justify-between items-center p-4 border-b border-white/10">
        <Text className="text-white text-base font-semibold">
          {t('subtitles.selectLanguage')}
        </Text>
        <Pressable
          onPress={handleClosePress}
          onClick={stopPropagation}
          onMouseDown={stopPropagation}
          className={platformClass('p-2 hover:bg-white/10 rounded', 'p-2 rounded')}
        >
          <X size={20} color="#ffffff" />
        </Pressable>
      </View>

      {/* Flags Preview */}
      <SubtitleFlagsPreview
        availableLanguages={availableLanguages}
        currentLanguage={currentLanguage}
        enabled={enabled}
        onLanguageSelect={onLanguageSelect}
      />

      {/* Language List */}
      <ScrollView className="p-4 max-h-[440px]" style={{ gap: 4 }}>
        <SubtitleLanguageList
          availableLanguages={availableLanguages}
          currentLanguage={currentLanguage}
          enabled={enabled}
          isLoading={isLoading}
          onLanguageSelect={onLanguageSelect}
          onDisable={onDisable}
        />

        {/* Download section (passed as children) */}
        {children}
      </ScrollView>
    </GlassView>
  )
}
