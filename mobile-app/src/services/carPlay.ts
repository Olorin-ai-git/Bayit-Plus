/**
 * CarPlay Service
 * Manages CarPlay integration for Bayit+ mobile app
 *
 * Features:
 * - Audio-only content (live radio, podcasts)
 * - Tab bar navigation (Radio, Podcasts, Favorites)
 * - Now Playing screen
 * - Voice command support in CarPlay
 */

import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const { CarPlayModule } = NativeModules;

export interface CarPlayTemplate {
  type: 'tabBar' | 'list' | 'nowPlaying' | 'search';
  title?: string;
  items?: CarPlayItem[];
}

export interface CarPlayItem {
  id: string;
  title: string;
  subtitle?: string;
  artwork?: string;
  onSelect: () => void;
}

export interface CarPlayService {
  // Initialize CarPlay
  initialize(): Promise<void>;

  // Navigation
  pushTemplate(template: any): Promise<void>;
  popTemplate(): Promise<void>;

  // Now Playing
  updateNowPlaying(info: NowPlayingInfo): Promise<void>;

  // Events
  onConnect: (callback: () => void) => void;
  onDisconnect: (callback: () => void) => void;
}

interface NowPlayingInfo {
  title: string;
  artist?: string;
  albumArt?: string;
  duration?: number;
  elapsedTime?: number;
}

class CarPlayService {
  async isConnected(): Promise<boolean> {
    // For now, return false until CarPlay is fully implemented
    return false;
  }

  async updateNowPlaying(info: {
    title: string;
    artist?: string;
    artwork?: string;
    duration?: number;
    position?: number;
  }): Promise<void> {
    // Will be implemented with native CarPlay bridge
    console.log('[CarPlay] Update now playing:', info);
  }
}

export const carPlayService = new CarPlayService();
