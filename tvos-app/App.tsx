import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar, LogBox, View, StyleSheet, Pressable, Text } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import i18n, { loadSavedLanguage } from '@bayit/shared-i18n';
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
  EPGScreen,
  MovieDetailScreen,
  SeriesDetailScreen,
  SettingsScreen,
  RecordingsScreen,
  HelpScreen,
} from '@bayit/shared-screens';
import { AdminNavigator } from './src/navigation/AdminNavigator';
import ProfileFormScreen from './src/screens/ProfileFormScreen';
import SubscribeScreen from './src/screens/SubscribeScreen';
import { ProfileProvider } from '@bayit/shared-contexts';
import { ModalProvider } from '@bayit/shared-contexts';
import { DemoBanner, SoundwaveVisualizer } from '@bayit/shared';
import { Chatbot } from '@bayit/shared/chat';
import { useChatbotStore, useAuthStore, useVoiceSettingsStore } from '@bayit/shared-stores';
import { chatService } from '@bayit/shared-services';
import { TVHeader } from './src/components/TVHeader';
import { useTVConstantListening } from './src/hooks/useTVConstantListening';
import { SplashScreen } from './src/components/SplashScreen';

// Ignore specific warnings for TV
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
  'new NativeEventEmitter',
  'Persistent storage is not supported',
  '[TV Voice]',
]);

// Hide LogBox in development for TV (the yellow bar covers the header)
LogBox.ignoreAllLogs(true);

// Full-width Soundwave Component
const FullWidthSoundwave: React.FC<{
  audioLevel: number;
  isListening: boolean;
  isProcessing: boolean;
}> = ({ audioLevel, isListening, isProcessing }) => {
  const [tick, setTick] = useState(0);

  // Animate when listening
  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => setTick(t => t + 1), 100);
      return () => clearInterval(interval);
    }
  }, [isListening]);

  const barCount = 100;
  const baseHeight = 4;
  const maxHeight = 28;

  return (
    <View style={soundwaveStyles.container}>
      {Array.from({ length: barCount }).map((_, i) => {
        const phase = (tick * 0.3) + (i / barCount) * Math.PI * 6;
        const wave = Math.sin(phase) * 0.5 + 0.5;

        let height = baseHeight;
        if (isProcessing && audioLevel > 0.01) {
          // Active speaking - react to audio level
          height = baseHeight + (maxHeight - baseHeight) * audioLevel * 3 * (0.5 + wave * 0.5);
        } else if (isListening) {
          // Idle listening - gentle wave
          height = baseHeight + 6 * wave;
        }

        return (
          <View
            key={i}
            style={[
              soundwaveStyles.bar,
              {
                height: Math.max(baseHeight, Math.min(maxHeight, height)),
                opacity: isListening ? 0.9 : 0.25,
              }
            ]}
          />
        );
      })}
    </View>
  );
};

const soundwaveStyles = StyleSheet.create({
  container: {
    height: 36,
    width: '100%',
    backgroundColor: 'rgba(0, 12, 24, 0.95)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(107, 33, 168, 0.3)',
  },
  bar: {
    width: 3,
    marginHorizontal: 2,
    backgroundColor: '#a855f7',
    borderRadius: 2,
  },
});

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
  Flows: undefined;
  Player: {
    id: string;
    title: string;
    type: 'vod' | 'live' | 'radio' | 'podcast' | 'catchup' | 'recording';
  };
  Search: { query?: string };
  Subscribe: undefined;
  Admin: undefined;
  Favorites: undefined;
  Downloads: undefined;
  Watchlist: undefined;
  EPG: undefined;
  MovieDetail: { movieId: string };
  SeriesDetail: { seriesId: string };
  Settings: undefined;
  Recordings: undefined;
  Help: undefined;
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

// Main Tab Navigator (tabs hidden - using header navigation)
function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={() => null}
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

