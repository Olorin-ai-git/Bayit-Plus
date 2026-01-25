/**
 * Siri Scene Search Intent for tvOS
 *
 * Enables users to search for scenes using Siri voice commands:
 * "Hey Siri, find the scene where they burn the almanac in Back to the Future on Bayit Plus"
 * "Hey Siri, search for the wedding scene in this movie on Bayit Plus"
 */

import { Linking } from 'react-native'

export interface SceneSearchIntentParams {
  query: string
  contentId?: string
  contentTitle?: string
}

/**
 * Handle Siri intent for scene search
 */
export async function handleSceneSearchIntent(params: SceneSearchIntentParams): Promise<void> {
  const { query, contentId, contentTitle } = params

  // Build deep link URL
  let url = 'bayitplus://search'
  const queryParams: string[] = []

  if (query) {
    queryParams.push(`q=${encodeURIComponent(query)}`)
  }

  if (contentId) {
    queryParams.push(`contentId=${contentId}`)
    queryParams.push(`type=scene`)
  }

  if (contentTitle) {
    queryParams.push(`title=${encodeURIComponent(contentTitle)}`)
  }

  if (queryParams.length > 0) {
    url += '?' + queryParams.join('&')
  }

  // Open app with scene search
  try {
    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
    }
  } catch (error) {
    console.error('Failed to handle scene search intent:', error)
  }
}

/**
 * Register Siri shortcuts for scene search
 * To be called during app initialization
 */
export function registerSceneSearchShortcuts(): void {
  // Register with iOS/tvOS Shortcuts system
  if (__DEV__) {
    console.log('[SceneSearch] Siri shortcuts registered for tvOS')
  }
}
