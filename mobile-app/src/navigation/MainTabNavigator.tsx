/**
 * Main Tab Navigator
 * Bottom tab navigation for main app screens
 *
 * Updated to use mobile-optimized screens with responsive design
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import TabBar from '../components/navigation/TabBar';

// Import mobile-optimized screens
import {
  HomeScreenMobile,
  LiveTVScreenMobile,
  VODScreenMobile,
  RadioScreenMobile,
  PodcastsScreenMobile,
  ProfileScreenMobile,
} from '../screens';

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
        component={HomeScreenMobile}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="LiveTV"
        component={LiveTVScreenMobile}
        options={{ tabBarLabel: 'Live TV' }}
      />
      <Tab.Screen
        name="VOD"
        component={VODScreenMobile}
        options={{ tabBarLabel: 'VOD' }}
      />
      <Tab.Screen
        name="Radio"
        component={RadioScreenMobile}
        options={{ tabBarLabel: 'Radio' }}
      />
      <Tab.Screen
        name="Podcasts"
        component={PodcastsScreenMobile}
        options={{ tabBarLabel: 'Podcasts' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreenMobile}
        options={{ tabBarLabel: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
