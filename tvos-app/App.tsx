import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar, LogBox, View, Pressable, Text, Animated } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n, { loadSavedLanguage } from '@bayit/shared-i18n';
import { GlassAlert, GlassAlertRoot } from '@bayit/shared/components/ui';
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
  SupportScreen,
  SubscribeScreen,
} from '@bayit/shared-screens';
import ProfileFormScreen from './src/screens/ProfileFormScreen';
import { ProfileProvider } from '@bayit/shared-contexts';
import { ModalProvider } from '@bayit/shared-contexts';
import { DemoBanner, SoundwaveVisualizer, ErrorBoundary } from '@bayit/shared';
import { VoiceAvatarFAB, VoiceChatModal } from '@bayit/shared/components/support';
import { useVoiceSupport } from '@bayit/shared-hooks';
import { supportConfig } from '@bayit/shared-config/supportConfig';
import { Chatbot } from '@bayit/shared/chat';
import { useChatbotStore, useVoiceSettingsStore } from '@bayit/shared-stores';
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
    <View className="h-9 w-full bg-[rgba(0,12,24,0.95)] flex-row justify-center items-center border-b border-[rgba(107,33,168,0.3)]">
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
            className="w-[3px] mx-0.5 bg-purple-500 rounded-sm"
            style={{
              height: Math.max(baseHeight, Math.min(maxHeight, height)),
              opacity: isListening ? 0.9 : 0.25,
            }}
          />
        );
      })}
    </View>
  );
};


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
  Favorites: undefined;
  Downloads: undefined;
  Watchlist: undefined;
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

  // Voice Support for floating wizard hat FAB
  const {
    isVoiceModalOpen,
    isSupported: voiceSupported,
    closeVoiceModal,
    startListening: startVoiceListening,
    stopListening: stopVoiceListening,
    interrupt,
    activateVoiceAssistant,
  } = useVoiceSupport();

  const handleVoiceAvatarPress = useCallback(() => {
    // Activate voice assistant (handles intro + modal + listening)
    activateVoiceAssistant();
  }, [activateVoiceAssistant]);

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
    <View className="flex-1 bg-[#0d0d1a]">
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
      <View className="flex-1">
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
          <Stack.Screen name="Favorites" component={FavoritesScreen} />
          <Stack.Screen name="Downloads" component={DownloadsScreen} />
          <Stack.Screen name="Watchlist" component={WatchlistScreen} />
          <Stack.Screen name="EPG" component={EPGScreen} />
          <Stack.Screen name="MovieDetail" component={MovieDetailScreen} />
          <Stack.Screen name="SeriesDetail" component={SeriesDetailScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Recordings" component={RecordingsScreen} />
          <Stack.Screen name="Help" component={HelpScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
        </Stack.Navigator>
      </View>

      {/* Floating Chatbot Button */}
      {!chatbotVisible && (
        <Pressable
          onPress={handleChatbotOpen}
          className="absolute bottom-10 right-10 w-[70px] h-[70px] rounded-full bg-[rgba(107,33,168,0.3)] border-2 border-[rgba(168,85,247,0.6)] justify-center items-center shadow-lg shadow-purple-500/30 focus:bg-[rgba(168,85,247,0.4)] focus:border-purple-500 focus:scale-110"
        >
          <Text className="text-[32px]">✨</Text>
        </Pressable>
      )}

      {/* Chatbot Modal */}
      <Chatbot
        visible={chatbotVisible}
        onClose={() => setChatbotVisible(false)}
      />

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
        onStartListening={startVoiceListening}
        onStopListening={stopVoiceListening}
        onInterrupt={interrupt}
      />
    </View>
  );
};

