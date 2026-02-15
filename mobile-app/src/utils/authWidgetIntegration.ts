/**
 * Authentication Widget Integration
 * Handles sharing auth tokens and clearing widget data on auth state changes
 */

import { Platform } from 'react-native'
import { widgetService } from '../services/widgetService'
import { storage } from '../services/storage'
import { log } from '@bayit/shared-services/logger.native'

/**
 * Handle successful authentication
 * Shares auth token with widget for API requests
 */
export async function handleAuthSuccess(token: string): Promise<void> {
  if (Platform.OS !== 'ios') return

  try {
    // Share token with widget via App Groups
    await widgetService.shareAuthToken(token)

    // Also fetch and share initial continue watching data
    await syncContinueWatchingToWidget(token)

    log.info('Auth widget integration: Token shared successfully')
  } catch (error: unknown) {
    log.error('Auth widget integration: Failed to share token', { error })
  }
}

/**
 * Handle logout
 * Clears all widget data when user logs out
 */
export async function handleAuthLogout(): Promise<void> {
  if (Platform.OS !== 'ios') return

  try {
    await widgetService.clearWidgetData()
    log.info('Auth widget integration: Widget data cleared on logout')
  } catch (error: unknown) {
    log.error('Auth widget integration: Failed to clear widget data', { error })
  }
}

/**
 * Sync continue watching data to widget
 * Fetches latest data from API and shares with widget
 */
async function syncContinueWatchingToWidget(token: string): Promise<void> {
  try {
    // Fetch continue watching from API
    const response = await fetch(
      'https://api.bayit.tv/api/v1/user/continue-watching?limit=3',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()

    // Share with widget
    if (data.items && data.items.length > 0) {
      await widgetService.shareContinueWatching(data.items)
      log.info('Auth widget integration: Continue watching data synced', {
        count: data.items.length,
      })
    }
  } catch (error: unknown) {
    log.error('Auth widget integration: Failed to sync continue watching', { error })
  }
}

/**
 * Initialize widget on app launch
 * Called when app becomes active with authenticated user
 */
export async function initializeWidgetOnLaunch(): Promise<void> {
  if (Platform.OS !== 'ios') return

  try {
    // Get stored auth token
    const token = await storage.getItem('auth_token')

    if (token) {
      await handleAuthSuccess(token)
    }
  } catch (error: unknown) {
    log.error('Auth widget integration: Failed to initialize on launch', { error })
  }
}

/**
 * Handle app coming to foreground
 * Refreshes widget data when app becomes active
 */
export async function handleAppForeground(): Promise<void> {
  if (Platform.OS !== 'ios') return

  try {
    const token = await storage.getItem('auth_token')

    if (token) {
      // Refresh continue watching data
      await syncContinueWatchingToWidget(token)
    }
  } catch (error: unknown) {
    log.error('Auth widget integration: Failed to handle foreground', { error })
  }
}
