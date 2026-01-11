/**
 * Main Tab Navigator
 * Bottom tab navigation for main app screens
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import TabBar from '../components/navigation/TabBar';

// Import screens from shared
import {
  HomeScreen,
  LiveTVScreen,
  VODScreen,
  RadioScreen,
  PodcastsScreen,
  ProfileScreen,
} from '@bayit/shared-screens';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="LiveTV"
        component={LiveTVScreen}
        options={{ tabBarLabel: 'Live TV' }}
      />
      <Tab.Screen
        name="VOD"
        component={VODScreen}
        options={{ tabBarLabel: 'VOD' }}
      />
      <Tab.Screen
        name="Radio"
        component={RadioScreen}
        options={{ tabBarLabel: 'Radio' }}
      />
      <Tab.Screen
        name="Podcasts"
        component={PodcastsScreen}
        options={{ tabBarLabel: 'Podcasts' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
