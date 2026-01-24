/**
 * SubtitleLanguageMenu Component
 * Menu for selecting subtitle language with flag preview and list
 */

import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { z } from 'zod'
import { GlassView } from '@bayit/shared/ui'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
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
      style={styles.container}
      onClick={stopPropagation}
      onMouseDown={stopPropagation}
      onMouseUp={stopPropagation}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('subtitles.selectLanguage')}</Text>
        <Pressable
          onPress={handleClosePress}
          onClick={stopPropagation}
          onMouseDown={stopPropagation}
          style={styles.closeButton}
        >
          <X size={20} color={colors.text} />
        </Pressable>
      </View>

      <SubtitleFlagsPreview
        availableLanguages={availableLanguages}
        currentLanguage={currentLanguage}
        enabled={enabled}
        onLanguageSelect={onLanguageSelect}
      />

      <ScrollView style={styles.scrollView}>
        <SubtitleLanguageList
          availableLanguages={availableLanguages}
          currentLanguage={currentLanguage}
          enabled={enabled}
          isLoading={isLoading}
          onLanguageSelect={onLanguageSelect}
          onDisable={onDisable}
        />
        {children}
      </ScrollView>
    </GlassView>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    right: spacing[4],
    width: 320,
    maxHeight: 500,
    borderRadius: borderRadius.xl,
    zIndex: 200,
    pointerEvents: 'auto',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing[2],
    borderRadius: borderRadius.DEFAULT,
  },
  scrollView: {
    padding: spacing[4],
    maxHeight: 440,
    gap: spacing[1],
  },
});
