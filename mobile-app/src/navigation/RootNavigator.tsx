/**
 * Root Navigator
 * Main stack navigation - all screens lazy-loaded via lazyScreens.ts
 */

import React, { Suspense } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { GlassLoadingSpinner } from '@bayit/shared/ui';
import type { RootStackParamList } from './types';
import MainTabNavigator from './MainTabNavigator';
import { colors } from '@olorin/design-tokens';

import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { MorningRitualScreen } from '../screens/MorningRitualScreen';
import { SupportScreen } from '../screens/SupportScreen';
import { RecordingsScreen } from '../screens/RecordingsScreen';
import { ProfileSelectionScreenMobile } from '../screens';
import { PaymentSuccessScreen } from '../screens/PaymentSuccessScreen';
import { PaymentCancelledScreen } from '../screens/PaymentCancelledScreen';
import { PaymentPendingScreen } from '../screens/PaymentPendingScreen';
import { SubscribeScreen } from '../screens/SubscribeScreen';

import {
  PlayerScreenMobile, RadioScreenMobile, ProfileScreenLazy,
  SettingsScreenMobile, LanguageSettingsScreen, NotificationSettingsScreen,
  FavoritesScreenMobile, PlaylistScreenMobile, ChildrenScreenMobile,
  YoungstersScreenMobile, DownloadsScreenMobile, JudaismScreenMobile,
  FlowsScreenMobile, EPGScreenMobile, MovieDetailScreenMobile,
  SeriesDetailScreenMobile, BillingScreenMobile, SubscriptionScreenMobile,
  SecurityScreenMobile, VoiceOnboardingScreen, FriendsScreen,
  ActivityFeedScreen, WatchPartyScreen, ActivePartyScreen,
  InteractiveMissionScreen, AvatarWardrobeScreen, VideoSelfieScreen,
  PhoneticMirrorScreen, MissionsDashboardScreen, NewsClipScreen,
  MeshAvatarScreen, ZehAniDashboardScreen, FamilyControlsScreenMobile,
  HouseholdScreenMobile, AddProfileScreen, EditProfileScreen,
  ForgotPasswordScreen, CollectionDetailScreenMobile, AudiobooksScreenMobile,
  AudiobookDetailScreenMobile, TriviaScreenMobile, RewardsScreenMobile,
  DirectMessagesScreenMobile, ConversationScreenMobile, ChessScreenMobile,
  GlossaryScreenMobile, GlossaryDetailScreenMobile, CultureScreenMobile,
  StarStoryScreenMobile, V2VPracticeScreenMobile, MFASetupScreenMobile,
  PhoneVerificationScreenMobile, PasskeyManagementScreenMobile,
  ConnectedAccountsScreenMobile, HelpScreenMobile, AIOnboardingScreenMobile,
  WidgetGalleryScreenMobile,
} from './lazyScreens';

const LazyScreenFallback: React.FC = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
    <GlassLoadingSpinner size="large" />
  </View>
);

