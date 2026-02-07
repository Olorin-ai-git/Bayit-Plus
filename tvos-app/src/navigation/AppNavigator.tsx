/**
 * tvOS App Navigator
 *
 * Stack navigator connecting all real screens from src/screens/,
 * shared screens from @bayit/shared-screens, and beta screens.
 * Each screen renders its own TVHeader internally.
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuthStore } from '@bayit/shared-stores';
import { colors } from '@olorin/design-tokens';
import {
  HomeScreen,
  PlayerScreen,
  LiveTVScreen,
  SearchScreen,
  VODScreen,
  RadioScreen,
  EPGScreen,
  SettingsScreen,
  FamilyControlsScreen,
  HouseholdScreen,
  ProfileScreen,
  FavoritesScreen,
  PodcastsScreen,
  ChildrenScreen,
  FlowsScreen,
  JudaismScreen,
} from '../screens';
import { RecordingsScreenTV } from '../screens/RecordingsScreenTV';
import ProfileControlsScreen from '../screens/ProfileControlsScreen';
import { ProfileFormScreen } from '../screens/ProfileFormScreen';
// Shared screens (Login, Playlist, Subscribe) are not imported directly
// because they pull in a shared dependency chain not fully resolved for tvOS.
// Routes are mapped to existing tvOS screens until tvOS-specific versions exist.
import {
  AISearchScreen,
  AIRecommendationsScreen,
} from '../components/beta';
import { useBetaUser } from '../hooks/useBetaUser';
import type { RootStackParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();

/**
 * Adapter for beta AISearchScreen - bridges navigation props
 * and checks actual Beta 500 enrollment via API
 */
const AISearchAdapter: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { isBetaUser } = useBetaUser(user?.id);
  return (
    <AISearchScreen
      isEnrolled={isBetaUser}
      onBack={() => navigation.goBack()}
    />
  );
};

/**
 * Adapter for beta AIRecommendationsScreen - bridges navigation props
 */
const AIRecommendationsAdapter: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { isBetaUser } = useBetaUser(user?.id);
  return (
    <AIRecommendationsScreen
      isEnrolled={isBetaUser}
      onBack={() => navigation.goBack()}
    />
  );
};

/**
 * Adapter: WatchRecording routes to PlayerScreen with recordingId mapped to contentId
 */
const WatchRecordingAdapter: React.FC = () => {
  const route = useRoute<any>();
  return <PlayerScreen recordingId={route.params?.recordingId} />;
};

/**
 * Adapter: PodcastDetail routes to PlayerScreen with podcastId
 */
const PodcastDetailAdapter: React.FC = () => {
  const route = useRoute<any>();
  return <PlayerScreen podcastId={route.params?.podcastId} />;
};

/**
 * Adapter: FlowPlayer routes to PlayerScreen with flowId mapped to contentId
 */
const FlowPlayerAdapter: React.FC = () => {
  const route = useRoute<any>();
  return <PlayerScreen contentId={route.params?.flowId} />;
};

export const AppNavigator: React.FC = () => (
  <Stack.Navigator
    initialRouteName="Home"
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: colors.dark['950'] },
    }}
  >
    {/* Primary navigation tabs */}
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="LiveTV" component={LiveTVScreen} />
    <Stack.Screen name="EPG" component={EPGScreen} />
    <Stack.Screen name="VOD" component={VODScreen} />
    <Stack.Screen name="Radio" component={RadioScreen} />
    <Stack.Screen name="Podcasts" component={PodcastsScreen} />
    <Stack.Screen name="Flows" component={FlowsScreen} />
    <Stack.Screen name="Judaism" component={JudaismScreen} />
    <Stack.Screen name="Children" component={ChildrenScreen} />
    <Stack.Screen name="Search" component={SearchScreen} />

    {/* Content playback */}
    <Stack.Screen name="Player" component={PlayerScreen} />
    <Stack.Screen name="WatchRecording" component={WatchRecordingAdapter} />
    <Stack.Screen name="PodcastDetail" component={PodcastDetailAdapter} />
    <Stack.Screen name="FlowPlayer" component={FlowPlayerAdapter} />

    {/* User account - Login/Playlist/WatchHistory/Upgrade use existing tvOS screens */}
    <Stack.Screen name="Login" component={ProfileScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="ProfileControls" component={ProfileControlsScreen} />
    <Stack.Screen name="ProfileForm" component={ProfileFormScreen} />
    <Stack.Screen name="Favorites" component={FavoritesScreen} />
    <Stack.Screen name="Playlist" component={FavoritesScreen} />
    <Stack.Screen name="WatchHistory" component={FavoritesScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="FamilyControls" component={FamilyControlsScreen} />
    <Stack.Screen name="Household" component={HouseholdScreen} />
    <Stack.Screen name="Recordings" component={RecordingsScreenTV} />
    <Stack.Screen name="Upgrade" component={SettingsScreen} />

    {/* Beta AI features */}
    {/* BetaAI is the header nav tab entry point; AISearch is a deep-link alias */}
    <Stack.Screen name="BetaAI" component={AISearchAdapter} />
    <Stack.Screen name="AISearch" component={AISearchAdapter} />
    <Stack.Screen name="AIRecommendations" component={AIRecommendationsAdapter} />
  </Stack.Navigator>
);
