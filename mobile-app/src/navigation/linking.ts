/**
 * Deep Linking Configuration
 * Handles deep links from Home Screen widgets, Siri Shortcuts, and external sources
 *
 * URL Scheme: bayitplus://
 *
 * Supported deep links:
 * - bayitplus://home
 * - bayitplus://live/{channelId}
 * - bayitplus://vod/{contentId}
 * - bayitplus://vod/{contentId}?t={timestamp} (scene search timestamp)
 * - bayitplus://podcast/{podcastId}
 * - bayitplus://radio/{stationId}
 * - bayitplus://search?q={query}
 * - bayitplus://profile
 * - bayitplus://settings
 * - bayitplus://continue (continue watching)
 * - bayitplus://player/{contentId}/{type}?t={timestamp} (with scene timestamp)
 */

import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['bayitplus://', 'https://bayit.tv'],

  config: {
    screens: {
      // Auth screens
      Login: 'login',
      Register: 'register',
      ProfileSelection: 'profile-selection',

      // Main tabs
      Main: {
        screens: {
          Home: 'home',
          LiveTV: 'live',
          VOD: 'vod',
          ZehAni: 'zeh-ani',
          Podcasts: 'podcasts',
          Search: 'search',
        },
      },

      // Stack screens (no longer tabs)
      Radio: 'radio',
      Profile: 'profile',

      // Player (with content ID and optional timestamp for scene search)
      Player: {
        path: 'player/:id/:type',
        parse: {
          id: (id: string) => id,
          type: (type: string) => type as 'vod' | 'live' | 'radio' | 'podcast',
          t: (timestamp: string) => (timestamp ? parseFloat(timestamp) : undefined),
        },
        stringify: {
          t: (timestamp?: number) => (timestamp !== undefined ? timestamp.toString() : ''),
        },
      },

      // Note: Direct content links (live/:channelId, vod/:contentId, etc.)
      // are handled through the Player screen with id/type params

      // Note: Search is now handled as a tab under Main.screens.Search

      // Continue watching - handled via Home screen

      // Content screens
      MorningRitual: 'morning-ritual',
      Judaism: 'judaism',
      Children: 'children',
      Playlist: 'playlist',
      Favorites: 'favorites',
      Downloads: 'downloads',

      // Settings
      Settings: 'settings',

      // Voice onboarding
      VoiceOnboarding: 'voice-onboarding',

      // Admin
      Admin: 'admin',
    },
  },

  // Custom URL handling
  async getInitialURL() {
    // Check if app was opened via deep link
    const url = await Linking.getInitialURL();
    return url;
  },

  subscribe(listener) {
    // Listen for deep link events while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });

    return () => {
      subscription.remove();
    };
  },
};

// Import Linking from React Native
import { Linking } from 'react-native';
