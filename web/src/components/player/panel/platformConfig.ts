import { Dimensions, Platform } from 'react-native'
import { isTV, isMobile, isWeb, isIOS, isAndroid } from '@bayit/shared/utils/platform'

const { width, height } = Dimensions.get('window')

export const isTablet = isMobile && Math.min(width, height) >= 600
export const isPhone = isMobile && !isTablet

export const PLATFORM_CONFIG = {
  panel: {
    width: isTV ? 400 : isTablet ? 360 : isPhone ? 280 : 320,
    slideDistance: isTV ? 400 : isTablet ? 360 : isPhone ? 280 : 320,
  },
  touchTargets: {
    minHeight: isPhone ? 48 : isTablet ? 44 : 40,
    minWidth: isPhone ? 48 : isTablet ? 44 : 40,
    iconSize: isPhone ? 24 : isTablet ? 20 : 18,
  },
  animations: {
    springConfig: isIOS
      ? { friction: 10, tension: 50, useNativeDriver: true }
      : { friction: 8, tension: 40, useNativeDriver: true },
    duration: isMobile ? 250 : 300,
  },
  input: {
    fontSize: isPhone ? 16 : 14,
    keyboardType: Platform.select({
      ios: 'default',
      android: 'default',
      default: undefined,
    }) as any,
    autoCorrect: isMobile,
    autoCapitalize: isMobile ? 'sentences' : 'none',
  },
  list: {
    removeClippedSubviews: Platform.OS !== 'web',
    maxToRenderPerBatch: isPhone ? 5 : 10,
    initialNumToRender: isPhone ? 5 : 10,
    windowSize: isPhone ? 3 : 5,
  },
  accessibility: {
    announceDelay: isIOS ? 100 : 200,
    hapticFeedback: isMobile,
  },
  gestures: {
    swipeToClose: isMobile,
    swipeThreshold: 50,
  },
}