// App Content with Navigation (matching web app layout)
const AppContent: React.FC = () => {
  const navigation = useNavigation<any>();
  const [currentRoute, setCurrentRoute] = useState('Home');
  const [chatbotVisible, setChatbotVisible] = useState(false);
  const { sendMessage, toggleOpen } = useChatbotStore();
  const { preferences } = useVoiceSettingsStore();

  // Voice control - constant listening for TV
  const handleVoiceTranscript = useCallback((text: string) => {
    if (text) {
      console.log('[TV Voice] Transcript:', text);
      toggleOpen();
      sendMessage(text);
    }
  }, [sendMessage, toggleOpen]);

  // Use tvOS-specific TurboModule for wake word listening
  const {
    isListening,
    isProcessing,
    isSendingToServer,
    audioLevel,
  } = useTVConstantListening({
    enabled: preferences?.wake_word_enabled ?? true,
    onTranscript: handleVoiceTranscript,
    onError: (error) => console.warn('[TV Voice]', error.message),
    silenceThresholdMs: preferences?.silence_threshold_ms || 2500,
    vadSensitivity: preferences?.vad_sensitivity || 'medium',
    transcribeAudio: chatService.transcribeAudio,
  });

  // Track navigation state changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e: any) => {
      const state = e.data?.state;
      if (state?.routes) {
        const route = state.routes[state.index];
        // Handle nested navigators (e.g., Main tabs)
        if (route.state?.routes) {
          setCurrentRoute(route.state.routes[route.state.index]?.name || 'Home');
        } else {
          setCurrentRoute(route.name);
        }
      }
    });
    return unsubscribe;
  }, [navigation]);

  // Handle navigation from header tabs
  const handleNavigate = useCallback((route: string) => {
    // Main tab screens navigate within Main
    const mainTabScreens = ['Home', 'LiveTV', 'VOD', 'Radio', 'Podcasts', 'Profile'];
    if (mainTabScreens.includes(route)) {
      navigation.navigate('Main', { screen: route });
    } else {
      navigation.navigate(route);
    }
    setCurrentRoute(route);
  }, [navigation]);

  // Open chatbot
  const handleChatbotOpen = useCallback(() => {
    setChatbotVisible(true);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Demo Mode Banner */}
      <DemoBanner />

      {/* TV Header with Horizontal Navigation (matching web layout) */}
      <TVHeader
        currentRoute={currentRoute}
        onNavigate={handleNavigate}
        onChatbotOpen={handleChatbotOpen}
      />

      {/* Full-width Soundwave Indicator Bar */}
      <FullWidthSoundwave
        audioLevel={audioLevel?.average || 0}
        isListening={isListening}
        isProcessing={isProcessing}
      />

      {/* Main Content Area - Full Width (no sidebar) */}
      <View style={styles.content}>
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
          <Stack.Screen name="CreateProfile" component={ProfileFormScreen} />
          <Stack.Screen name="EditProfile" component={ProfileFormScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="MorningRitual" component={MorningRitualScreen} />
          <Stack.Screen name="Judaism" component={JudaismScreen} />
          <Stack.Screen name="Children" component={ChildrenScreen} />
          <Stack.Screen name="Flows" component={FlowsScreen} />
          <Stack.Screen name="Player" component={PlayerScreen} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Subscribe" component={SubscribeScreen} />
          <Stack.Screen name="Admin" component={AdminNavigator} />
          <Stack.Screen name="Favorites" component={FavoritesScreen} />
          <Stack.Screen name="Downloads" component={DownloadsScreen} />
          <Stack.Screen name="Watchlist" component={WatchlistScreen} />
          <Stack.Screen name="EPG" component={EPGScreen} />
          <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
          <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Recordings" component={RecordingsScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
        </Stack.Navigator>
      </View>

      {/* Floating Chatbot Button */}
      {!chatbotVisible && (
        <Pressable
          onPress={handleChatbotOpen}
          style={({ focused }) => [
            styles.chatFab,
            focused && styles.chatFabFocused,
          ]}
        >
          <Text style={styles.chatFabIcon}>✨</Text>
        </Pressable>
      )}

      {/* Chatbot Modal */}
      <Chatbot
        visible={chatbotVisible}
        onClose={() => setChatbotVisible(false)}
      />
    </View>
  );
};

// Wrapper component that registers chatbot action handlers
const AppContentWithHandlers: React.FC = () => {
  const navigation = useNavigation<any>();
  const { registerActionHandler, unregisterActionHandler } = useChatbotStore();
  const { user } = useAuthStore();

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

    // Add to watchlist
    registerActionHandler('add_to_watchlist', (payload: { contentId: string; contentType: string }) => {
      console.log('[Chatbot] Add to watchlist:', payload);
    });

    // Navigate to subscribe screen
    registerActionHandler('subscribe', () => {
      navigation.navigate('Subscribe');
    });

    // Manage profiles
    registerActionHandler('manage_profiles', () => {
      navigation.navigate('ProfileSelection');
    });

    // Open admin (only for admin users)
    registerActionHandler('open_admin', () => {
      if (user?.role === 'admin') {
        navigation.navigate('Admin');
      } else {
        console.log('[Chatbot] Admin access denied - user is not admin');
      }
    });

    // Cleanup handlers on unmount
    return () => {
      unregisterActionHandler('navigate');
      unregisterActionHandler('search');
      unregisterActionHandler('play');
      unregisterActionHandler('start_flow');
      unregisterActionHandler('add_to_watchlist');
      unregisterActionHandler('subscribe');
      unregisterActionHandler('manage_profiles');
      unregisterActionHandler('open_admin');
    };
  }, [navigation, registerActionHandler, unregisterActionHandler, user?.role]);

  return <AppContent />;
};

function App(): React.JSX.Element {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    loadSavedLanguage();
    console.log('🎬 Bayit+ tvOS App starting...');
  }, []);

  const handleSplashComplete = useCallback(() => {
    console.log('🎬 Splash complete, showing main app');
    setShowSplash(false);
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <SafeAreaProvider>
        {showSplash ? (
          <SplashScreen onComplete={handleSplashComplete} minimumDuration={3000} />
        ) : (
          <ModalProvider>
            <ProfileProvider>
              <NavigationContainer>
                <AppContentWithHandlers />
              </NavigationContainer>
            </ProfileProvider>
          </ModalProvider>
        )}
      </SafeAreaProvider>
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d1a',
  },
  content: {
    flex: 1,
  },
  chatFab: {
    position: 'absolute',
    bottom: 40,
    right: 40,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(168, 85, 247, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#a855f7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  chatFabFocused: {
    backgroundColor: 'rgba(168, 85, 247, 0.4)',
    borderColor: '#a855f7',
    transform: [{ scale: 1.1 }],
  },
  chatFabIcon: {
    fontSize: 32,
  },
});

export default App;
