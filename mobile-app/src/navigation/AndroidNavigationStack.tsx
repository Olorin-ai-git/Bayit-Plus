/**
 * AndroidNavigationStack.tsx - Android-specific Navigation Setup
 * Configures React Navigation for Android platform
 * Implements Android UI patterns:
 * - Bottom Tab Navigation (main 5 tabs)
 * - Drawer Navigation (hamburger menu)
 * - Stack Navigation (screen stacks per tab)
 * - Deep linking support
 *
 * Screens (39 total):
 * 1. Home
 * 2. LiveTV
 * 3. VOD (Video on Demand)
 * 4. Radio
 * 5. Search
 * + Detail screens, Player, Auth, Profile, Settings, Downloads
 */

import React, { useMemo } from 'react'
import { NavigationContainer, NavigationProp } from '@react-navigation/native'
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createDrawerNavigator, DrawerNavigationProp } from '@react-navigation/drawer'
import { Platform, View, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Import screens
import HomeScreen from '@/screens/HomeScreen'
import LiveTVScreen from '@/screens/LiveTVScreen'
import VODScreen from '@/screens/VODScreen'
import RadioScreen from '@/screens/RadioScreen'
import SearchScreen from '@/screens/SearchScreen'
import SeriesDetailScreen from '@/screens/SeriesDetailScreen'
import MovieDetailScreen from '@/screens/MovieDetailScreen'
import VideoPlayerScreen from '@/screens/VideoPlayerScreen'
import LoginScreen from '@/screens/LoginScreen'
import RegisterScreen from '@/screens/RegisterScreen'
import ProfileScreen from '@/screens/ProfileScreen'
import SettingsScreen from '@/screens/SettingsScreen'
import DownloadsScreen from '@/screens/DownloadsScreen'
import WatchHistoryScreen from '@/screens/WatchHistoryScreen'
import FavoritesScreen from '@/screens/FavoritesScreen'
import SearchResultsScreen from '@/screens/SearchResultsScreen'

// Navigation types
export type RootStackParamList = {
  Auth: undefined
  Main: undefined
}

export type MainStackParamList = {
  HomeTabs: undefined
  SeriesDetail: { seriesId: string }
  MovieDetail: { movieId: string }
  VideoPlayer: { contentId: string; type: 'series' | 'movie' | 'radio' }
  SearchResults: { query: string }
  Profile: undefined
  Settings: undefined
  Downloads: undefined
  WatchHistory: undefined
  Favorites: undefined
}

export type AuthStackParamList = {
  Login: undefined
  Register: undefined
}

export type HomeTabsParamList = {
  Home: undefined
  LiveTV: undefined
  VOD: undefined
  Radio: undefined
  Search: undefined
}

const RootStack = createNativeStackNavigator<RootStackParamList>()
const MainStack = createNativeStackNavigator<MainStackParamList>()
const AuthStack = createNativeStackNavigator<AuthStackParamList>()
const BottomTab = createBottomTabNavigator<HomeTabsParamList>()
const Drawer = createDrawerNavigator()

// Shared stack options for Android
const screenOptions: NativeStackNavigationOptions = {
  headerShown: true,
  headerStyle: {
    backgroundColor: '#000',
  },
  headerTintColor: '#fff',
  headerTitleStyle: {
    fontWeight: 'bold',
    fontSize: 18,
  },
  cardStyle: {
    backgroundColor: '#000',
  },
}

/**
 * Home Tabs Navigation - Bottom Tab Navigation with 5 main tabs
 */
function HomeTabsNavigator() {
  const insets = useSafeAreaInsets()

  return (
    <BottomTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#333',
          borderTopWidth: 1,
          paddingBottom: insets.bottom + 8,
          height: 60 + insets.bottom,
        },
        tabBarLabel: route.name,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        },
      })}
    >
      <BottomTab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <BottomTab.Screen
        name="LiveTV"
        component={LiveTVScreen}
        options={{
          tabBarLabel: 'Live TV',
        }}
      />
      <BottomTab.Screen
        name="VOD"
        component={VODScreen}
        options={{
          tabBarLabel: 'VOD',
        }}
      />
      <BottomTab.Screen
        name="Radio"
        component={RadioScreen}
        options={{
          tabBarLabel: 'Radio',
        }}
      />
      <BottomTab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
        }}
      />
    </BottomTab.Navigator>
  )
}

