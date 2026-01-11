/**
 * WidgetKit Service - iOS Home Screen Widgets Bridge
 *
 * Wraps native WidgetKitModule to update Home Screen widgets:
 * - Write widget data to shared UserDefaults (App Groups)
 * - Reload widget timelines
 * - Get current widget configurations
 */

import { NativeModules, Platform } from 'react-native';

const { WidgetKitModule } = NativeModules;

interface WidgetData {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  deepLink?: string;
}

interface WidgetInfo {
  kind: string;
  family: 'small' | 'medium' | 'large' | 'extraLarge';
}

class WidgetKitService {
  /**
   * Update widget data for Home Screen widgets
   * @param widgetType - Widget type identifier
   * @param data - Widget display data
   */
  async updateWidgetData(widgetType: string, data: WidgetData): Promise<void> {
    if (!WidgetKitModule || Platform.OS !== 'ios') {
      console.warn('[WidgetKitService] WidgetKit not available');
      return;
    }

    try {
      await WidgetKitModule.updateWidgetData(widgetType, data);
      console.log('[WidgetKitService] Widget data updated:', widgetType);
    } catch (error) {
      console.error('[WidgetKitService] Failed to update widget data:', error);
      throw error;
    }
  }

  /**
   * Reload widget timelines (triggers widget refresh)
   * @param widgetTypes - Array of widget type identifiers (empty = reload all)
   */
  async reloadTimelines(widgetTypes: string[] = []): Promise<void> {
    if (!WidgetKitModule || Platform.OS !== 'ios') {
      return;
    }

    try {
      await WidgetKitModule.reloadTimelines(widgetTypes);
      console.log('[WidgetKitService] Widget timelines reloaded');
    } catch (error) {
      console.error('[WidgetKitService] Failed to reload timelines:', error);
    }
  }

  /**
   * Get currently installed widgets
   */
  async getCurrentConfigurations(): Promise<WidgetInfo[]> {
    if (!WidgetKitModule || Platform.OS !== 'ios') {
      return [];
    }

    try {
      const result = await WidgetKitModule.getCurrentConfigurations();
      return result.widgets || [];
    } catch (error) {
      console.error('[WidgetKitService] Failed to get configurations:', error);
      return [];
    }
  }

  /**
   * Update "Continue Watching" widget
   */
  async updateContinueWatching(title: string, subtitle: string, imageUrl?: string): Promise<void> {
    await this.updateWidgetData('continue_watching', {
      title,
      subtitle,
      imageUrl,
      deepLink: 'bayitplus://continue',
    });
  }

  /**
   * Update "Live Channel" widget
   */
  async updateLiveChannel(channelName: string, programName: string, channelId: string, imageUrl?: string): Promise<void> {
    await this.updateWidgetData('live_channel', {
      title: channelName,
      subtitle: programName,
      imageUrl,
      deepLink: `bayitplus://live/${channelId}`,
    });
  }

  /**
   * Update "Quick Actions" widget
   */
  async updateQuickActions(): Promise<void> {
    await this.updateWidgetData('quick_actions', {
      title: 'Bayit+',
      subtitle: 'Tap to open',
      deepLink: 'bayitplus://home',
    });
  }
}

// Export singleton instance
export const widgetKitService = new WidgetKitService();

export type { WidgetData, WidgetInfo };
