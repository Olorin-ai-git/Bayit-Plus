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
  async donatePlayIntent(contentId: string, contentType: string, contentTitle: string): Promise<void> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return;
    }

    try {
      await SiriModule.donatePlayIntent(contentId, contentType, contentTitle);
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
  async donateOpenWidgetIntent(widgetId: string, widgetType: string, widgetTitle: string): Promise<void> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return;
    }

    try {
      await SiriModule.donateOpenWidgetIntent(widgetId, widgetType, widgetTitle);
      console.log('[SiriService] Open widget intent donated:', widgetTitle);
    } catch (error) {
      console.error('[SiriService] Failed to donate open widget intent:', error);
    }
  }

  /**
   * Donate "Resume Watching" intent to Siri
   * Call this when user resumes watching
   */
  async donateResumeWatchingIntent(): Promise<void> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return;
    }

    try {
      await SiriModule.donateResumeWatchingIntent();
      console.log('[SiriService] Resume watching intent donated');
    } catch (error) {
      console.error('[SiriService] Failed to donate resume watching intent:', error);
    }
  }

  /**
   * Delete all donated intents
   */
  async deleteAllIntents(): Promise<void> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return;
    }

    try {
      await SiriModule.deleteAllIntents();
      console.log('[SiriService] All intents deleted');
    } catch (error) {
      console.error('[SiriService] Failed to delete intents:', error);
    }
  }

  /**
   * Delete a specific intent by identifier
   */
  async deleteIntent(identifier: string): Promise<void> {
    if (!SiriModule || Platform.OS !== 'ios') {
      return;
    }

    try {
      await SiriModule.deleteIntent(identifier);
      console.log('[SiriService] Intent deleted:', identifier);
    } catch (error) {
      console.error('[SiriService] Failed to delete intent:', error);
    }
  }
}

// Export singleton instance
export const siriService = new SiriService();
