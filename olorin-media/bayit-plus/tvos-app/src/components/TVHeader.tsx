/**
 * TV Header Component for tvOS
 *
 * Mirrors the web app's Header.tsx layout using shared components.
 * Uses the same navLinks, styles, and component structure.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useChatbotStore, useVoiceSettingsStore } from '@bayit/shared-stores';
import { VoiceSearchButton, LanguageSelector, AnimatedLogo, SoundwaveVisualizer } from '@bayit/shared';
import { ProfileDropdown } from '@bayit/shared/ProfileDropdown';
import { colors, spacing } from '@bayit/shared/theme';
import LinearGradient from 'react-native-linear-gradient';
import { chatService } from '@bayit/shared-services';
import { useConstantListening } from '@bayit/shared-hooks';

// Navigation links - matching web app navigation with TV-specific additions
const navLinkKeys = [
  { route: 'Home', key: 'nav.home' },
  { route: 'LiveTV', key: 'nav.liveTV' },
  { route: 'EPG', key: 'nav.epg' },
  { route: 'VOD', key: 'nav.vod' },
  { route: 'Radio', key: 'nav.radio' },
  { route: 'Podcasts', key: 'nav.podcasts' },
  { route: 'Flows', key: 'nav.flows' },
  { route: 'Judaism', key: 'nav.judaism' },
  { route: 'Children', key: 'nav.children' },
];

interface TVHeaderProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  onChatbotOpen?: () => void;
}

export const TVHeader: React.FC<TVHeaderProps> = ({
  currentRoute,
  onNavigate,
  onChatbotOpen,
}) => {
  const { i18n, t } = useTranslation();
  const navigation = useNavigation<any>();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { sendMessage, toggleOpen } = useChatbotStore();
  const { preferences } = useVoiceSettingsStore();
  const { width } = useWindowDimensions();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  // Focus states for TV navigation
  const [focusedNav, setFocusedNav] = useState<string | null>(null);
  const [focusedAction, setFocusedAction] = useState<string | null>(null);

  // Voice settings for TV
  const [micAvailable, setMicAvailable] = useState<boolean | null>(null);
  const wakeWordActive = preferences?.wake_word_enabled && micAvailable === true;

  // Check if microphone is available
  useEffect(() => {
    // On tvOS, we assume mic is available via native module
    // The native AudioCaptureModule handles mic access
    setMicAvailable(true);
  }, []);

  // Handle voice transcript - send to chatbot
  const handleVoiceTranscript = useCallback((text: string) => {
    if (text) {
      console.log('[TV Voice] Transcript received:', text);
      toggleOpen();
      sendMessage(text);
    }
  }, [sendMessage, toggleOpen]);

  // Handle voice errors
  const handleVoiceError = useCallback((error: Error) => {
    console.warn('[TV Voice] Error:', error.message);
  }, []);

  // Wake word listening hook for TV
  const {
    isListening,
    isProcessing,
    isSendingToServer,
    audioLevel,
    isSupported: wakeWordSupported,
  } = useConstantListening({
    enabled: wakeWordActive,
    onTranscript: handleVoiceTranscript,
    onError: handleVoiceError,
    silenceThresholdMs: preferences?.silence_threshold_ms || 2500,
    vadSensitivity: preferences?.vad_sensitivity || 'medium',
    transcribeAudio: chatService.transcribeAudio,
  });

  // Show soundwave on TV only if mic is available
  const showSoundwave = micAvailable === true;

  const handleVoiceTranscribed = (text: string) => {
    if (text) {
      sendMessage(text);
    }
  };

  const handleProfileNavigate = (path: string) => {
    // Convert web paths to RN screen names
    const pathToScreen: Record<string, string> = {
      '/profile': 'Profile',
      '/favorites': 'Favorites',
      '/watchlist': 'Watchlist',
      '/settings': 'Settings',
    };
    const screen = pathToScreen[path] || 'Profile';
    onNavigate(screen);
  };

  const handleLogout = () => {
    logout();
    onNavigate('Home');
  };

  const isNavActive = (route: string) => currentRoute === route;

  // Logo component
  const LogoSection = (
    <Pressable
      onPress={() => onNavigate('Home')}
      onFocus={() => setFocusedNav('logo')}
      onBlur={() => setFocusedNav(null)}
      className={`p-2 rounded-lg border-2 ${
        focusedNav === 'logo' ? 'border-purple-500 bg-[rgba(168,85,247,0.3)] scale-105' : 'border-transparent'
      }`}
    >
      <AnimatedLogo size="small" />
    </Pressable>
  );

  // Navigation component
  const NavSection = (
    <View className="flex-row items-center gap-2">
      {navLinkKeys.map((link) => {
        const isActive = isNavActive(link.route);
        const isFocused = focusedNav === link.route;
        return (
          <Pressable
            key={link.route}
            onPress={() => onNavigate(link.route)}
            onFocus={() => setFocusedNav(link.route)}
            onBlur={() => setFocusedNav(null)}
            className={`px-4 py-2.5 rounded-lg border-2 ${
              isActive ? 'bg-purple-500' : 'bg-white/5'
            } ${
              isFocused ? 'border-purple-500 bg-[rgba(168,85,247,0.3)] scale-105' : 'border-transparent'
            }`}
          >
            <Text className={`text-xl font-medium ${
              isActive ? 'text-white font-semibold' : 'text-gray-400'
            }`}>
              {t(link.key)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  // Actions component
  const ActionsSection = (
    <View className="flex-row items-center gap-4">
      {/* Recordings Button */}
      <Pressable
        onPress={() => onNavigate('Recordings')}
        onFocus={() => setFocusedAction('recordings')}
        onBlur={() => setFocusedAction(null)}
        className={`w-[60px] h-[60px] rounded-lg bg-white/5 justify-center items-center border-2 ${
          focusedAction === 'recordings' ? 'border-purple-500 bg-[rgba(168,85,247,0.3)] scale-105' : 'border-transparent'
        }`}
      >
        <Text className="text-[32px]">📹</Text>
      </Pressable>

      {/* Settings Button */}
      <Pressable
        onPress={() => onNavigate('Settings')}
        onFocus={() => setFocusedAction('settings')}
        onBlur={() => setFocusedAction(null)}
        className={`w-[60px] h-[60px] rounded-lg bg-white/5 justify-center items-center border-2 ${
          focusedAction === 'settings' ? 'border-purple-500 bg-[rgba(168,85,247,0.3)] scale-105' : 'border-transparent'
        }`}
      >
        <Text className="text-[32px]">⚙️</Text>
      </Pressable>

      {/* Profile/Login */}
      {isAuthenticated ? (
        <ProfileDropdown
          user={user}
          onNavigate={handleProfileNavigate}
          onLogout={handleLogout}
        />
      ) : (
        <Pressable
          onPress={() => onNavigate('Login')}
          onFocus={() => setFocusedAction('login')}
          onBlur={() => setFocusedAction(null)}
          className={`px-6 py-4 rounded-lg bg-purple-500 border-2 ${
            focusedAction === 'login' ? 'border-white' : 'border-transparent'
          }`}
        >
          <Text className="text-xl font-medium text-white">{t('account.login', 'Login')}</Text>
        </Pressable>
      )}

      {/* Language Selector */}
      <LanguageSelector />

      {/* Search Button */}
      <Pressable
        onPress={() => onNavigate('Search')}
        onFocus={() => setFocusedAction('search')}
        onBlur={() => setFocusedAction(null)}
        className={`w-[60px] h-[60px] rounded-lg bg-white/5 justify-center items-center border-2 ${
          focusedAction === 'search' ? 'border-purple-500 bg-[rgba(168,85,247,0.3)] scale-105' : 'border-transparent'
        }`}
      >
        <Text className="text-[32px]">🔍</Text>
      </Pressable>

      {/* Soundwave Visualizer - for TV wake word listening mode */}
      {showSoundwave && (
        <View className="h-[60px] min-w-[120px] justify-center items-center px-2 bg-[rgba(168,85,247,0.3)] rounded-lg border-2 border-purple-500">
          <SoundwaveVisualizer
            audioLevel={audioLevel || 0}
            isListening={isListening || wakeWordActive}
            isProcessing={isProcessing}
            isSendingToServer={isSendingToServer}
            compact
          />
        </View>
      )}

      {/* Voice/Chatbot Button */}
      <Pressable
        onPress={onChatbotOpen}
        onFocus={() => setFocusedAction('voice')}
        onBlur={() => setFocusedAction(null)}
        className={`w-[60px] h-[60px] rounded-lg bg-[rgba(168,85,247,0.3)] border-2 border-purple-500 justify-center items-center ${
          focusedAction === 'voice' ? 'border-purple-500 bg-[rgba(168,85,247,0.3)] scale-105' : ''
        }`}
      >
        <Text className="text-[32px]">🎙️</Text>
      </Pressable>
    </View>
  );

  return (
    <View className="h-[100px] w-full border-b border-[rgba(168,85,247,0.2)] bg-black/80">
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.95)', 'rgba(0, 0, 0, 0.98)']}
        className="flex-1 flex-row items-center justify-between px-12 w-full"
      >
        {LogoSection}
        {NavSection}
        {ActionsSection}
      </LinearGradient>
    </View>
  );
};

export default TVHeader;
