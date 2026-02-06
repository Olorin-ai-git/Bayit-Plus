import { View, Text, StyleSheet, Pressable, useWindowDimensions, Image } from 'react-native';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';
import { Search, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useChatbotStore } from '@/stores/chatbotStore';
import { useVoiceSettingsStore } from '@/stores/voiceSettingsStore';
import { useModeEnforcement } from '@bayit/shared-hooks';
import { chatService } from '@/services/api';
import { VoiceSearchButton, LanguageSelector, SoundwaveVisualizer } from '@bayit/shared';
import { useConstantListening } from '@bayit/shared-hooks';
import { useSupportStore } from '@bayit/shared/stores/supportStore';
import { voiceSupportService } from '@bayit/shared/services/voiceSupportService';
import { ProfileDropdown } from '../../../../shared/components/ProfileDropdown';
import { colors, spacing } from '@olorin/design-tokens';
import { GlassView } from '@bayit/shared/ui';
import { supportConfig } from '@bayit/shared-config/supportConfig';
import logger from '@/utils/logger';

// Wizard hat image for voice assistant button
const WIZARD_HAT = require('../../../../shared/assets/images/characters/hat/48x48.png');

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

const navLinkKeys = [
  { to: '/', key: 'nav.home' },
  { to: '/search', key: 'nav.search' },
  { to: '/live', key: 'nav.liveTV' },
  { to: '/epg', key: 'nav.epg' },
  { to: '/vod', key: 'nav.vod' },
  { to: '/radio', key: 'nav.radio' },
  { to: '/podcasts', key: 'nav.podcasts' },
  { to: '/judaism', key: 'nav.judaism' },
  { to: '/children', key: 'nav.children' },
  { to: '/widgets', key: 'nav.widgets' },
];

