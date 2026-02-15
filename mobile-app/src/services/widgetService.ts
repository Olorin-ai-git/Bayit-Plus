import { Platform } from 'react-native'
import SharedGroupPreferences from 'react-native-shared-group-preferences'
import { log } from '@bayit/shared-services/logger.native'

const APP_GROUP_ID = 'group.tv.bayit.app'

interface ContinueWatchingItem {
  id: string
  title: string
  type: string
  coverUrl?: string
  duration: number
  position: number
}

class WidgetService {
  async shareAuthToken(token: string): Promise<void> {
    if (Platform.OS !== 'ios') return

    try {
      await SharedGroupPreferences.setItem('auth_token', token, APP_GROUP_ID)
      log.info('Widget: Auth token shared with widget')
    } catch (error: unknown) {
      log.error('Widget: Failed to share auth token', { error })
    }
  }

  async shareContinueWatching(items: ContinueWatchingItem[]): Promise<void> {
    if (Platform.OS !== 'ios') return

    try {
      const data = JSON.stringify(items.slice(0, 3)) // Limit to 3 items
      await SharedGroupPreferences.setItem('continue_watching', data, APP_GROUP_ID)
      log.info('Widget: Continue watching data shared', { count: items.length })

      // Request widget update
      this.requestWidgetUpdate()
    } catch (error: unknown) {
      log.error('Widget: Failed to share continue watching data', { error })
    }
  }

  async clearWidgetData(): Promise<void> {
    if (Platform.OS !== 'ios') return

    try {
      await SharedGroupPreferences.setItem('auth_token', '', APP_GROUP_ID)
      await SharedGroupPreferences.setItem('continue_watching', '[]', APP_GROUP_ID)
      log.info('Widget: Widget data cleared')
    } catch (error: unknown) {
      log.error('Widget: Failed to clear widget data', { error })
    }
  }

  private requestWidgetUpdate(): void {
    // This would require a native module to call WidgetCenter.shared.reloadAllTimelines()
    // For now, the widget will update on its own schedule (every 30 minutes)
    log.debug('Widget: Update requested (will refresh on next timeline)')
  }

  async updateContinueWatchingFromPlayback(
    contentId: string,
    title: string,
    type: 'movie' | 'series' | 'audiobook' | 'podcast',
    coverUrl: string | undefined,
    position: number,
    duration: number
  ): Promise<void> {
    if (Platform.OS !== 'ios') return

    try {
      // Get existing data
      const existingData = await SharedGroupPreferences.getItem('continue_watching', APP_GROUP_ID)
      let items: ContinueWatchingItem[] = existingData ? JSON.parse(existingData) : []

      // Remove if already exists
      items = items.filter(item => item.id !== contentId)

      // Add to beginning
      items.unshift({
        id: contentId,
        title,
        type,
        coverUrl,
        position,
        duration,
      })

      // Keep only top 3
      items = items.slice(0, 3)

      // Save back
      await this.shareContinueWatching(items)
    } catch (error: unknown) {
      log.error('Widget: Failed to update continue watching from playback', { error })
    }
  }
}

export const widgetService = new WidgetService()
