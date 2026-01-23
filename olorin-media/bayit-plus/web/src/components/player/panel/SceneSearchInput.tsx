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

interface SceneSearchInputProps {
  value: string
  isRTL: boolean
  onChangeText: (text: string) => void
  onSubmit: () => void
  onVoiceResult: (transcript: string) => void
}

const SceneSearchInput = forwardRef<any, SceneSearchInputProps>(
  ({ value, isRTL, onChangeText, onSubmit, onVoiceResult }, ref) => {
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
          style={styles.input}
          testID="scene-search-input"
          accessibilityLabel={t('player.sceneSearch.inputLabel')}
        />
        <VoiceSearchButton onResult={onVoiceResult} testID="scene-search-voice-button" />
      </View>
    )
  }
)

SceneSearchInput.displayName = 'SceneSearchInput'

export default SceneSearchInput
