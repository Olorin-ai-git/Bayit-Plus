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

      // Live channel (direct link)
      'live/:channelId': {
        path: 'live/:channelId',
        parse: {
          channelId: (channelId: string) => channelId,
        },
        // Navigate to Player screen
        stringify: {
          channelId: (channelId: string) => channelId,
        },
      },

      // VOD content (direct link)
      'vod/:contentId': {
        path: 'vod/:contentId',
        parse: {
          contentId: (contentId: string) => contentId,
        },
      },

      // Podcast (direct link)
      'podcast/:podcastId': {
        path: 'podcast/:podcastId',
        parse: {
          podcastId: (podcastId: string) => podcastId,
        },
      },

      // Radio station (direct link)
      'radio/:stationId': {
        path: 'radio/:stationId',
        parse: {
          stationId: (stationId: string) => stationId,
        },
      },

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

      // Continue watching
      'continue': {
        path: 'continue',
      },

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
      Admin: {
        path: 'admin',
      },

      // Fallback
      NotFound: '*',
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
