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
// import { ProfileDropdown } from '@bayit/shared/ProfileDropdown'; // TODO: Component not available yet
import { NativeIcon } from '@olorin/shared-icons/native';
import { colors, spacing } from '@olorin/design-tokens';
import LinearGradient from 'react-native-linear-gradient';
import { chatService } from '@bayit/shared-services';
import { useConstantListening } from '@bayit/shared-hooks';
import { useVoiceTV } from '../hooks/useVoiceTV';
import { TVVoiceIndicator } from './voice/TVVoiceIndicator';
import { TVVoiceResponseDisplay } from './voice/TVVoiceResponseDisplay';
import { TVProactiveSuggestionBanner } from './voice/TVProactiveSuggestionBanner';

// Navigation links - matching web app navigation with TV-specific additions
// Maps to unified icon registry names
const navLinkKeys = [
  { route: 'Home', key: 'nav.home', iconName: 'home' },
  { route: 'LiveTV', key: 'nav.liveTV', iconName: 'live' },
  { route: 'EPG', key: 'nav.epg', iconName: 'epg' },
  { route: 'VOD', key: 'nav.vod', iconName: 'vod' },
  { route: 'Radio', key: 'nav.radio', iconName: 'radio' },
  { route: 'Podcasts', key: 'nav.podcasts', iconName: 'podcasts' },
  { route: 'Flows', key: 'nav.flows', iconName: 'discover' },
  { route: 'Judaism', key: 'nav.judaism', iconName: 'judaism' },
  { route: 'Children', key: 'nav.children', iconName: 'children' },
  { route: 'BetaAI', key: 'nav.betaAI', iconName: 'ai' },
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
  const { sendMessage, setOpen: setChatbotOpen } = useChatbotStore();
  const { preferences } = useVoiceSettingsStore();
  const { width } = useWindowDimensions();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  // Focus states for TV navigation
  const [focusedNav, setFocusedNav] = useState<string | null>(null);
  const [focusedAction, setFocusedAction] = useState<string | null>(null);

  // New voice system hook
  const {
    isListening,
    transcript,
    error,
    hasPermissions,
    startListening,
    stopListening,
    requestPermissions,
  } = useVoiceTV();

  // Handle transcript completion
  useEffect(() => {
    if (transcript) {
      setChatbotOpen(true);
      sendMessage(transcript);
    }
  }, [transcript, setChatbotOpen, sendMessage]);

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
        focusedNav === 'logo' ? 'border-purple-500 bg-purple-500/30 scale-105' : 'border-transparent'
      }`}
    >
      <AnimatedLogo size="small" />
    </Pressable>
  );

  // Navigation component
  const NavSection = (
    <View className="flex-row items-center gap-2">
      {navLinkKeys.map((link: any) => {
        const isActive = isNavActive(link.route);
        const isFocused = focusedNav === link.route;
        const iconColor = isActive ? '#ffffff' : '#a0a0a0';
        return (
          <Pressable
            key={link.route}
            onPress={() => onNavigate(link.route)}
            onFocus={() => setFocusedNav(link.route)}
            onBlur={() => setFocusedNav(null)}
            className={`px-4 py-2.5 rounded-lg border-2 flex-row items-center gap-2 ${
              isActive ? 'bg-purple-500' : 'bg-white/5'
            } ${
              isFocused ? 'border-purple-500 bg-purple-500/30 scale-105' : 'border-transparent'
            }`}
          >
            <NativeIcon
              name={link.iconName}
              size="lg"
              color={iconColor}
              variant={isActive ? 'colored' : 'monochrome'}
            />
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
          focusedAction === 'recordings' ? 'border-purple-500 bg-purple-500/30 scale-105' : 'border-transparent'
        }`}
      >
        <NativeIcon
          name="recordings"
          size="xl"
          color={focusedAction === 'recordings' ? '#ffffff' : '#a0a0a0'}
          variant={focusedAction === 'recordings' ? 'colored' : 'monochrome'}
        />
      </Pressable>

      {/* Settings Button */}
      <Pressable
        onPress={() => onNavigate('Settings')}
        onFocus={() => setFocusedAction('settings')}
        onBlur={() => setFocusedAction(null)}
        className={`w-[60px] h-[60px] rounded-lg bg-white/5 justify-center items-center border-2 ${
          focusedAction === 'settings' ? 'border-purple-500 bg-purple-500/30 scale-105' : 'border-transparent'
        }`}
      >
        <NativeIcon
          name="settings"
          size="xl"
          color={focusedAction === 'settings' ? '#ffffff' : '#a0a0a0'}
          variant={focusedAction === 'settings' ? 'colored' : 'monochrome'}
        />
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
          focusedAction === 'search' ? 'border-purple-500 bg-purple-500/30 scale-105' : 'border-transparent'
        }`}
      >
        <NativeIcon
          name="search"
          size="xl"
          color={focusedAction === 'search' ? '#ffffff' : '#a0a0a0'}
          variant={focusedAction === 'search' ? 'colored' : 'monochrome'}
        />
      </Pressable>

      {/* Voice Indicator - Show when listening */}
      {isListening && (
        <View className="px-3">
          <TVVoiceIndicator
            size="small"
            showLabel={false}
            onPress={() => stopListening()}
          />
        </View>
      )}

      {/* Voice/Chatbot Button */}
      <Pressable
        onPress={onChatbotOpen}
        onFocus={() => setFocusedAction('voice')}
        onBlur={() => setFocusedAction(null)}
        className={`w-[60px] h-[60px] rounded-lg bg-purple-500/30 border-2 border-purple-500 justify-center items-center ${
          focusedAction === 'voice' ? 'border-purple-500 bg-purple-500/30 scale-105' : ''
        }`}
      >
        <NativeIcon
          name="podcasts"
          size="xl"
          color={focusedAction === 'voice' ? '#ffffff' : '#a0a0a0'}
          variant={focusedAction === 'voice' ? 'colored' : 'monochrome'}
        />
      </Pressable>
    </View>
  );

  return (
    <View className="w-full bg-black/80">
      {/* Proactive Suggestion Banner - Top banner with voice command suggestions */}
      <TVProactiveSuggestionBanner
        visible={!isListening}
        onDismiss={() => {}}
        onSuggestionPress={(suggestionId) => {
          // Handle suggestion press - typically triggers a command
        }}
      />

      {/* Main Header */}
      <View className="h-[100px] w-full border-b border-purple-500/20">
        <LinearGradient
          colors={[colors.dark['950'], colors.dark['950']]}
          className="flex-1 flex-row items-center justify-between px-12 w-full"
        >
          {LogoSection}
          {NavSection}
          {ActionsSection}
        </LinearGradient>
      </View>

      {/* Voice Response Display - Shows voice command responses */}
      <TVVoiceResponseDisplay
        autoDismissMs={5000}
        onDismiss={() => {}}
      />
    </View>
  );
};

export default TVHeader;
