/**
 * Root Navigator
 * Main stack navigation for the app
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import MainTabNavigator from './MainTabNavigator';

// Import screens from shared
import {
  LoginScreen,
  RegisterScreen,
  ProfileSelectionScreen,
  PlayerScreen,
  SearchScreen,
  MorningRitualScreen,
  JudaismScreen,
  ChildrenScreen,
  WatchlistScreen,
  FavoritesScreen,
  DownloadsScreen,
} from '@bayit/shared-screens';

// Import mobile-specific screens
import SettingsScreen from '../screens/SettingsScreen';
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
        contentStyle: { backgroundColor: '#0d0d1a' },
      }}
      initialRouteName="Main"
    >
      {/* Auth Screens */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ProfileSelection" component={ProfileSelectionScreen} />

      {/* Main Tab Navigator */}
      <Stack.Screen name="Main" component={MainTabNavigator} />

      {/* Modal Screens */}
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />

      {/* Content Screens */}
      <Stack.Screen name="MorningRitual" component={MorningRitualScreen} />
      <Stack.Screen name="Judaism" component={JudaismScreen} />
      <Stack.Screen name="Children" component={ChildrenScreen} />
      <Stack.Screen name="Watchlist" component={WatchlistScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="Downloads" component={DownloadsScreen} />

      {/* Settings */}
      <Stack.Screen name="Settings" component={SettingsScreen} />

      {/* Voice Onboarding */}
      <Stack.Screen
        name="VoiceOnboarding"
        component={VoiceOnboardingScreen}
        options={{ title: 'Voice Setup' }}
      />

      {/* Admin (Conditional) */}
      {/* <Stack.Screen name="Admin" component={AdminNavigator} /> */}
    </Stack.Navigator>
  );
};

export default RootNavigator;
