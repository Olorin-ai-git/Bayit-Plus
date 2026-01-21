/**
 * Navigation Types
 * Type-safe navigation params for React Navigation
 */

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ProfileSelection: undefined;
  Main: undefined;
  Player: {
    id: string;
    title: string;
    type: 'vod' | 'live' | 'radio' | 'podcast';
  };
  Search: { query?: string };
  MorningRitual: undefined;
  Judaism: { category?: string };
  Children: undefined;
  Watchlist: undefined;
  Favorites: undefined;
  Downloads: undefined;
  Recordings: undefined;
  EPG: { channelId?: string };
  Settings: { section?: string };
  LanguageSettings: undefined;
  NotificationSettings: undefined;
  VoiceOnboarding: undefined;
  Support: undefined;
  Admin: undefined;
  // Content detail screens
  MovieDetail: { movieId: string };
  SeriesDetail: { seriesId: string };
  // Flows/sequences
  Flows: undefined;
  // Account management
  Billing: undefined;
  Subscription: undefined;
  Security: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  LiveTV: undefined;
  VOD: undefined;
  Radio: undefined;
  Podcasts: undefined;
  Profile: undefined;
};

// Navigation props types
export type RootStackScreenProps<T extends keyof RootStackParamList> = {
  route: { params: RootStackParamList[T] };
  navigation: any;
};

export type MainTabScreenProps<T extends keyof MainTabParamList> = {
  route: { params: MainTabParamList[T] };
  navigation: any;
};
