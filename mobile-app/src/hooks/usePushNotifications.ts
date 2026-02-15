import { useEffect, useState } from 'react'
import { Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { pushNotificationService, RemoteMessage } from '../services/pushNotifications'
import { log } from '@bayit/shared-services/logger.native'

export function usePushNotifications() {
  const navigation = useNavigation()
  const [token, setToken] = useState<string | null>(null)
  const [initialNotification, setInitialNotification] = useState<RemoteMessage | null>(null)

  useEffect(() => {
    const initializePushNotifications = async () => {
      await pushNotificationService.initialize()

      const fcmToken = await pushNotificationService.getToken()
      setToken(fcmToken)

      const message = await pushNotificationService.getInitialNotification()
      if (message) {
        setInitialNotification(message)
        handleNotificationNavigation(message)
      }

      pushNotificationService.onForegroundMessage((message: RemoteMessage) => {
        log.info('Foreground notification received', { message })

        if (message.notification) {
          Alert.alert(
            message.notification.title || 'Bayit+',
            message.notification.body || '',
            [
              { text: 'Dismiss', style: 'cancel' },
              {
                text: 'View',
                onPress: () => handleNotificationNavigation(message),
              },
            ]
          )
        }
      })

      pushNotificationService.onBackgroundMessage((message: RemoteMessage) => {
        log.info('Background notification handled', { message })
        handleNotificationNavigation(message)
      })

      pushNotificationService.onTokenRefresh((newToken: string) => {
        log.info('FCM token refreshed', { newToken })
        setToken(newToken)
      })
    }

    initializePushNotifications()

    return () => {
      pushNotificationService.cleanup()
    }
  }, [navigation])

  const handleNotificationNavigation = (message: RemoteMessage) => {
    if (!message.data) return

    const { type, id, screen } = message.data

    try {
      if (screen) {
        navigation.navigate(screen as never, { id } as never)
        return
      }

      switch (type) {
        case 'movie':
          navigation.navigate('MovieDetail' as never, { movieId: id } as never)
          break
        case 'series':
          navigation.navigate('SeriesDetail' as never, { seriesId: id } as never)
          break
        case 'audiobook':
          navigation.navigate('AudiobookDetail' as never, { audiobookId: id } as never)
          break
        case 'podcast':
          navigation.navigate('PodcastDetail' as never, { podcastId: id } as never)
          break
        case 'live':
          navigation.navigate('LiveTV' as never, { channelId: id } as never)
          break
        case 'epg':
          navigation.navigate('EPG' as never, { channelId: id } as never)
          break
        case 'beta500':
          navigation.navigate('Beta500' as never)
          break
        default:
          log.warn('Unknown notification type', { type })
      }
    } catch (error: unknown) {
      log.error('Failed to navigate from notification', { message, error })
    }
  }

  const subscribeToTopic = async (topic: string) => {
    await pushNotificationService.subscribeToTopic(topic)
  }

  const unsubscribeFromTopic = async (topic: string) => {
    await pushNotificationService.unsubscribeFromTopic(topic)
  }

  const setBadgeCount = async (count: number) => {
    await pushNotificationService.setBadgeCount(count)
  }

  return {
    token,
    initialNotification,
    subscribeToTopic,
    unsubscribeFromTopic,
    setBadgeCount,
  }
}