const LazyScreen =
  (Component: React.LazyExoticComponent<React.FC<any>>) =>
  (props: any) => (
    <Suspense fallback={<LazyScreenFallback />}>
      <Component {...props} />
    </Suspense>
  );

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => (
  <Stack.Navigator
    screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.background } }}
    initialRouteName="Main"
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ProfileSelection" component={ProfileSelectionScreenMobile} />
    <Stack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
    <Stack.Screen name="PaymentCancelled" component={PaymentCancelledScreen} />
    <Stack.Screen name="PaymentPending" component={PaymentPendingScreen} />
    <Stack.Screen name="Subscribe" component={SubscribeScreen} />
    <Stack.Screen name="Main" component={MainTabNavigator} />
    <Stack.Screen name="Player" component={LazyScreen(PlayerScreenMobile)} options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
    <Stack.Screen name="Radio" component={LazyScreen(RadioScreenMobile)} />
    <Stack.Screen name="Profile" component={LazyScreen(ProfileScreenLazy)} />
    <Stack.Screen name="MorningRitual" component={MorningRitualScreen} />
    <Stack.Screen name="Judaism" component={LazyScreen(JudaismScreenMobile)} />
    <Stack.Screen name="Children" component={LazyScreen(ChildrenScreenMobile)} />
    <Stack.Screen name="Youngsters" component={LazyScreen(YoungstersScreenMobile)} />
    <Stack.Screen name="Playlist" component={LazyScreen(PlaylistScreenMobile)} />
    <Stack.Screen name="Favorites" component={LazyScreen(FavoritesScreenMobile)} />
    <Stack.Screen name="Downloads" component={LazyScreen(DownloadsScreenMobile)} />
    <Stack.Screen name="Recordings" component={RecordingsScreen} />
    <Stack.Screen name="EPG" component={LazyScreen(EPGScreenMobile)} />
    <Stack.Screen name="Flows" component={LazyScreen(FlowsScreenMobile)} />
    <Stack.Screen name="MovieDetail" component={LazyScreen(MovieDetailScreenMobile)} />
    <Stack.Screen name="SeriesDetail" component={LazyScreen(SeriesDetailScreenMobile)} />
    <Stack.Screen name="Settings" component={LazyScreen(SettingsScreenMobile)} />
    <Stack.Screen name="LanguageSettings" component={LazyScreen(LanguageSettingsScreen)} />
    <Stack.Screen name="NotificationSettings" component={LazyScreen(NotificationSettingsScreen)} />
    <Stack.Screen name="Billing" component={LazyScreen(BillingScreenMobile)} />
    <Stack.Screen name="Subscription" component={LazyScreen(SubscriptionScreenMobile)} />
    <Stack.Screen name="Security" component={LazyScreen(SecurityScreenMobile)} />
    <Stack.Screen name="VoiceOnboarding" component={LazyScreen(VoiceOnboardingScreen)} />
    <Stack.Screen name="Friends" component={LazyScreen(FriendsScreen)} />
    <Stack.Screen name="ActivityFeed" component={LazyScreen(ActivityFeedScreen)} />
    <Stack.Screen name="Support" component={SupportScreen} />
    <Stack.Screen name="WatchParty" component={LazyScreen(WatchPartyScreen)} />
    <Stack.Screen name="ActiveParty" component={LazyScreen(ActivePartyScreen)} />
    <Stack.Screen name="InteractiveMission" component={LazyScreen(InteractiveMissionScreen)} />
    <Stack.Screen name="AvatarWardrobe" component={LazyScreen(AvatarWardrobeScreen)} />
    <Stack.Screen name="VideoSelfie" component={LazyScreen(VideoSelfieScreen)} />
    <Stack.Screen name="PhoneticMirror" component={LazyScreen(PhoneticMirrorScreen)} />
    <Stack.Screen name="MissionsDashboard" component={LazyScreen(MissionsDashboardScreen)} />
    <Stack.Screen name="NewsClip" component={LazyScreen(NewsClipScreen)} />
    <Stack.Screen name="MeshAvatar" component={LazyScreen(MeshAvatarScreen)} />
    <Stack.Screen name="ZehAniDashboard" component={LazyScreen(ZehAniDashboardScreen)} />
    <Stack.Screen name="FamilyControls" component={LazyScreen(FamilyControlsScreenMobile)} />
    <Stack.Screen name="Household" component={LazyScreen(HouseholdScreenMobile)} />
    <Stack.Screen name="AddProfile" component={LazyScreen(AddProfileScreen)} />
    <Stack.Screen name="EditProfile" component={LazyScreen(EditProfileScreen)} />
    <Stack.Screen name="ForgotPassword" component={LazyScreen(ForgotPasswordScreen)} />
    <Stack.Screen name="CollectionDetail" component={LazyScreen(CollectionDetailScreenMobile)} />
    <Stack.Screen name="Audiobooks" component={LazyScreen(AudiobooksScreenMobile)} />
    <Stack.Screen name="AudiobookDetail" component={LazyScreen(AudiobookDetailScreenMobile)} />
    <Stack.Screen name="Trivia" component={LazyScreen(TriviaScreenMobile)} />
    <Stack.Screen name="Rewards" component={LazyScreen(RewardsScreenMobile)} />
    <Stack.Screen name="DirectMessages" component={LazyScreen(DirectMessagesScreenMobile)} />
    <Stack.Screen name="Conversation" component={LazyScreen(ConversationScreenMobile)} />
    <Stack.Screen name="Chess" component={LazyScreen(ChessScreenMobile)} />
    <Stack.Screen name="Glossary" component={LazyScreen(GlossaryScreenMobile)} />
    <Stack.Screen name="GlossaryDetail" component={LazyScreen(GlossaryDetailScreenMobile)} />
    <Stack.Screen name="Culture" component={LazyScreen(CultureScreenMobile)} />
    <Stack.Screen name="StarStory" component={LazyScreen(StarStoryScreenMobile)} />
    <Stack.Screen name="V2VPractice" component={LazyScreen(V2VPracticeScreenMobile)} />
    <Stack.Screen name="MFASetup" component={LazyScreen(MFASetupScreenMobile)} />
    <Stack.Screen name="PhoneVerification" component={LazyScreen(PhoneVerificationScreenMobile)} />
    <Stack.Screen name="PasskeyManagement" component={LazyScreen(PasskeyManagementScreenMobile)} />
    <Stack.Screen name="ConnectedAccounts" component={LazyScreen(ConnectedAccountsScreenMobile)} />
    <Stack.Screen name="Help" component={LazyScreen(HelpScreenMobile)} />
    <Stack.Screen name="AIOnboarding" component={LazyScreen(AIOnboardingScreenMobile)} />
    <Stack.Screen name="WidgetGallery" component={LazyScreen(WidgetGalleryScreenMobile)} />
  </Stack.Navigator>
);

export default RootNavigator;