export default function Header() {
  const { i18n, t } = useTranslation();
  const { user, isAuthenticated, isAdmin, logout, isHydrated } = useAuthStore();
  const { sendMessage, toggleOpen } = useChatbotStore();
  const { preferences } = useVoiceSettingsStore();
  const { isRemoteControlEnabled } = useModeEnforcement();
  const navigate = useNavigate();
  const { width } = useWindowDimensions();
  const isMobile = width < 768 && !IS_TV_BUILD;
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  // Check localStorage directly as fallback for hydration
  const [localAuthChecked, setLocalAuthChecked] = useState(false);
  const [authReady, setAuthReady] = useState(isHydrated);

  useEffect(() => {
    // If store is hydrated, we're ready
    if (isHydrated) {
      setAuthReady(true);
      return;
    }

    // Fallback: check localStorage directly
    if (!localAuthChecked) {
      try {
        const stored = localStorage.getItem('bayit-auth');
        if (stored) {
          const data = JSON.parse(stored);
          if (data.state?.isAuthenticated) {
            setAuthReady(true);
          }
        }
      } catch (e) {
        logger.warn('Failed to check localStorage auth', 'Header', e);
      }
      setLocalAuthChecked(true);
    }
  }, [isHydrated, localAuthChecked]);

  // Only show admin button when store is fully hydrated to prevent race conditions
  const showAdmin = isHydrated && isAuthenticated && isAdmin() && !IS_TV_BUILD; // Hide admin on TV

  // Log admin button visibility logic
  useEffect(() => {
    if (!IS_TV_BUILD) {
      logger.debug('Admin Button Visibility', 'Header', {
        isHydrated,
        isAuthenticated,
        user,
        userRole: user?.role,
        isAdmin: isAdmin(),
        showAdmin,
      });
    }
  }, [isHydrated, isAuthenticated, user, showAdmin]);

  const [loginFocused, setLoginFocused] = useState(false);

  // Voice settings for TV - only enable if mic is available
  const [micAvailable, setMicAvailable] = useState<boolean | null>(null);
  // Use wake word activation (no more always-listening mode)
  const wakeWordActive = IS_TV_BUILD && preferences.wake_word_enabled && micAvailable === true;

  // Microphone check disabled for TV - Samsung TV doesn't support getUserMedia
  // The mic would need external USB microphone which we don't support yet
  useEffect(() => {
    if (IS_TV_BUILD) {
      setMicAvailable(false);
    }
  }, []);

  // Handle voice transcript - send to chatbot
  const handleVoiceTranscript = useCallback((text: string) => {
    if (text) {
      logger.debug('Transcript received', 'Header', text);
      // Open chatbot and send message
      toggleOpen();
      sendMessage(text);
    }
  }, [sendMessage, toggleOpen]);

  // Handle voice errors
  const handleVoiceError = useCallback((error: Error) => {
    logger.warn('Voice error', 'Header', error.message);
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
    silenceThresholdMs: preferences.silence_threshold_ms || 2500,
    vadSensitivity: preferences.vad_sensitivity || 'low',
    transcribeAudio: chatService.transcribeAudio,
  });

  // Show soundwave on TV only if mic is available
  const showSoundwave = IS_TV_BUILD && micAvailable === true;

  const handleVoiceTranscribed = (text: string) => {
    if (text) {
      sendMessage(text);
    }
  };

  const handleProfileNavigate = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Voice Support for wizard hat button (mobile only)
  // Use store and service directly to avoid duplicate event subscriptions
  const openVoiceModal = useSupportStore((s) => s.openVoiceModal);
  const voiceSupported = voiceSupportService.isSupported();

  const handleWizardHatPress = useCallback(async () => {
    logger.debug('Wizard hat button pressed - opening voice modal and showing particles', 'Header');

    // Dispatch custom event to show particles
    window.dispatchEvent(new CustomEvent('bayit:voice-started'));

    // Dispatch custom event to toggle topbar microphone button state
    window.dispatchEvent(new CustomEvent('bayit:toggle-voice'));

    // Open modal
    openVoiceModal();

    // Play intro (this will show particles/animation)
    try {
      await voiceSupportService.playIntro();
      logger.debug('Intro completed successfully', 'Header');
    } catch (error) {
      logger.warn('Intro playback failed, continuing anyway', 'Header', error);
    }
  }, [openVoiceModal]);

  // Navigation component - document.dir handles visual direction
  // Disabled in Voice Only mode
  const NavSection = !isMobile && isRemoteControlEnabled && (
    <View style={styles.nav}>
      {navLinkKeys.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          style={({ isActive }) => ({
            textDecoration: 'none',
            pointerEvents: isRemoteControlEnabled ? 'auto' : 'none',
            opacity: isRemoteControlEnabled ? 1 : 0.5,
          })}
        >
          {({ isActive }) => (
            <View style={[styles.navLink, isActive && styles.navLinkActive]}>
              <Text style={[styles.navLinkText, isActive && styles.navLinkTextActive]}>
                {t(link.key)}
              </Text>
            </View>
          )}
        </NavLink>
      ))}
    </View>
  );

  // Actions component
  const ActionsSection = (
    <View style={[styles.actions, isMobile && styles.actionsMobile]}>
      {/* Admin button - hidden on mobile */}
      {showAdmin && !isMobile && (
        <Link to="/admin" style={{ textDecoration: 'none' }}>
          <View style={styles.adminButton}>
            <Shield size={16} color={colors.text} />
            <Text style={styles.adminButtonText}>{t('nav.admin', 'Admin')}</Text>
          </View>
        </Link>
      )}

      {/* Profile/Login - simplified on mobile */}
      {authReady && isAuthenticated && user ? (
        isMobile ? (
          // Mobile: Simple logout button
          <Pressable
            onPress={handleLogout}
            style={styles.mobileLogoutButton}
          >
            <Text style={styles.mobileLogoutText}>{t('account.logout')}</Text>
          </Pressable>
        ) : (
          // Desktop: Full profile dropdown
          <ProfileDropdown
            user={user}
            onNavigate={handleProfileNavigate}
            onLogout={handleLogout}
          />
        )
      ) : (
        <Pressable
          onPress={() => navigate('/login')}
          onFocus={() => setLoginFocused(true)}
          onBlur={() => setLoginFocused(false)}
          style={[
            styles.loginButton,
            isMobile && styles.loginButtonMobile,
            loginFocused && styles.loginButtonFocused,
          ]}
        >
          <Text style={styles.loginButtonText}>{t('account.login')}</Text>
        </Pressable>
      )}

      {/* Language selector - compact on mobile */}
      <LanguageSelector compact={isMobile} />

      {/* Search button - 48x48px on mobile */}
      <Link to="/search" style={{ textDecoration: 'none' }}>
        <View style={[
          styles.iconButton,
          isMobile && styles.iconButtonMobile,
        ]}>
          <Search size={IS_TV_BUILD ? 32 : (isMobile ? 24 : 20)} color={colors.text} />
        </View>
      </Link>

      {/* Wizard hat voice assistant button - mobile only */}
      {isMobile && voiceSupported && supportConfig.voiceAssistant.enabled && (
        <Pressable
          onPress={handleWizardHatPress}
          style={styles.wizardHatButton}
          accessible
          accessibilityLabel={t('voice.avatar.openVoice')}
          accessibilityRole="button"
        >
          <Image
            source={WIZARD_HAT}
            style={styles.wizardHatImage}
            resizeMode="contain"
          />
        </Pressable>
      )}

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
    </View>
  );

  return (
    <GlassView style={styles.header}>
      <View style={styles.container}>
        <View style={styles.headerContent}>
          {/* document.dir handles visual direction - keep natural order */}
          {NavSection}
          {ActionsSection}
        </View>

        {/* Mobile Navigation removed - now handled by sidebar drawer */}
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'sticky' as any,
    top: 0,
    zIndex: 100,
    marginTop: 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  container: {
    width: '100%',
    maxWidth: IS_TV_BUILD ? '100%' : 1280,
    marginHorizontal: 'auto',
    paddingHorizontal: IS_TV_BUILD ? spacing.xl : spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: IS_TV_BUILD ? 100 : 64,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_TV_BUILD ? spacing.md : spacing.xs,
  },
  navLink: {
    paddingHorizontal: IS_TV_BUILD ? spacing.lg : spacing.md,
    paddingVertical: IS_TV_BUILD ? spacing.md : spacing.sm,
    borderRadius: 8,
  },
  navLinkActive: {
    backgroundColor: colors.primary[600],
  },
  navLinkText: {
    fontSize: IS_TV_BUILD ? 24 : 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  navLinkTextActive: {
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: IS_TV_BUILD ? spacing.md : spacing.sm,
  },
  actionsMobile: {
    flex: 1,
    justifyContent: 'space-evenly',
    gap: 0,
  },
  voiceButtonContainer: {
    position: 'relative',
    marginHorizontal: spacing.xs,
    height: IS_TV_BUILD ? 60 : 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButton: {
    width: IS_TV_BUILD ? 60 : 40,
    height: IS_TV_BUILD ? 60 : 40,
    borderRadius: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    paddingHorizontal: IS_TV_BUILD ? spacing.lg : spacing.md,
    paddingVertical: IS_TV_BUILD ? spacing.md : spacing.sm,
    borderRadius: 8,
    backgroundColor: IS_TV_BUILD ? 'rgba(255, 255, 255, 0.1)' : colors.primary.DEFAULT,
    borderWidth: IS_TV_BUILD ? 1 : 0,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loginButtonFocused: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary.DEFAULT,
  },
  loginButtonText: {
    fontSize: IS_TV_BUILD ? 20 : 14,
    fontWeight: '500',
    color: colors.text,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  adminButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ef4444',
  },
  mobileNav: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  mobileNavLink: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: 8,
  },
  mobileAdminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: spacing.md,
  },
  adminLinkText: {
    color: '#ef4444',
  },
  soundwaveContainer: {
    height: IS_TV_BUILD ? 60 : 44,
    minWidth: IS_TV_BUILD ? 120 : 80,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.glassPurpleLight,  // Purple-tinted glass
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorderStrong,     // Purple border
  },
  // Mobile-specific styles (≥48px touch targets)
  iconButtonMobile: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceButtonContainerMobile: {
    height: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonMobile: {
    minWidth: 80,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  mobileLogoutButton: {
    minWidth: 80,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileLogoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  wizardHatButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(13, 13, 26, 0.9)',
    borderWidth: 2,
    borderColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary.DEFAULT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // @ts-ignore - Web CSS
    boxShadow: `0 4px 16px ${colors.primary.DEFAULT}40`,
  } as any,
  wizardHatImage: {
    width: 48,
    height: 48,
  },
});
