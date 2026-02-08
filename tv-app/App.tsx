import './global.css';
import React, { useState, useEffect } from 'react';
import { StatusBar, LogBox, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { initBayitI18nWeb } from '@bayit/i18n/web';
import { useDirection } from '@bayit/shared-hooks';

// Initialize Sentry error tracking
import { initSentry, withSentryErrorBoundary } from './src/utils/sentry';
import logger from './src/utils/logger';

const sentryEnabled = initSentry();
if (sentryEnabled) {
  logger.info('Sentry error tracking enabled', 'App');
}

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
  MorningRitualScreen,
  ProfileSelectionScreen,
  ChildrenScreen,
  JudaismScreen,
  EPGScreen,
  MovieDetailScreen,
  SeriesDetailScreen,
  SettingsScreen,
  RecordingsScreen,
  HelpScreen,
  SupportScreen,
  SubscribeScreen,
} from '@bayit/shared-screens';
import { YoungstersScreen, FlowsScreen, PlaylistScreen } from './src/screens';
import { useAuthStore, useChatbotStore } from '@bayit/shared-stores';
import { ProfileProvider } from '@bayit/shared-contexts';
import { ModalProvider } from '@bayit/shared-contexts';
import { GlassTopBar, GlassSidebar } from '@bayit/shared';
import { VoiceAvatarFAB, VoiceChatModal } from '../shared/components/support';
import { useVoiceSupport } from '@bayit/shared-hooks';
import { supportConfig } from '../shared/config/supportConfig';
import { isWeb } from './src/utils/platform';

// Ignore specific warnings for TV
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
]);

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ProfileSelection: undefined;
  CreateProfile: undefined;
  EditProfile: { profileId: string };
  Main: undefined;
  MorningRitual: undefined;
  Judaism: undefined;
  Children: undefined;
  Youngsters: undefined;
  Flows: undefined;
  Player: {
    id: string;
    title: string;
    type: 'vod' | 'live' | 'radio' | 'podcast' | 'catchup' | 'recording';
  };
  Search: { query?: string };
  Subscribe: undefined;
  Favorites: undefined;
  Downloads: undefined;
  Playlist: undefined;
  EPG: undefined;
  MovieDetail: { movieId: string };
  SeriesDetail: { seriesId: string };
  Settings: undefined;
  Recordings: undefined;
  Help: undefined;
  Support: undefined;
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
    <View className={`flex-row border-t border-[#1a1a2e] py-2 px-12 bg-[#0a0a14] ${isRTL ? 'flex-row' : 'flex-row-reverse'}`}>
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
            className={`flex-1 items-center py-3 rounded-xl ${isFocused ? 'bg-purple-800/30' : ''}`}
            activeOpacity={0.7}
          >
            <Text className="text-[28px] mb-1">{icon}</Text>
            <Text className={`text-base ${isFocused ? 'text-purple-500 font-bold' : 'text-[#666666]'}`}>
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

// Layout constants
const TOP_BAR_HEIGHT = 64;
const SIDEBAR_COLLAPSED_WIDTH = 80;
const SIDEBAR_EXPANDED_WIDTH = 280;

