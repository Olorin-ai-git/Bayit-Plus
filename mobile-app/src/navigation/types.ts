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
    t?: number; // Optional timestamp in seconds for scene search deep links
  };
  Radio: undefined;
  Profile: undefined;
  MorningRitual: undefined;
  Judaism: { category?: string };
  Children: undefined;
  Youngsters: undefined;
  Playlist: undefined;
  Favorites: undefined;
  Downloads: undefined;
  Recordings: undefined;
  EPG: { channelId?: string };
  Settings: { section?: string };
  LanguageSettings: undefined;
  NotificationSettings: undefined;
  VoiceOnboarding: undefined;
  Friends: undefined;
  ActivityFeed: undefined;
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
  // Payment screens
  PaymentSuccess: undefined;
  PaymentCancelled: undefined;
  PaymentPending: { checkoutUrl?: string | null; planId?: string | null };
  Subscribe: undefined;
  // Interactive Missions
  InteractiveMission: { missionId: string; profileId: string };
  AvatarWardrobe: { avatarId: string; profileId: string };
  VideoSelfie: { avatarId: string };
  // Phonetic Mirror
  PhoneticMirror: { profileId: string; avatarId: string };
  // Gamification
  MissionsDashboard: { profileId: string };
  // Grandparent Bridge
  NewsClip: { profileId: string; avatarId: string };
  // Zeh Ani - Avatar Mesh
  MeshAvatar: { avatarId: string; profileId: string };
  ZehAniDashboard: { profileId: string };
  // Widgets
  Widgets: undefined;
  // Watch Party
  WatchParty: undefined;
  ActiveParty: { partyId: string };
  // Family & Profiles
  FamilyControls: undefined;
  Household: undefined;
  AddProfile: undefined;
  EditProfile: { profileId: string };
  ForgotPassword: undefined;
  // Content
  CollectionDetail: { collectionId: string };
  Audiobooks: undefined;
  AudiobookDetail: { audiobookId: string };
  AudiobookPlayer: { audiobookId: string; audiobook: any; startChapter?: number };
  PodcastDetail: { podcastId: string };
  PodcastPlayer: { podcastId: string; episodeId: string; episode: any };
  Beta500: undefined;
  // Gamification
  Trivia: { contentId?: string };
  Rewards: { profileId?: string };
  // Social
  DirectMessages: undefined;
  Conversation: { conversationId?: string; recipientId?: string; recipientName?: string };
  Chess: { gameId?: string; opponentId?: string };
  // Cultural
  Glossary: undefined;
  GlossaryDetail: { wordId: string };
  Culture: undefined;
  StarStory: { profileId: string };
  // ZehAni
  V2VPractice: { profileId: string; avatarId: string };
  // Auth & Security
  MFASetup: undefined;
  PhoneVerification: undefined;
  PasskeyManagement: undefined;
  ConnectedAccounts: undefined;
  // Home & Discovery
  Help: undefined;
  AIOnboarding: undefined;
  // Widgets
  WidgetGallery: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  LiveTV: undefined;
  VOD: undefined;
  ZehAni: { profileId?: string };
  Podcasts: undefined;
  Search: { query?: string };
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
