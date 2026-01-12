/**
 * Siri Service - Siri Shortcuts Bridge
 *
 * Wraps native SiriModule for Siri Shortcuts integration:
 * - Donate intents to Siri for voice shortcuts
 * - "Add to Siri" functionality
 * - Intent management
 */

import { NativeModules, Platform } from 'react-native';

const { SiriModule } = NativeModules;

class SiriService {
  /**
   * Donate "Play Content" intent to Siri
   * Call this when user plays content to teach Siri
   */
  async donatePlayIntent(contentId: string, contentTitle: string, contentType: string): Promise<void> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return;
    }

    try {
      await SiriModule.donatePlayIntent(contentId, contentTitle, contentType);
      console.log('[SiriService] Play intent donated:', contentTitle);
    } catch (error) {
      console.error('[SiriService] Failed to donate play intent:', error);
    }
  }

  /**
   * Donate "Search Content" intent to Siri
   * Call this when user performs a search
   */
  async donateSearchIntent(query: string): Promise<void> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return;
    }

    try {
      await SiriModule.donateSearchIntent(query);
      console.log('[SiriService] Search intent donated:', query);
    } catch (error) {
      console.error('[SiriService] Failed to donate search intent:', error);
    }
  }

  /**
   * Donate "Open Widget" intent to Siri
   * Call this when user opens a widget
   */
  async donateWidgetIntent(widgetType: string, channelId: string, channelName: string): Promise<void> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return;
    }

    try {
      await SiriModule.donateWidgetIntent(widgetType, channelId, channelName);
      console.log('[SiriService] Widget intent donated:', channelName);
    } catch (error) {
      console.error('[SiriService] Failed to donate widget intent:', error);
    }
  }

  /**
   * Donate "Resume Watching" intent to Siri
   * Call this when user resumes watching
   */
  async donateResumeIntent(): Promise<void> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return;
    }

    try {
      await SiriModule.donateResumeIntent();
      console.log('[SiriService] Resume watching intent donated');
    } catch (error) {
      console.error('[SiriService] Failed to donate resume watching intent:', error);
    }
  }

  /**
   * Delete all Siri shortcuts
   */
  async deleteAllShortcuts(): Promise<number> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return 0;
    }

    try {
      const result = await SiriModule.deleteAllShortcuts();
      console.log(`[SiriService] Deleted ${result.deleted} shortcuts`);
      return result.deleted;
    } catch (error) {
      console.error('[SiriService] Failed to delete shortcuts:', error);
      return 0;
    }
  }

  /**
   * Get all user's Siri shortcuts
   */
  async getSuggestedShortcuts(): Promise<any[]> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return [];
    }

    try {
      const result = await SiriModule.getSuggestedShortcuts();
      return result.shortcuts || [];
    } catch (error) {
      console.error('[SiriService] Failed to get shortcuts:', error);
      return [];
    }
  }
}

// Export singleton instance
export const siriService = new SiriService();
