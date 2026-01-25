/**
 * SceneSearchNavigation Component
 * Navigation footer with prev/next buttons and counter
 */

import { View, Text, Pressable } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { colors } from '@olorin/design-tokens'
import { useTVFocus } from '@bayit/shared/components/hooks/useTVFocus'
import { isTV } from '@bayit/shared/utils/platform'
import { sceneSearchStyles as styles } from './sceneSearchStyles'

interface SceneSearchNavigationProps {
  currentIndex: number
  totalResults: number
  isRTL: boolean
  onPrevious: () => void
  onNext: () => void
}

export default function SceneSearchNavigation({
  currentIndex,
  totalResults,
  isRTL,
  onPrevious,
  onNext,
}: SceneSearchNavigationProps) {
  const { t } = useTranslation()
  const prevBtnFocus = useTVFocus({ styleType: 'button' })
  const nextBtnFocus = useTVFocus({ styleType: 'button' })

  const iconSize = isTV ? 28 : 20
  const isFirst = currentIndex === 0
  const isLast = currentIndex === totalResults - 1

  return (
    <View
      style={[styles.navRow, isRTL && styles.navRowRTL]}
      testID="nav-row"
      accessibilityRole="navigation"
      accessibilityLabel={t('player.sceneSearch.navigation')}
    >
      <Pressable
        onPress={onPrevious}
        onFocus={prevBtnFocus.handleFocus}
        onBlur={prevBtnFocus.handleBlur}
        disabled={isFirst}
        focusable={true}
        testID="scene-search-prev-button"
        style={[
          styles.navButton,
          isFirst && styles.navButtonDisabled,
          isRTL && styles.navButtonRTL,
          prevBtnFocus.isFocused && prevBtnFocus.focusStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('player.sceneSearch.previous')}
        accessibilityState={{ disabled: isFirst }}
      >
        {isRTL ? (
          <>
            <Text style={[styles.navText, isTV && styles.navTextTV]}>
              {t('player.sceneSearch.previous')}
            </Text>
            <ChevronRight size={iconSize} color={colors.text} />
          </>
        ) : (
          <>
            <ChevronLeft size={iconSize} color={colors.text} />
            <Text style={[styles.navText, isTV && styles.navTextTV]}>
              {t('player.sceneSearch.previous')}
            </Text>
          </>
        )}
      </Pressable>

      <Text
        style={[styles.navCounter, isTV && styles.navCounterTV]}
        accessibilityLabel={t('player.sceneSearch.position', {
          current: currentIndex + 1,
          total: totalResults,
        })}
      >
        {isRTL
          ? `${totalResults.toLocaleString('he-IL')} / ${(currentIndex + 1).toLocaleString('he-IL')}`
          : `${currentIndex + 1} / ${totalResults}`}
      </Text>

      <Pressable
        onPress={onNext}
        onFocus={nextBtnFocus.handleFocus}
        onBlur={nextBtnFocus.handleBlur}
        disabled={isLast}
        focusable={true}
        testID="scene-search-next-button"
        style={[
          styles.navButton,
          isLast && styles.navButtonDisabled,
          isRTL && styles.navButtonRTL,
          nextBtnFocus.isFocused && nextBtnFocus.focusStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('player.sceneSearch.next')}
        accessibilityState={{ disabled: isLast }}
      >
        {isRTL ? (
          <>
            <ChevronLeft size={iconSize} color={colors.text} />
            <Text style={[styles.navText, isTV && styles.navTextTV]}>
              {t('player.sceneSearch.next')}
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.navText, isTV && styles.navTextTV]}>
              {t('player.sceneSearch.next')}
            </Text>
            <ChevronRight size={iconSize} color={colors.text} />
          </>
        )}
      </Pressable>
    </View>
  )
}
