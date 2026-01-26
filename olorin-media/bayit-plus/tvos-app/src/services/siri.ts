/**
 * Siri Service - tvOS Scene Search & Intents
 *
 * tvOS-specific Siri integration:
 * - Scene Search: Universal search via Siri button
 * - Top Shelf: Featured content integration
 * - Intent donations: "Watch [show]", "Resume watching", "Search for [query]"
 * - tvOS Scene Search: Deep linking from Siri search results
 *
 * Architecture difference from iOS:
 * - iOS: Siri Shortcuts via SiriKit
 * - tvOS: Scene Search via TVServices framework
 *
 * Scene Search allows users to:
 * 1. Press Siri button on remote
 * 2. Say "Watch [show name]"
 * 3. Siri shows results from all installed apps
 * 4. User selects Bayit+ result
 * 5. App launches directly to content
 */

import { NativeModules, Platform } from 'react-native';

const { SiriModule } = NativeModules;

class SiriService {
  /**
   * Donate "Play Content" intent to tvOS Scene Search
   * Call this when user plays content to improve Siri search
   *
   * tvOS Scene Search Note: This maps to TVTopShelfContentItem
   * and NSUserActivity with TVContentIdentifier
   */
  async donatePlayIntent(contentId: string, contentTitle: string, contentType: string): Promise<void> {
    if (!SiriModule || !Platform.isTV) {
      return;
    }

    try {
      await SiriModule.donatePlayIntent(contentId, contentTitle, contentType);
      console.log('[SiriService] Play intent donated to Scene Search:', contentTitle);
    } catch (error) {
      console.error('[SiriService] Failed to donate play intent:', error);
    }
  }

  /**
   * Donate "Search Content" intent to tvOS Scene Search
   * Call this when user performs a search to improve Siri suggestions
   *
   * tvOS Scene Search Note: Indexed via TVContentItem searchable metadata
   */
  async donateSearchIntent(query: string): Promise<void> {
    if (!SiriModule || !Platform.isTV) {
      return;
    }

    try {
      await SiriModule.donateSearchIntent(query);
      console.log('[SiriService] Search intent donated to Scene Search:', query);
    } catch (error) {
      console.error('[SiriService] Failed to donate search intent:', error);
    }
  }

  /**
   * Donate "Open Widget" intent (adapted for tvOS Top Shelf)
   * Call this when user interacts with Top Shelf items
   *
   * tvOS Top Shelf: Featured content carousel on home screen
   */
  async donateTopShelfIntent(widgetType: string, channelId: string, channelName: string): Promise<void> {
    if (!SiriModule || !Platform.isTV) {
      return;
    }

    try {
      // On tvOS, this maps to Top Shelf item interaction
      await SiriModule.donateWidgetIntent(widgetType, channelId, channelName);
      console.log('[SiriService] Top Shelf intent donated:', channelName);
    } catch (error) {
      console.error('[SiriService] Failed to donate Top Shelf intent:', error);
    }
  }

  /**
   * Donate "Resume Watching" intent to tvOS Scene Search
   * Call this when user resumes watching to enable "Continue watching" in Siri
   *
   * tvOS Scene Search: Powers "Up Next" universal queue
   */
  async donateResumeIntent(): Promise<void> {
    if (!SiriModule || !Platform.isTV) {
      return;
    }

    try {
      await SiriModule.donateResumeIntent();
      console.log('[SiriService] Resume watching intent donated to Scene Search');
    } catch (error) {
      console.error('[SiriService] Failed to donate resume watching intent:', error);
    }
  }

  /**
   * Delete all donated intents
   * Call this on logout or reset
   */
  async deleteAllShortcuts(): Promise<number> {
    if (!SiriModule || !Platform.isTV) {
      return 0;
    }

    try {
      const result = await SiriModule.deleteAllShortcuts();
      console.log(`[SiriService] Deleted ${result.deleted} Scene Search intents`);
      return result.deleted;
    } catch (error) {
      console.error('[SiriService] Failed to delete Scene Search intents:', error);
      return 0;
    }
  }

  /**
   * Get suggested intents (tvOS Scene Search items)
   * Returns Top Shelf and Scene Search indexed items
   */
  async getSuggestedShortcuts(): Promise<any[]> {
    if (!SiriModule || !Platform.isTV) {
      return [];
    }

    try {
      const result = await SiriModule.getSuggestedShortcuts();
      return result.shortcuts || [];
    } catch (error) {
      console.error('[SiriService] Failed to get Scene Search items:', error);
      return [];
    }
  }

  /**
   * Handle Scene Search launch (deep linking from Siri)
   * Call this in app launch handler to process Scene Search navigation
   *
   * @param userActivity - NSUserActivity from Scene Search
   * @returns Parsed navigation data
   */
  async handleSceneSearchLaunch(userActivity: any): Promise<{
    type: 'play' | 'search' | 'resume' | 'topshelf';
    contentId?: string;
    query?: string;
    channelId?: string;
  } | null> {
    if (!SiriModule || !Platform.isTV) {
      return null;
    }

    try {
      // Parse NSUserActivity from Scene Search
      const result = await SiriModule.parseUserActivity(userActivity);
      console.log('[SiriService] Scene Search launch handled:', result);
      return result;
    } catch (error) {
      console.error('[SiriService] Failed to handle Scene Search launch:', error);
      return null;
    }
  }

  /**
   * Update Top Shelf content
   * Call this to refresh featured content in tvOS Top Shelf
   *
   * @param items - Array of featured content items
   */
  async updateTopShelf(items: Array<{
    id: string;
    title: string;
    imageUrl: string;
    description?: string;
  }>): Promise<void> {
    if (!SiriModule || !Platform.isTV) {
      return;
    }

    try {
      await SiriModule.updateTopShelf(items);
      console.log(`[SiriService] Top Shelf updated with ${items.length} items`);
    } catch (error) {
      console.error('[SiriService] Failed to update Top Shelf:', error);
    }
  }
}

// Export singleton instance
export const siriService = new SiriService();
