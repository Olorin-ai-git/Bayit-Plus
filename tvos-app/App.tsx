import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar, LogBox, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n, { loadSavedLanguage } from '@bayit/shared-i18n';
import { useDirection } from '@bayit/shared-hooks';
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
  FavoritesScreen,
  DownloadsScreen,
  WatchlistScreen,
  MorningRitualScreen,
  ProfileSelectionScreen,
  ChildrenScreen,
  FlowsScreen,
  JudaismScreen,
} from '@bayit/shared-screens';
import { ProfileProvider } from '@bayit/shared-contexts';
import { ModalProvider } from '@bayit/shared-contexts';
import { GlassTopBar, GlassSidebar, DemoBanner } from '@bayit/shared';
import { useChatbotStore } from '@bayit/shared-stores';

// Ignore specific warnings for TV
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ProfileSelection: undefined;
  Main: undefined;
  MorningRitual: undefined;
  Judaism: undefined;
  Children: undefined;
  Flows: undefined;
  Player: {
    id: string;
    title: string;
    type: 'vod' | 'live' | 'radio' | 'podcast';
  };
  Search: { query?: string };
  Favorites: undefined;
  Downloads: undefined;
  Watchlist: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  VOD: undefined;
  LiveTV: undefined;
  Radio: undefined;
  Podcasts: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Custom Tab Bar for Apple TV
const TVTabBar: React.FC<any> = ({ state, descriptors, navigation }) => {
  const { t, i18n } = useTranslation();
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

        const icons: Record<string, string> = {
          Home: '🏠',
          VOD: '🎬',
          LiveTV: '📺',
          Radio: '📻',
          Podcasts: '🎙️',
          Profile: '👤',
        };
        const icon = icons[route.name as string] || '•';

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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="VOD" component={VODScreen} />
      <Tab.Screen name="LiveTV" component={LiveTVScreen} />
      <Tab.Screen name="Radio" component={RadioScreen} />
      <Tab.Screen name="Podcasts" component={PodcastsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
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
const SIDEBAR_COLLAPSED_WIDTH = 80;
const SIDEBAR_EXPANDED_WIDTH = 280;

// App Content with Navigation
const AppContent: React.FC = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const { isRTL } = useDirection();
  const sidebarWidth = sidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;

  return (
    <View style={appStyles.container}>
      <StatusBar hidden />

      {/* Demo Mode Banner */}
      <DemoBanner />

      {/* Glass Top Bar with Soundwave Visualizer */}
      <GlassTopBar
        onMenuPress={() => setSidebarExpanded(!sidebarExpanded)}
        sidebarExpanded={sidebarExpanded}
      />

      {/* Main Content Area */}
      <View style={appStyles.mainArea}>
        {/* Glass Sidebar */}
        <GlassSidebar
          isExpanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />

        {/* Content - with padding for sidebar based on direction */}
        <View style={[appStyles.content, isRTL ? { paddingRight: sidebarWidth } : { paddingLeft: sidebarWidth }]}>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: '#0d0d1a' },
            }}
            initialRouteName="Main"
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ProfileSelection" component={ProfileSelectionScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="MorningRitual" component={MorningRitualScreen} />
            <Stack.Screen name="Judaism" component={JudaismScreen} />
            <Stack.Screen name="Children" component={ChildrenScreen} />
            <Stack.Screen name="Flows" component={FlowsScreen} />
            <Stack.Screen name="Player" component={PlayerScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="Downloads" component={DownloadsScreen} />
            <Stack.Screen name="Watchlist" component={WatchlistScreen} />
          </Stack.Navigator>
        </View>
      </View>
    </View>
  );
};

// Wrapper component that registers chatbot action handlers
const AppContentWithHandlers: React.FC = () => {
  const navigation = useNavigation<any>();
  const { registerActionHandler, unregisterActionHandler } = useChatbotStore();

  // Register chatbot action handlers
  useEffect(() => {
    // Navigate to a specific screen
    registerActionHandler('navigate', (payload: { screen: string; params?: any }) => {
      navigation.navigate(payload.screen, payload.params);
    });

    // Search for content
    registerActionHandler('search', (payload: { query: string }) => {
      navigation.navigate('Search', { query: payload.query });
    });

    // Play content
    registerActionHandler('play', (payload: { id: string; title: string; type: 'vod' | 'live' | 'radio' | 'podcast' }) => {
      navigation.navigate('Player', payload);
    });

    // Start a flow
    registerActionHandler('start_flow', (payload: { flowId: string }) => {
      navigation.navigate('Flows', { flowId: payload.flowId, autoStart: true });
    });

    // Add to watchlist (would need API integration)
    registerActionHandler('add_to_watchlist', (payload: { contentId: string; contentType: string }) => {
      console.log('[Chatbot] Add to watchlist:', payload);
      // TODO: Integrate with watchlist API
    });

    // Cleanup handlers on unmount
    return () => {
      unregisterActionHandler('navigate');
      unregisterActionHandler('search');
      unregisterActionHandler('play');
      unregisterActionHandler('start_flow');
      unregisterActionHandler('add_to_watchlist');
    };
  }, [navigation, registerActionHandler, unregisterActionHandler]);

  return <AppContent />;
};

function App(): React.JSX.Element {
  useEffect(() => {
    loadSavedLanguage();
    console.log('🎬 Bayit+ tvOS App starting...');
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        <ModalProvider>
          <ProfileProvider>
            <NavigationContainer>
              <AppContentWithHandlers />
            </NavigationContainer>
          </ProfileProvider>
        </ModalProvider>
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