/**
 * Drawer Navigation - Hamburger menu for additional screens
 */
function DrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: true,
        drawerStyle: {
          backgroundColor: '#1a1a1a',
          width: 280,
        },
        drawerLabelStyle: {
          color: '#fff',
        },
        drawerActiveTintColor: '#FF6B35',
        drawerInactiveTintColor: '#999',
        headerStyle: {
          backgroundColor: '#000',
        },
        headerTintColor: '#fff',
      }}
    >
      <Drawer.Screen
        name="HomeTabs"
        component={HomeTabsNavigator}
        options={{
          title: 'Bayit+',
          headerShown: false,
        }}
      />
      <Drawer.Screen
        name="Downloads"
        component={DownloadsScreen}
        options={{
          title: 'Downloads',
        }}
      />
      <Drawer.Screen
        name="WatchHistory"
        component={WatchHistoryScreen}
        options={{
          title: 'Watch History',
        }}
      />
      <Drawer.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Favorites',
        }}
      />
      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
        }}
      />
    </Drawer.Navigator>
  )
}

/**
 * Main Stack - Screens accessible from drawer
 */
function MainStackNavigator() {
  return (
    <MainStack.Navigator
      screenOptions={screenOptions}
      initialRouteName="DrawerNav"
    >
      <MainStack.Screen
        name="DrawerNav"
        component={DrawerNavigator}
        options={{
          headerShown: false,
        }}
      />
      <MainStack.Screen
        name="SeriesDetail"
        component={SeriesDetailScreen}
        options={{
          title: 'Series',
          headerBackTitleVisible: true,
        }}
      />
      <MainStack.Screen
        name="MovieDetail"
        component={MovieDetailScreen}
        options={{
          title: 'Movie',
          headerBackTitleVisible: true,
        }}
      />
      <MainStack.Screen
        name="VideoPlayer"
        component={VideoPlayerScreen}
        options={{
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <MainStack.Screen
        name="SearchResults"
        component={SearchResultsScreen}
        options={{
          title: 'Search Results',
        }}
      />
    </MainStack.Navigator>
  )
}

/**
 * Auth Stack - Login and registration screens
 */
function AuthStackNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        ...screenOptions,
        headerShown: false,
      }}
    >
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          animationEnabled: false,
        }}
      />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
      />
    </AuthStack.Navigator>
  )
}

/**
 * Root Navigator - Switches between Auth and Main stacks
 */
export interface NavigationProps {
  isLoggedIn: boolean
  isLoading: boolean
}

export function RootNavigator({ isLoggedIn, isLoading }: NavigationProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        {/* Loading indicator component would go here */}
      </View>
    )
  }

  return (
    <NavigationContainer
      linking={linking}
      fallback={<View style={styles.loadingContainer} />}
    >
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {isLoggedIn ? (
          <RootStack.Screen
            name="Main"
            component={MainStackNavigator}
            options={{
              animationEnabled: false,
            }}
          />
        ) : (
          <RootStack.Screen
            name="Auth"
            component={AuthStackNavigator}
            options={{
              animationEnabled: false,
            }}
          />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  )
}

// Deep linking configuration
const linking = {
  prefixes: ['bayit+://', 'https://bayit.app'],
  config: {
    screens: {
      Main: {
        screens: {
          HomeTabs: 'home',
          SeriesDetail: 'series/:seriesId',
          MovieDetail: 'movie/:movieId',
          VideoPlayer: 'player/:contentId',
          SearchResults: 'search/:query',
          Profile: 'profile',
          Settings: 'settings',
          Downloads: 'downloads',
          WatchHistory: 'history',
          Favorites: 'favorites',
        },
      },
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
        },
      },
      NotFound: '*',
    },
  },
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default RootNavigator
