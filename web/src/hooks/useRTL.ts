/**
 * useRTL Hook
 * Provides RTL (Right-to-Left) support for components
 */

import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import {
  isRTL,
  getTextDirection,
  getTextAlign,
  getTailwindTextAlign,
  getTailwindFlexDirection,
} from '../utils/rtl'

export function useRTL() {
  const { i18n } = useTranslation()
  const currentLanguage = i18n.language

  const isRTLLanguage = useMemo(() => isRTL(currentLanguage), [currentLanguage])

  const direction = useMemo(() => getTextDirection(currentLanguage), [currentLanguage])

  const textAlign = useMemo(() => getTextAlign(currentLanguage), [currentLanguage])

  const tailwindTextAlign = useMemo(() => getTailwindTextAlign(currentLanguage), [currentLanguage])

  const tailwindFlexDirection = useMemo(
    () => getTailwindFlexDirection(currentLanguage),
    [currentLanguage]
  )

  return {
    isRTL: isRTLLanguage,
    direction,
    textAlign,
    currentLanguage,
    tailwindTextAlign,
    tailwindFlexDirection,
  }
}
