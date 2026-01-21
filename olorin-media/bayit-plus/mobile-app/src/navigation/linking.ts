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
 * - bayitplus://podcast/{podcastId}
 * - bayitplus://radio/{stationId}
 * - bayitplus://search?q={query}
 * - bayitplus://profile
 * - bayitplus://settings
 * - bayitplus://continue (continue watching)
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
          Radio: 'radio',
          Podcasts: 'podcasts',
          Profile: 'profile',
        },
      },

      // Player (with content ID)
      Player: {
        path: 'player/:id/:type',
        parse: {
          id: (id: string) => id,
          type: (type: string) => type as 'vod' | 'live' | 'radio' | 'podcast',
        },
      },

      // Note: Direct content links (live/:channelId, vod/:contentId, etc.)
      // are handled through the Player screen with id/type params

      // Search with query
      Search: {
        path: 'search',
        parse: {
          query: (query: string) => query || '',
        },
        stringify: {
          query: (query?: string) => query || '',
        },
      },

      // Continue watching - handled via Home screen

      // Content screens
      MorningRitual: 'morning-ritual',
      Judaism: 'judaism',
      Children: 'children',
      Watchlist: 'watchlist',
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
