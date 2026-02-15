import { I18nManager } from 'react-native'
import { log } from '@bayit/shared-services/logger.native'
import { storage } from './storage'

const RTL_LANGUAGES = ['he', 'ar']

export const rtlService = {
  async initialize(): Promise<void> {
    try {
      const language = await storage.getLanguage()
      const shouldBeRTL = RTL_LANGUAGES.includes(language)

      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.forceRTL(shouldBeRTL)
        log.info('RTL layout configured', { language, isRTL: shouldBeRTL })
      }
    } catch (error: unknown) {
      log.error('Failed to initialize RTL', { error })
    }
  },

  async setLanguage(language: string): Promise<boolean> {
    try {
      const shouldBeRTL = RTL_LANGUAGES.includes(language)
      const needsRestart = I18nManager.isRTL !== shouldBeRTL

      await storage.setLanguage(language)

      if (needsRestart) {
        I18nManager.forceRTL(shouldBeRTL)
        log.info('RTL layout changed, restart required', {
          language,
          isRTL: shouldBeRTL,
        })
      }

      return needsRestart
    } catch (error: unknown) {
      log.error('Failed to set language', { error })
      return false
    }
  },

  isRTL(): boolean {
    return I18nManager.isRTL
  },

  isRTLLanguage(language: string): boolean {
    return RTL_LANGUAGES.includes(language)
  },
}
