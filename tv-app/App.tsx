import React, { useState, useEffect } from 'react';
import { StatusBar, LogBox, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n, { loadSavedLanguage } from './src/i18n';
import { useDirection } from './src/hooks/useDirection';
import {
  HomeScreen,
  PlayerScreen,
  LoginScreen,
  LiveTVScreen,
  RadioScreen,
  VODScreen,
  PodcastsScreen,
  SearchScreen,
  RegisterScreen,
  ProfileScreen,
} from './src/screens';
import { useAuthStore } from './src/stores/authStore';
import { AdminNavigator } from './src/navigation/AdminNavigator';
import { GlassTopBar } from './src/components/GlassTopBar';
import { GlassSidebar } from './src/components/GlassSidebar';
import { isWeb } from './src/utils/platform';

// Ignore specific warnings for TV
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Admin: undefined;
  Player: {
    id: string;
    title: string;
    type: 'vod' | 'live' | 'radio' | 'podcast';
  };
  Search: { query?: string };
  Subscribe: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  VOD: undefined;
  LiveTV: undefined;
  Radio: undefined;
  Podcasts: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Custom Tab Bar for TV (hidden on web - uses sidebar instead)
const TVTabBar: React.FC<any> = ({ state, descriptors, navigation }) => {
  // Hide tab bar on web - sidebar handles navigation
  if (isWeb) {
    return null;
  }

  const { t, i18n } = useTranslation();

  // Determine direction based on current language
  const currentLang = i18n.language;
  const isRTL = currentLang === 'he';

  const tabLabels: Record<string, string> = {
    Home: t('nav.home'),
    VOD: t('nav.vod'),
    LiveTV: t('nav.liveTV'),
    Radio: t('nav.radio'),
    Podcasts: t('nav.podcasts'),
    Profile: t('nav.profile'),
  };

  return (
    <View style={[tabStyles.container, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const label = tabLabels[route.name] || route.name;

        const icon = {
          Home: '🏠',
          VOD: '🎬',
          LiveTV: '📺',
          Radio: '📻',
          Podcasts: '🎙️',
          Profile: '👤',
        }[route.name] || '•';

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={[
              tabStyles.tab,
              isFocused && tabStyles.tabFocused,
            ]}
            activeOpacity={0.7}
          >
            <Text style={tabStyles.icon}>{icon}</Text>
            <Text
              style={[
                tabStyles.label,
                isFocused && tabStyles.labelFocused,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Main Tab Navigator
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <TVTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'ראשי' }}
      />
      <Tab.Screen
        name="VOD"
        component={VODScreen}
        options={{ tabBarLabel: 'סרטים' }}
      />
      <Tab.Screen
        name="LiveTV"
        component={LiveTVScreen}
        options={{ tabBarLabel: 'שידור חי' }}
      />
      <Tab.Screen
        name="Radio"
        component={RadioScreen}
        options={{ tabBarLabel: 'רדיו' }}
      />
      <Tab.Screen
        name="Podcasts"
        component={PodcastsScreen}
        options={{ tabBarLabel: 'פודקאסטים' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'פרופיל' }}
      />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row', // Dynamic direction applied in component
    backgroundColor: '#0a0a14',
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
    paddingVertical: 8,
    paddingHorizontal: 48,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  tabFocused: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  icon: {
    fontSize: 28,
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    color: '#666666',
  },
  labelFocused: {
    color: '#00d9ff',
    fontWeight: 'bold',
  },
});

// Layout constants
const TOP_BAR_HEIGHT = 64;
const SIDEBAR_COLLAPSED_WIDTH = 80;
const SIDEBAR_EXPANDED_WIDTH = 280;

// AppContent component that uses navigation hooks
const AppContent: React.FC = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const { isRTL } = useDirection();
  const sidebarWidth = sidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;

  return (
    <View style={appStyles.container}>
      <StatusBar hidden />

      {/* Glass Top Bar */}
      <GlassTopBar onMenuPress={() => setSidebarExpanded(!sidebarExpanded)} sidebarExpanded={sidebarExpanded} />

      {/* Main Content Area */}
      <View style={appStyles.mainArea}>
        {/* Glass Sidebar - toggleable on all platforms */}
        <GlassSidebar
          isExpanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />

        {/* Content - with padding for sidebar based on direction */}
        <View style={[appStyles.content, isRTL ? { paddingRight: sidebarWidth } : { paddingLeft: sidebarWidth }]}>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: '#0d0d1a' },
            }}
            initialRouteName={'Main'}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="Player"
              component={PlayerScreen}
              options={{
                animation: 'fade',
              }}
            />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="Admin" component={AdminNavigator} />
          </Stack.Navigator>
        </View>
      </View>
    </View>
  );
};

function App(): React.JSX.Element {
  useEffect(() => {
    // Load saved language preference on app start
    loadSavedLanguage();
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppContent />
        </NavigationContainer>
      </SafeAreaProvider>
    </I18nextProvider>
  );
}

const appStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  mainArea: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
});

export default App;
