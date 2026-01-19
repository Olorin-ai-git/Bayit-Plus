/**
 * Root Navigator
 * Main stack navigation for the app
 *
 * Updated to use mobile-optimized screens with responsive design
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import MainTabNavigator from './MainTabNavigator';

// Import auth screens from shared (reusable)
import {
  LoginScreen,
  RegisterScreen,
  MorningRitualScreen,
  SupportScreen,
  RecordingsScreen,
} from '@bayit/shared-screens';
import { colors } from '../theme';

// Import mobile-optimized screens
import {
  PlayerScreenMobile,
  SearchScreenMobile,
  SettingsScreenMobile,
  LanguageSettingsScreen,
  NotificationSettingsScreen,
  FavoritesScreenMobile,
  WatchlistScreenMobile,
  ProfileSelectionScreenMobile,
  ChildrenScreenMobile,
  DownloadsScreenMobile,
  JudaismScreenMobile,
  FlowsScreenMobile,
  EPGScreenMobile,
  MovieDetailScreenMobile,
  SeriesDetailScreenMobile,
  BillingScreenMobile,
  SubscriptionScreenMobile,
  SecurityScreenMobile,
} from '../screens';

// Import mobile-specific screens (to be created)
import VoiceOnboardingScreen from '../screens/VoiceOnboardingScreen';

// Import admin navigator (if needed)
// import { AdminNavigator } from './AdminNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: colors.background },
      }}
      initialRouteName="Main"
    >
      {/* Auth Screens - Reused from shared */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ProfileSelection" component={ProfileSelectionScreenMobile} />

      {/* Main Tab Navigator - Uses mobile-optimized screens */}
      <Stack.Screen name="Main" component={MainTabNavigator} />

      {/* Modal Screens - Mobile-optimized */}
      <Stack.Screen
        name="Player"
        component={PlayerScreenMobile}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreenMobile}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />

      {/* Content Screens - Mobile-optimized */}
      <Stack.Screen name="MorningRitual" component={MorningRitualScreen} />
      <Stack.Screen name="Judaism" component={JudaismScreenMobile} />
      <Stack.Screen name="Children" component={ChildrenScreenMobile} />
      <Stack.Screen name="Watchlist" component={WatchlistScreenMobile} />
      <Stack.Screen name="Favorites" component={FavoritesScreenMobile} />
      <Stack.Screen name="Downloads" component={DownloadsScreenMobile} />
      <Stack.Screen name="Recordings" component={RecordingsScreen} />
      <Stack.Screen name="EPG" component={EPGScreenMobile} />
      <Stack.Screen name="Flows" component={FlowsScreenMobile} />

      {/* Content Detail Screens */}
      <Stack.Screen name="MovieDetail" component={MovieDetailScreenMobile} />
      <Stack.Screen name="SeriesDetail" component={SeriesDetailScreenMobile} />

      {/* Settings - Mobile-specific */}
      <Stack.Screen name="Settings" component={SettingsScreenMobile} />
      <Stack.Screen name="LanguageSettings" component={LanguageSettingsScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />

      {/* Account Management */}
      <Stack.Screen name="Billing" component={BillingScreenMobile} />
      <Stack.Screen name="Subscription" component={SubscriptionScreenMobile} />
      <Stack.Screen name="Security" component={SecurityScreenMobile} />

      {/* Voice Onboarding - Mobile-specific */}
      <Stack.Screen
        name="VoiceOnboarding"
        component={VoiceOnboardingScreen}
        options={{ title: 'Voice Setup' }}
      />

      {/* Support - Using shared SupportScreen */}
      <Stack.Screen name="Support" component={SupportScreen} />

      {/* Admin (Conditional) */}
      {/* <Stack.Screen name="Admin" component={AdminNavigator} /> */}
    </Stack.Navigator>
  );
};

export default RootNavigator;
