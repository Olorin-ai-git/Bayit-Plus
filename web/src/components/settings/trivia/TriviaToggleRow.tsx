/**
 * TriviaToggleRow Component
 * Toggle switch for enabling/disabling trivia using Glass design system
 */

import React from 'react'
import { View, Text, Platform } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassToggle } from '@bayit/shared/components/ui/GlassToggle'
import { triviaSettingsStyles as styles, getTvStyles } from './triviaSettingsStyles'

interface TriviaToggleRowProps {
  enabled: boolean
  isLoading: boolean
  isHebrew: boolean
  onToggle: () => void
}

export function TriviaToggleRow({
  enabled,
  isLoading,
  isHebrew,
  onToggle,
}: TriviaToggleRowProps) {
  const { t } = useTranslation()
  const isTV = Platform.isTV || Platform.OS === 'tvos'
  const tvStyles = getTvStyles(isTV)

  return (
    <View
      style={[styles.settingRow, isHebrew && styles.settingRowRTL]}
      accessible={true}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled, disabled: isLoading }}
      accessibilityLabel={t('trivia.settings.enabled')}
      accessibilityHint={t('trivia.settings.enabledDescription')}
    >
      <View style={styles.settingInfo}>
        <Text
          style={[
            styles.settingLabel,
            isHebrew && styles.textRTL,
            tvStyles.text,
          ]}
        >
          {t('trivia.settings.enabled')}
        </Text>
        <Text
          style={[
            styles.settingDescription,
            isHebrew && styles.textRTL,
            tvStyles.smallText,
          ]}
        >
          {t('trivia.settings.enabledDescription')}
        </Text>
      </View>
      <GlassToggle
        value={enabled}
        onValueChange={onToggle}
        disabled={isLoading}
        isRTL={isHebrew}
        size={isTV ? 'medium' : 'small'}
      />
    </View>
  )
}

export default TriviaToggleRow
