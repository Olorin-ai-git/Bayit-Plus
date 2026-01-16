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
  StyleSheet,
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
  const isAdmin = user?.role === 'admin';

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
      style={({ focused }) => [
        styles.logoContainer,
        focused && styles.logoFocused,
      ]}
    >
      <AnimatedLogo size="small" />
    </Pressable>
  );

  // Navigation component
  const NavSection = (
    <View style={styles.nav}>
      {navLinkKeys.map((link) => {
        const isActive = isNavActive(link.route);
        return (
          <Pressable
            key={link.route}
            onPress={() => onNavigate(link.route)}
            style={[
              styles.navLink,
              isActive && styles.navLinkActive,
            ]}
          >
            <Text style={[
              styles.navLinkText,
              isActive && styles.navLinkTextActive,
            ]}>
              {t(link.key)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  // Actions component
  const ActionsSection = (
    <View style={styles.actions}>
      {/* Recordings Button */}
      <Pressable
        onPress={() => onNavigate('Recordings')}
        onFocus={() => setFocusedAction('recordings')}
        onBlur={() => setFocusedAction(null)}
        style={({ focused }) => [
          styles.iconButton,
          focused && styles.iconButtonFocused,
        ]}
      >
        <Text style={styles.iconText}>📹</Text>
      </Pressable>

      {/* Settings Button */}
      <Pressable
        onPress={() => onNavigate('Settings')}
        onFocus={() => setFocusedAction('settings')}
        onBlur={() => setFocusedAction(null)}
        style={({ focused }) => [
          styles.iconButton,
          focused && styles.iconButtonFocused,
        ]}
      >
        <Text style={styles.iconText}>⚙️</Text>
      </Pressable>

      {/* Admin Button */}
      {isAdmin && (
        <Pressable
          onPress={() => onNavigate('Admin')}
          onFocus={() => setFocusedAction('admin')}
          onBlur={() => setFocusedAction(null)}
          style={({ focused }) => [
            styles.adminButton,
            focused && styles.adminButtonFocused,
          ]}
        >
          <Text style={styles.adminIcon}>🛡️</Text>
          <Text style={styles.adminButtonText}>{t('nav.admin', 'Admin')}</Text>
        </Pressable>
      )}

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
          style={({ focused }) => [
            styles.loginButton,
            focused && styles.loginButtonFocused,
          ]}
        >
          <Text style={styles.loginButtonText}>{t('account.login', 'Login')}</Text>
        </Pressable>
      )}

      {/* Language Selector */}
      <LanguageSelector />

      {/* Search Button */}
      <Pressable
        onPress={() => onNavigate('Search')}
        onFocus={() => setFocusedAction('search')}
        onBlur={() => setFocusedAction(null)}
        style={({ focused }) => [
          styles.iconButton,
          focused && styles.iconButtonFocused,
        ]}
      >
        <Text style={styles.iconText}>🔍</Text>
      </Pressable>

      {/* Soundwave Visualizer - for TV wake word listening mode */}
      {showSoundwave && (
        <View style={styles.soundwaveContainer}>
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
        style={({ focused }) => [
          styles.iconButton,
          styles.voiceButton,
          focused && styles.iconButtonFocused,
        ]}
      >
        <Text style={styles.iconText}>🎙️</Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.headerWrapper}>
      <LinearGradient
        colors={['rgba(30, 30, 50, 0.95)', 'rgba(20, 20, 40, 0.98)']}
        style={styles.headerGradient}
      >
        {LogoSection}
        {NavSection}
        {ActionsSection}
      </LinearGradient>
    </View>
  );
};

// Styles matching web Header.tsx for TV (larger sizes for 10-foot UI)
const styles = StyleSheet.create({
  headerWrapper: {
    height: 100,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 48,
    width: '100%',
  },
  logoContainer: {
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  logoFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navLink: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  navLinkActive: {
    backgroundColor: colors.primary,
  },
  navLinkFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  navLinkText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#cbd5e1',
  },
  navLinkTextActive: {
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconButton: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconButtonFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
  },
  iconText: {
    fontSize: 32,
  },
  voiceButton: {
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderColor: 'rgba(168, 85, 247, 0.6)',
  },
  loginButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  loginButtonFocused: {
    borderColor: colors.text,
  },
  loginButtonText: {
    fontSize: 20,
    fontWeight: '500',
    color: colors.text,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  adminButtonFocused: {
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  adminIcon: {
    fontSize: 20,
  },
  adminButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
  },
  soundwaveContainer: {
    height: 60,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(107, 33, 168, 0.3)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.6)',
  },
});

export default TVHeader;
