/**
 * SceneSearchInput Component
 * Search input row with voice button
 */

import { forwardRef } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { GlassInput } from '@bayit/shared/ui'
import { VoiceSearchButton } from '@bayit/shared/components/VoiceSearchButton'
import { sceneSearchStyles as styles } from './sceneSearchStyles'
import { PLATFORM_CONFIG } from './platformConfig'

interface SceneSearchInputProps {
  value: string
  isRTL: boolean
  onChangeText: (text: string) => void
  onSubmit: () => void
  onVoiceResult: (transcript: string) => void
  isOpen?: boolean
}

const SceneSearchInput = forwardRef<any, SceneSearchInputProps>(
  ({ value, isRTL, onChangeText, onSubmit, onVoiceResult, isOpen = false }, ref) => {
    const { t } = useTranslation()

    return (
      <View style={[styles.searchRow, isRTL && styles.searchRowRTL]} testID="scene-search-input-row">
        <GlassInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={t('player.sceneSearch.placeholder')}
          onSubmitEditing={onSubmit}
          returnKeyType="search"
          style={[styles.input, { fontSize: PLATFORM_CONFIG.input.fontSize }]}
          testID="scene-search-input"
          accessibilityLabel={t('player.sceneSearch.inputLabel')}
          autoCorrect={PLATFORM_CONFIG.input.autoCorrect}
          autoCapitalize={PLATFORM_CONFIG.input.autoCapitalize as any}
          keyboardType={PLATFORM_CONFIG.input.keyboardType}
        />
        <VoiceSearchButton
          onResult={onVoiceResult}
          testID="scene-search-voice-button"
          autoEnable={isOpen}
        />
      </View>
    )
  }
)

SceneSearchInput.displayName = 'SceneSearchInput'

export default SceneSearchInput