// AppContent component that uses navigation hooks
const AppContent: React.FC = () => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const { isRTL } = useDirection();
  const sidebarWidth = sidebarExpanded ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH;

  // Voice Support for floating wizard hat FAB
  const {
    isVoiceModalOpen,
    isSupported: voiceSupported,
    closeVoiceModal,
    startListening,
    stopListening,
    interrupt,
    activateVoiceAssistant,
  } = useVoiceSupport();

  const handleVoiceAvatarPress = () => {
    // Activate voice assistant (handles intro + modal + listening)
    activateVoiceAssistant();
  };

  return (
    <View className="flex-1 bg-[#0d0d1a]">
      <StatusBar hidden />

      {/* Glass Top Bar */}
      <GlassTopBar onMenuPress={() => setSidebarExpanded(!sidebarExpanded)} sidebarExpanded={sidebarExpanded} />

      {/* Main Content Area */}
      <View className="flex-1 flex-row">
        {/* Glass Sidebar - toggleable on all platforms */}
        <GlassSidebar
          isExpanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />

        {/* Content - with padding for sidebar based on direction */}
        <View className="flex-1" style={isRTL ? { paddingRight: sidebarWidth } : { paddingLeft: sidebarWidth }}>
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
            <Stack.Screen name="ProfileSelection" component={ProfileSelectionScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="MorningRitual"
              component={MorningRitualScreen}
              options={{
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="Judaism"
              component={JudaismScreen}
              options={{
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="Children"
              component={ChildrenScreen}
              options={{
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="Youngsters"
              component={YoungstersScreen}
              options={{
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="Flows"
              component={FlowsScreen}
              options={{
                animation: 'fade',
              }}
            />
            <Stack.Screen
              name="Player"
              component={PlayerScreen}
              options={{
                animation: 'fade',
              }}
            />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="Favorites" component={FavoritesScreen} />
            <Stack.Screen name="Downloads" component={DownloadsScreen} />
            <Stack.Screen name="Playlist" component={PlaylistScreen} />
            <Stack.Screen name="EPG" component={EPGScreen} />
            <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
            <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Recordings" component={RecordingsScreen} />
            <Stack.Screen name="Help" component={HelpScreen} />
            <Stack.Screen name="Support" component={SupportScreen} />
            <Stack.Screen name="Subscribe" component={SubscribeScreen} />
          </Stack.Navigator>
        </View>
      </View>

      {/* Voice Avatar FAB - Floating wizard hat for voice support */}
      {voiceSupported && supportConfig.voiceAssistant.enabled && (
        <VoiceAvatarFAB
          onPress={handleVoiceAvatarPress}
          visible={!isVoiceModalOpen}
        />
      )}

      {/* Voice Chat Modal - Full-screen voice interaction */}
      <VoiceChatModal
        visible={isVoiceModalOpen}
        onClose={closeVoiceModal}
        onStartListening={startListening}
        onStopListening={stopListening}
        onInterrupt={interrupt}
      />
    </View>
  );
};

// Wrapper component that registers chatbot action handlers
const AppContentWithHandlers: React.FC = () => {
  const navigation = useNavigation<any>();
  const { registerActionHandler, unregisterActionHandler } = useChatbotStore();

  // Register chatbot action handlers for voice commands
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

    // Add to playlist
    registerActionHandler('add_to_playlist', (payload: { contentId: string; contentType: string }) => {
      logger.info('Chatbot add to playlist action received', 'App', { payload });
    });

    // Cleanup handlers on unmount
    return () => {
      unregisterActionHandler('navigate');
      unregisterActionHandler('search');
      unregisterActionHandler('play');
      unregisterActionHandler('start_flow');
      unregisterActionHandler('add_to_playlist');
    };
  }, [navigation, registerActionHandler, unregisterActionHandler]);

  return <AppContent />;
};

function App(): React.JSX.Element {
  const [i18nReady, setI18nReady] = useState(false);
  const [i18n, setI18n] = useState<any>(null);

  useEffect(() => {
    // Initialize i18n with async initialization
    initBayitI18nWeb()
      .then((i18nInstance) => {
        setI18n(i18nInstance);
        setI18nReady(true);
      })
      .catch((error) => {
        console.error('Failed to initialize i18n:', error);
        // Still set ready to avoid infinite loading
        setI18nReady(true);
      });
  }, []);

  // Show loading screen while i18n initializes
  if (!i18nReady || !i18n) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0d0d1a' }}>
        <ActivityIndicator size="large" color="#A855F7" />
        <Text style={{ color: '#fff', marginTop: 16, fontSize: 16 }}>Loading...</Text>
      </View>
    );
  }

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

// Wrap with Sentry's error boundary for crash reporting
export default withSentryErrorBoundary(App);
