/**
 * Main Tab Navigator
 * Bottom tab navigation for main app screens
 *
 * Tabs: Home | Live | VOD | Zeh Ani | Podcasts | Search
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import TabBar from '../components/navigation/TabBar';

// Import mobile screens
import { HomeScreenMobile } from '../screens/SimpleHomeScreenMobile';
import { LiveTVScreenMobile } from '../screens/SimpleLiveTVScreenMobile';
import { VODScreenMobile } from '../screens/VODScreenMobile';
import { PodcastsScreenMobile } from '../screens/SimplePodcastsScreenMobile';
import { SearchScreenMobile } from '../screens/SearchScreenMobile';
import { ZehAniDashboardScreen } from '../screens/ZehAniDashboardScreen';

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
        options={{ tabBarLabel: 'Live' }}
      />
      <Tab.Screen
        name="VOD"
        component={VODScreenMobile}
        options={{ tabBarLabel: 'VOD' }}
      />
      <Tab.Screen
        name="ZehAni"
        component={ZehAniDashboardScreen}
        options={{ tabBarLabel: 'Zeh Ani' }}
      />
      <Tab.Screen
        name="Podcasts"
        component={PodcastsScreenMobile}
        options={{ tabBarLabel: 'Listen' }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreenMobile}
        options={{ tabBarLabel: 'Search' }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;
