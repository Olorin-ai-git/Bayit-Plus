import { useEffect } from 'react'
import { useNavigation } from '@react-navigation/native'
import { deepLinkingService, DeepLinkRoute } from '../services/deepLinking'
import { log } from '@bayit/shared-services/logger.native'

export function useDeepLinking() {
  const navigation = useNavigation()

  useEffect(() => {
    const handleDeepLink = (route: DeepLinkRoute) => {
      log.info('Navigating to deep link route', { route })

      try {
        navigation.navigate(route.screen as never, route.params as never)
      } catch (error: unknown) {
        log.error('Failed to navigate to deep link route', { route, error })
      }
    }

    deepLinkingService.initialize()
    const unsubscribe = deepLinkingService.addListener(handleDeepLink)

    return () => {
      unsubscribe()
      deepLinkingService.cleanup()
    }
  }, [navigation])
}
