/**
 * Navigation Type Definitions for tvOS App
 *
 * Defines all routes and their parameters for type-safe navigation.
 * Route params derived from actual screen usage across src/screens/.
 */

export type RootStackParamList = {
  // Primary navigation tabs
  Home: undefined;
  LiveTV: { channelId?: string } | undefined;
  EPG: undefined;
  VOD: undefined;
  Radio: { stationId?: string } | undefined;
  Podcasts: { podcastId?: string } | undefined;
  Flows: undefined;
  Judaism: undefined;
  Children: undefined;

  // Content playback
  Player: {
    vodId?: string;
    channelId?: string;
    podcastId?: string;
    stationId?: string;
    contentId?: string;
  };
  FlowPlayer: { flowId: string };
  PodcastDetail: { podcastId: string };
  WatchRecording: { recordingId: string };

  // Search
  Search: { query?: string } | undefined;

  // User account
  Login: undefined;
  Profile: undefined;
  ProfileControls: { profileId?: string } | undefined;
  ProfileForm: { profileId?: string } | undefined;
  Favorites: undefined;
  Playlist: undefined;
  WatchHistory: undefined;
  Settings: undefined;
  FamilyControls: undefined;
  Household: undefined;
  Recordings: undefined;

  // Beta AI features
  BetaAI: undefined;
  AISearch: undefined;
  AIRecommendations: undefined;

  // Upgrade / subscription
  Upgrade: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
