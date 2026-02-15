import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging'
import { Platform, PermissionsAndroid } from 'react-native'
import { log } from '@bayit/shared-services/logger.native'
import { storage } from './storage'

export interface NotificationPayload {
  title: string
  body: string
  data?: Record<string, string>
  image?: string
  channelId?: string
}

export interface RemoteMessage extends FirebaseMessagingTypes.RemoteMessage {}

type NotificationHandler = (message: RemoteMessage) => void
type TokenRefreshHandler = (token: string) => void

class PushNotificationService {
  private foregroundHandler: NotificationHandler | null = null
  private backgroundHandler: NotificationHandler | null = null
  private tokenRefreshHandler: TokenRefreshHandler | null = null
  private fcmToken: string | null = null

  async initialize(): Promise<void> {
    try {
      const authStatus = await this.requestPermission()

      if (authStatus === messaging.AuthorizationStatus.AUTHORIZED) {
        await this.setupNotifications()
        log.info('Push notifications initialized successfully')
      } else {
        log.warn('Push notification permission denied', { authStatus })
      }
    } catch (error: unknown) {
      log.error('Failed to initialize push notifications', { error })
    }
  }

  private async requestPermission(): Promise<number> {
    if (Platform.OS === 'android') {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        )
        return granted === PermissionsAndroid.RESULTS.GRANTED
          ? messaging.AuthorizationStatus.AUTHORIZED
          : messaging.AuthorizationStatus.DENIED
      }
      return messaging.AuthorizationStatus.AUTHORIZED
    }

    const authStatus = await messaging().requestPermission()
    return authStatus
  }

  private async setupNotifications(): Promise<void> {
    this.fcmToken = await messaging().getToken()
    log.info('FCM token obtained', { token: this.fcmToken })

    await storage.setItem('fcm_token', this.fcmToken)

    messaging().onTokenRefresh(async (token: string) => {
      log.info('FCM token refreshed', { token })
      this.fcmToken = token
      await storage.setItem('fcm_token', token)

      if (this.tokenRefreshHandler) {
        this.tokenRefreshHandler(token)
      }
    })

    messaging().onMessage(async (message: RemoteMessage) => {
      log.info('Foreground notification received', { message })

      if (this.foregroundHandler) {
        this.foregroundHandler(message)
      }
    })

    messaging().setBackgroundMessageHandler(async (message: RemoteMessage) => {
      log.info('Background notification received', { message })

      if (this.backgroundHandler) {
        this.backgroundHandler(message)
      }
    })
  }

  onForegroundMessage(handler: NotificationHandler): void {
    this.foregroundHandler = handler
  }

  onBackgroundMessage(handler: NotificationHandler): void {
    this.backgroundHandler = handler
  }

  onTokenRefresh(handler: TokenRefreshHandler): void {
    this.tokenRefreshHandler = handler
  }

  async getToken(): Promise<string | null> {
    if (this.fcmToken) {
      return this.fcmToken
    }

    try {
      this.fcmToken = await messaging().getToken()
      return this.fcmToken
    } catch (error: unknown) {
      log.error('Failed to get FCM token', { error })
      return null
    }
  }

  async subscribeToTopic(topic: string): Promise<void> {
    try {
      await messaging().subscribeToTopic(topic)
      log.info('Subscribed to topic', { topic })
    } catch (error: unknown) {
      log.error('Failed to subscribe to topic', { topic, error })
    }
  }

  async unsubscribeFromTopic(topic: string): Promise<void> {
    try {
      await messaging().unsubscribeFromTopic(topic)
      log.info('Unsubscribed from topic', { topic })
    } catch (error: unknown) {
      log.error('Failed to unsubscribe from topic', { topic, error })
    }
  }

  async setBadgeCount(count: number): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await messaging().setApplicationBadge(count)
      }
    } catch (error: unknown) {
      log.error('Failed to set badge count', { count, error })
    }
  }

  async deleteToken(): Promise<void> {
    try {
      await messaging().deleteToken()
      this.fcmToken = null
      await storage.removeItem('fcm_token')
      log.info('FCM token deleted')
    } catch (error: unknown) {
      log.error('Failed to delete FCM token', { error })
    }
  }

  async getInitialNotification(): Promise<RemoteMessage | null> {
    try {
      const message = await messaging().getInitialNotification()
      if (message) {
        log.info('App opened from notification', { message })
      }
      return message
    } catch (error: unknown) {
      log.error('Failed to get initial notification', { error })
      return null
    }
  }

  cleanup(): void {
    this.foregroundHandler = null
    this.backgroundHandler = null
    this.tokenRefreshHandler = null
  }
}

export const pushNotificationService = new PushNotificationService()