// Wrapper component that registers chatbot action handlers
const AppContentWithHandlers: React.FC = () => {
  const navigation = useNavigation<any>();
  const { registerActionHandler, unregisterActionHandler } = useChatbotStore();
  const { t, i18n } = useTranslation();

  // Register chatbot action handlers
  useEffect(() => {
    // Navigate to a specific screen
    registerActionHandler('navigate', (payload: { screen: string; target?: string; params?: any }) => {
      // Handle 'target' property from voice commands
      if (payload.target) {
        const screenMap: Record<string, string> = {
          movies: 'VOD',
          series: 'VOD',
          channels: 'LiveTV',
          radio: 'Radio',
          podcasts: 'Podcasts',
          home: 'Home',
          chess: 'Games',
          games: 'Games',
          flows: 'Flows',
          judaism: 'Judaism',
          children: 'Children',
        };
        const screen = screenMap[payload.target] || 'Home';
        const mainTabScreens = ['Home', 'LiveTV', 'VOD', 'Radio', 'Podcasts'];
        if (mainTabScreens.includes(screen)) {
          navigation.navigate('Main', { screen });
        } else {
          navigation.navigate(screen);
        }
      } else {
        navigation.navigate(payload.screen, payload.params);
      }
    });

    // Search for content
    registerActionHandler('search', (payload: { query: string }) => {
      navigation.navigate('Search', { query: payload.query });
    });

    // Play content
    registerActionHandler('play', (payload: { id: string; content_id?: string; title: string; type: 'vod' | 'live' | 'radio' | 'podcast' }) => {
      const contentId = payload.content_id || payload.id;
      navigation.navigate('Player', { ...payload, id: contentId });
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

    // Show Multiple - display multiple content items
    // On tvOS, we don't have multi-widget support, so we play the first item
    registerActionHandler('show_multiple', async (payload: { items: Array<{ name: string; type: string }> }) => {
      console.log('[tvOS Chatbot] show_multiple action with items:', payload.items);

      if (!payload.items || payload.items.length === 0) {
        console.warn('[tvOS Chatbot] show_multiple called with no items');
        return;
      }

      try {
        // Call the resolve-content API
        const resolveResponse = await chatService.resolveContent(
          payload.items.map((item) => ({
            name: item.name,
            type: item.type || 'any'
          })),
          i18n.language
        );

        if (resolveResponse.items && resolveResponse.items.length > 0) {
          const firstItem = resolveResponse.items[0];

          GlassAlert.alert(
            t('chatbot.showMultipleSuccess', { count: resolveResponse.items.length }),
            t('tvos.playingFirstItem', { name: firstItem.name, defaultValue: `Playing: ${firstItem.name}` }),
            [
              {
                text: t('common.ok'),
                onPress: () => {
                  if (firstItem.type === 'channel') {
                    navigation.navigate('Player', { id: firstItem.id, type: 'live', title: firstItem.name });
                  } else {
                    navigation.navigate('Player', { id: firstItem.id, type: 'vod', title: firstItem.name });
                  }
                }
              }
            ]
          );
        } else {
          GlassAlert.alert(
            t('common.error'),
            t('chatbot.showMultipleNotFound')
          );
        }
      } catch (error) {
        console.error('[tvOS Chatbot] Error resolving content:', error);
        GlassAlert.alert(
          t('common.error'),
          t('chatbot.errors.general')
        );
      }
    });

    // Chess Invite - navigate to games/chess with invite params
    registerActionHandler('chess_invite', async (payload: { friendName: string }) => {
      console.log('[tvOS Chatbot] chess_invite action for friend:', payload.friendName);

      // On tvOS, navigate to a Games screen (if exists) with chess invite params
      // For now, show an alert since Chess screen may not exist
      GlassAlert.alert(
        t('chess.title'),
        t('chess.sendingInvite', { name: payload.friendName }),
        [{ text: t('common.ok') }]
      );
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
      unregisterActionHandler('show_multiple');
      unregisterActionHandler('chess_invite');
    };
  }, [navigation, registerActionHandler, unregisterActionHandler, t, i18n.language]);

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
        <GlassAlertRoot>
          {showSplash ? (
            <SplashScreen onComplete={handleSplashComplete} minimumDuration={3000} />
          ) : (
            <ErrorBoundary>
              <ModalProvider>
                <ProfileProvider>
                  <NavigationContainer>
                    <AppContentWithHandlers />
                  </NavigationContainer>
                </ProfileProvider>
              </ModalProvider>
            </ErrorBoundary>
          )}
        </GlassAlertRoot>
      </SafeAreaProvider>
    </I18nextProvider>
  );
}

export default App;
