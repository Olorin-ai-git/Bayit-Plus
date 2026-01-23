/**
 * SceneSearchHeader Component
 * Header with title, result count, and close button
 */

import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { Search, X } from 'lucide-react'
import { colors } from '@bayit/shared/theme'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { isTV } from '@bayit/shared/utils/platform'
import { sceneSearchStyles as styles } from './sceneSearchStyles'

interface SceneSearchHeaderProps {
  resultCount: number
  isRTL: boolean
  onClose?: () => void
}

export default function SceneSearchHeader({
  resultCount,
  isRTL,
  onClose,
}: SceneSearchHeaderProps) {
  const { t } = useTranslation()
  const closeBtnFocus = useTVFocus({ styleType: 'button' })

  return (
    <View style={[styles.header, isRTL && styles.headerRTL]}>
      <View style={[styles.titleRow, isRTL && styles.titleRowRTL]}>
        <Search size={isTV ? 24 : 18} color={colors.primary} />
        <Text style={[styles.title, isTV && styles.titleTV]}>
          {t('player.sceneSearch.title')}
        </Text>
        {resultCount > 0 && (
          <Text style={[styles.resultCount, isTV && styles.resultCountTV]}>
            ({isRTL ? resultCount.toLocaleString('he-IL') : resultCount})
          </Text>
        )}
      </View>
      <Pressable
        onPress={onClose}
        onFocus={closeBtnFocus.handleFocus}
        onBlur={closeBtnFocus.handleBlur}
        style={[
          styles.closeButton,
          closeBtnFocus.isFocused && closeBtnFocus.focusStyle,
        ]}
        focusable={true}
        testID="scene-search-close-button"
        accessibilityRole="button"
        accessibilityLabel={t('common.close')}
      >
        <X size={isTV ? 24 : 18} color={colors.textSecondary} />
      </Pressable>
    </View>
  )
}
