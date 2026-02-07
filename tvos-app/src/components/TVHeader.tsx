/**
 * TV Header Component for tvOS
 *
 * Mirrors the web app's Header.tsx layout using shared components.
 * Uses the same navLinks, styles, and component structure.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Pressable } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useChatbotStore } from '@bayit/shared-stores';
import { AnimatedLogo } from '@bayit/shared';
import { colors } from '@olorin/design-tokens';
import LinearGradient from 'react-native-linear-gradient';
import { logger } from '../utils/logger';
import { useVoiceTV } from '../hooks/useVoiceTV';
import { TVProactiveSuggestionBanner } from './voice';
import { TVHeaderNav } from './header/TVHeaderNav';
import { TVHeaderActions } from './header/TVHeaderActions';

interface TVHeaderProps {
  onChatbotOpen?: () => void;
  /** @deprecated Route detected via useRoute() hook internally */
  currentScreen?: string;
  /** @deprecated Navigation accessed via useNavigation() hook internally */
  navigation?: any;
  /** Optional title override (unused, kept for backward compat) */
  title?: string;
}

export const TVHeader: React.FC<TVHeaderProps> = ({ onChatbotOpen }) => {
  const { i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const currentRoute = route.name;
  const { user, isAuthenticated, logout } = useAuthStore();
  const { sendMessage, setOpen: setChatbotOpen } = useChatbotStore();

  // Focus states for TV navigation
  const [focusedNav, setFocusedNav] = useState<string | null>(null);
  const [focusedAction, setFocusedAction] = useState<string | null>(null);

  const { isListening, transcript, stopListening } = useVoiceTV();

  // Handle transcript completion
  useEffect(() => {
    if (transcript) {
      setChatbotOpen(true);
      sendMessage(transcript);
    }
  }, [transcript, setChatbotOpen, sendMessage]);

  const handleNavigate = useCallback((routeName: string) => {
    navigation.navigate(routeName);
  }, [navigation]);

  const handleProfileNavigate = useCallback((path: string) => {
    const pathToScreen: Record<string, string> = {
      '/profile': 'Profile',
      '/favorites': 'Favorites',
      '/playlist': 'Playlist',
      '/settings': 'Settings',
    };
    const screen = pathToScreen[path] || 'Profile';
    navigation.navigate(screen);
  }, [navigation]);

  const handleLogout = useCallback(() => {
    logout();
    navigation.navigate('Home');
  }, [logout, navigation]);

  return (
    <View className="w-full bg-black/80">
      <TVProactiveSuggestionBanner
        visible={!isListening}
        onDismiss={() => { logger.debug('Proactive suggestion banner dismissed'); }}
        onSuggestionPress={(suggestionId) => {
          logger.debug('Proactive suggestion pressed', { suggestionId });
          setChatbotOpen(true);
          sendMessage(suggestionId);
        }}
      />

      <View className="h-[100px] w-full border-b border-purple-500/20">
        <LinearGradient
          colors={[colors.dark['950'], colors.dark['950']]}
          className="flex-1 flex-row items-center justify-between px-12 w-full"
        >
          <Pressable
            onPress={() => handleNavigate('Home')}
            onFocus={() => setFocusedNav('logo')}
            onBlur={() => setFocusedNav(null)}
            className={`p-2 rounded-lg border-2 ${
              focusedNav === 'logo' ? 'border-purple-500 bg-purple-500/30 scale-105' : 'border-transparent'
            }`}
          >
            <AnimatedLogo size="small" />
          </Pressable>

          <TVHeaderNav
            currentRoute={currentRoute}
            focusedNav={focusedNav}
            onNavigate={handleNavigate}
            onFocus={setFocusedNav}
            onBlur={() => setFocusedNav(null)}
          />

          <TVHeaderActions
            isAuthenticated={isAuthenticated}
            user={user}
            isListening={isListening}
            focusedAction={focusedAction}
            onNavigate={handleNavigate}
            onProfileNavigate={handleProfileNavigate}
            onLogout={handleLogout}
            onStopListening={stopListening}
            onChatbotOpen={onChatbotOpen}
            onFocusAction={setFocusedAction}
            onBlurAction={() => setFocusedAction(null)}
          />
        </LinearGradient>
      </View>
    </View>
  );
};

export default TVHeader;
