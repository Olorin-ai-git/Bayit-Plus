/**
 * Lazy Screen Imports
 * Code-split screen components loaded on-demand as user navigates
 */

import React from 'react';

// Mobile-optimized screens
export const PlayerScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.PlayerScreenMobile }))
);
export const RadioScreenMobile = React.lazy(() =>
  import('../screens/SimpleRadioScreenMobile').then((mod) => ({ default: mod.RadioScreenMobile }))
);
export const ProfileScreenLazy = React.lazy(() =>
  import('../screens/ProfileScreen').then((mod) => ({ default: mod.ProfileScreen }))
);
export const SettingsScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.SettingsScreenMobile }))
);
export const LanguageSettingsScreen = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.LanguageSettingsScreen }))
);
export const NotificationSettingsScreen = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.NotificationSettingsScreen }))
);
export const FavoritesScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.FavoritesScreenMobile }))
);
export const PlaylistScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.PlaylistScreenMobile }))
);
export const ChildrenScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.ChildrenScreenMobile }))
);
export const YoungstersScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.YoungstersScreenMobile }))
);
export const DownloadsScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.DownloadsScreenMobile }))
);
export const JudaismScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.JudaismScreenMobile }))
);
export const FlowsScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.FlowsScreenMobile }))
);
export const EPGScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.EPGScreenMobile }))
);
export const MovieDetailScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.MovieDetailScreenMobile }))
);
export const SeriesDetailScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.SeriesDetailScreenMobile }))
);
export const BillingScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.BillingScreenMobile }))
);
export const SubscriptionScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.SubscriptionScreenMobile }))
);
export const SecurityScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.SecurityScreenMobile }))
);

// Voice onboarding
export const VoiceOnboardingScreen = React.lazy(() =>
  import('../screens/VoiceOnboardingScreen')
);

// Friends/Social
export const FriendsScreen = React.lazy(() =>
  import('../screens/FriendsScreen').then((mod) => ({ default: mod.default }))
);
export const ActivityFeedScreen = React.lazy(() =>
  import('../screens/ActivityFeedScreen').then((mod) => ({ default: mod.ActivityFeedScreen }))
);

// Watch Party
export const WatchPartyScreen = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.WatchPartyScreen }))
);
export const ActivePartyScreen = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.ActivePartyScreen }))
);

// Interactive Missions / ZehAni
export const InteractiveMissionScreen = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.InteractiveMissionScreen }))
);
export const AvatarWardrobeScreen = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.AvatarWardrobeScreen }))
);
export const VideoSelfieScreen = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.VideoSelfieScreen }))
);
export const PhoneticMirrorScreen = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.PhoneticMirrorScreen }))
);
export const MissionsDashboardScreen = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.MissionsDashboardScreen }))
);
export const NewsClipScreen = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.NewsClipScreen }))
);
export const MeshAvatarScreen = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.MeshAvatarScreen }))
);
export const ZehAniDashboardScreen = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.ZehAniDashboardScreen }))
);

// Family & Profile
export const FamilyControlsScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.FamilyControlsScreenMobile }))
);
export const HouseholdScreenMobile = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.HouseholdScreenMobile }))
);
export const AddProfileScreen = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.AddProfileScreen }))
);
export const EditProfileScreen = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.EditProfileScreen }))
);
export const ForgotPasswordScreen = React.lazy(() =>
  import('../screens').then((mod) => ({ default: mod.ForgotPasswordScreen }))
);

// Content
export const CollectionDetailScreenMobile = React.lazy(() =>
  import('../screens/CollectionDetailScreenMobile').then((mod) => ({ default: mod.default }))
);
export const AudiobooksScreenMobile = React.lazy(() =>
  import('../screens/AudiobooksScreenMobile').then((mod) => ({ default: mod.default }))
);
export const AudiobookDetailScreenMobile = React.lazy(() =>
  import('../screens/AudiobookDetailScreenMobile').then((mod) => ({ default: mod.default }))
);

// Gamification (Phase 2)
export const TriviaScreenMobile = React.lazy(() =>
  import('../screens/TriviaScreenMobile').then((mod) => ({ default: mod.TriviaScreenMobile }))
);
export const RewardsScreenMobile = React.lazy(() =>
  import('../screens/RewardsScreenMobile').then((mod) => ({ default: mod.RewardsScreenMobile }))
);

// Social (Phase 3)
export const DirectMessagesScreenMobile = React.lazy(() =>
  import('../screens/DirectMessagesScreenMobile').then((mod) => ({ default: mod.DirectMessagesScreenMobile }))
);
export const ConversationScreenMobile = React.lazy(() =>
  import('../screens/ConversationScreenMobile').then((mod) => ({ default: mod.ConversationScreenMobile }))
);
export const ChessScreenMobile = React.lazy(() =>
  import('../screens/ChessScreenMobile').then((mod) => ({ default: mod.ChessScreenMobile }))
);

// Cultural (Phase 4)
export const GlossaryScreenMobile = React.lazy(() =>
  import('../screens/GlossaryScreenMobile').then((mod) => ({ default: mod.GlossaryScreenMobile }))
);
export const GlossaryDetailScreenMobile = React.lazy(() =>
  import('../screens/GlossaryDetailScreenMobile').then((mod) => ({ default: mod.GlossaryDetailScreenMobile }))
);
export const CultureScreenMobile = React.lazy(() =>
  import('../screens/CultureScreenMobile').then((mod) => ({ default: mod.CultureScreenMobile }))
);
export const StarStoryScreenMobile = React.lazy(() =>
  import('../screens/StarStoryScreenMobile').then((mod) => ({ default: mod.StarStoryScreenMobile }))
);

// ZehAni V2V (Phase 5)
export const V2VPracticeScreenMobile = React.lazy(() =>
  import('../screens/V2VPracticeScreenMobile').then((mod) => ({ default: mod.V2VPracticeScreenMobile }))
);

// Auth & Security (Phase 6)
export const MFASetupScreenMobile = React.lazy(() =>
  import('../screens/MFASetupScreenMobile').then((mod) => ({ default: mod.MFASetupScreenMobile }))
);
export const PhoneVerificationScreenMobile = React.lazy(() =>
  import('../screens/PhoneVerificationScreenMobile').then((mod) => ({ default: mod.PhoneVerificationScreenMobile }))
);
export const PasskeyManagementScreenMobile = React.lazy(() =>
  import('../screens/PasskeyManagementScreenMobile').then((mod) => ({ default: mod.PasskeyManagementScreenMobile }))
);
export const ConnectedAccountsScreenMobile = React.lazy(() =>
  import('../screens/ConnectedAccountsScreenMobile').then((mod) => ({ default: mod.ConnectedAccountsScreenMobile }))
);

// Home & Discovery (Phase 7)
export const HelpScreenMobile = React.lazy(() =>
  import('../screens/HelpScreenMobile').then((mod) => ({ default: mod.HelpScreenMobile }))
);
export const AIOnboardingScreenMobile = React.lazy(() =>
  import('../screens/AIOnboardingScreenMobile').then((mod) => ({ default: mod.AIOnboardingScreenMobile }))
);

// Widgets (Phase 8)
export const WidgetGalleryScreenMobile = React.lazy(() =>
  import('../screens/WidgetGalleryScreenMobile').then((mod) => ({ default: mod.WidgetGalleryScreenMobile }))
);
