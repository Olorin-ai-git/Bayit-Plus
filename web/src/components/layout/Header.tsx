import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';
import { Search, Menu, X, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useChatbotStore } from '@/stores/chatbotStore';
import { useVoiceSettingsStore } from '@/stores/voiceSettingsStore';
import { useModeEnforcement } from '@bayit/shared-hooks';
import { chatService } from '@/services/api';
import { VoiceSearchButton, LanguageSelector, AnimatedLogo, SoundwaveVisualizer } from '@bayit/shared';
import { useConstantListening } from '@bayit/shared-hooks';
import { ProfileDropdown } from '@bayit/shared/ProfileDropdown';
import { colors, spacing } from '@bayit/shared/theme';
import { GlassView } from '@bayit/shared/ui';

// Check if this is a TV build (set by webpack)
declare const __TV__: boolean;
const IS_TV_BUILD = typeof __TV__ !== 'undefined' && __TV__;

const navLinkKeys = [
  { to: '/', key: 'nav.home' },
  { to: '/live', key: 'nav.liveTV' },
  { to: '/vod', key: 'nav.vod' },
  { to: '/radio', key: 'nav.radio' },
  { to: '/podcasts', key: 'nav.podcasts' },
  { to: '/flows', key: 'nav.flows' },
  { to: '/judaism', key: 'nav.judaism' },
  { to: '/children', key: 'nav.children' },
];

interface HeaderProps {
  onMenuPress?: () => void;
}

export default function Header({ onMenuPress }: HeaderProps) {
  const { i18n, t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuthStore();
  const { sendMessage, toggleOpen } = useChatbotStore();
  const { preferences } = useVoiceSettingsStore();
  const { isRemoteControlEnabled } = useModeEnforcement();
  const navigate = useNavigate();
  const { width } = useWindowDimensions();
  const isMobile = width < 768 && !IS_TV_BUILD;
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const showAdmin = isAuthenticated && isAdmin() && !IS_TV_BUILD; // Hide admin on TV

  // Voice settings for TV - only enable if mic is available
  const [micAvailable, setMicAvailable] = useState<boolean | null>(null);
  // Use wake word activation (no more always-listening mode)
  const wakeWordActive = IS_TV_BUILD && preferences.wake_word_enabled && micAvailable === true;

  // Check if microphone is available on TV (only check once)
  useEffect(() => {
    if (!IS_TV_BUILD) return;

    // Track if component is mounted to avoid state updates after unmount
    let isMounted = true;

    const checkMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Mic is available - stop the test stream
        stream.getTracks().forEach(track => track.stop());
        // Only update state if component is still mounted
        if (isMounted) {
          setMicAvailable(true);
          console.log('[TV] Microphone available');
        }
      } catch (err) {
        // No mic available - disable constant listening
        // Only update state if component is still mounted
        if (isMounted) {
          setMicAvailable(false);
          console.log('[TV] No microphone available:', err);
        }
      }
    };

    checkMic();

    // Cleanup: mark component as unmounted to prevent state updates
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle voice transcript - send to chatbot
  const handleVoiceTranscript = useCallback((text: string) => {
    if (text) {
      console.log('[TV Voice] Transcript received:', text);
      // Open chatbot and send message
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

  // Logo component
  const LogoSection = (
    <Link to="/" style={{ textDecoration: 'none' }}>
      <AnimatedLogo size="small" />
    </Link>
  );

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
    <View style={styles.actions}>
      {showAdmin && (
        <Link to="/admin" style={{ textDecoration: 'none' }}>
          <View style={styles.adminButton}>
            <Shield size={16} color={colors.text} />
            <Text style={styles.adminButtonText}>{t('nav.admin', 'Admin')}</Text>
          </View>
        </Link>
      )}
      {isAuthenticated ? (
        <ProfileDropdown
          user={user}
          onNavigate={handleProfileNavigate}
          onLogout={handleLogout}
        />
      ) : (
        <Link to="/login" style={{ textDecoration: 'none' }}>
          <View style={styles.loginButton}>
            <Text style={styles.loginButtonText}>{t('account.login')}</Text>
          </View>
        </Link>
      )}

      <LanguageSelector />

      <Link to="/search" style={{ textDecoration: 'none' }}>
        <View style={styles.iconButton}>
          <Search size={IS_TV_BUILD ? 32 : 20} color={colors.text} />
        </View>
      </Link>

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

      {/* Voice search button - show on all platforms with wake word support */}
      <View style={styles.voiceButtonContainer}>
        <VoiceSearchButton
          onResult={handleVoiceTranscribed}
          transcribeAudio={chatService.transcribeAudio}
          tvMode={IS_TV_BUILD}
        />
      </View>

      {/* Mobile Menu Toggle */}
      {isMobile && (
        <Pressable
          onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={styles.iconButton}
        >
          {mobileMenuOpen ? (
            <X size={20} color={colors.text} />
          ) : (
            <Menu size={20} color={colors.text} />
          )}
        </Pressable>
      )}
    </View>
  );

  return (
    <GlassView style={styles.header}>
      <View style={styles.container}>
        <View style={styles.headerContent}>
          {/* document.dir handles visual direction - keep natural order */}
          {LogoSection}
          {NavSection}
          {ActionsSection}
        </View>

        {/* Mobile Navigation */}
        {isMobile && mobileMenuOpen && (
          <View style={styles.mobileNav}>
            {navLinkKeys.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                style={{ textDecoration: 'none' }}
              >
                {({ isActive }) => (
                  <View style={[styles.mobileNavLink, isActive && styles.navLinkActive]}>
                    <Text style={[styles.navLinkText, isActive && styles.navLinkTextActive]}>
                      {t(link.key)}
                    </Text>
                  </View>
                )}
              </NavLink>
            ))}
            {showAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                style={{ textDecoration: 'none' }}
              >
                {({ isActive }) => (
                  <View style={[styles.mobileNavLink, styles.mobileAdminLink, isActive && styles.navLinkActive]}>
                    <Shield size={16} color="#ef4444" />
                    <Text style={[styles.navLinkText, styles.adminLinkText, isActive && styles.navLinkTextActive]}>
                      {t('nav.admin', 'Admin')}
                    </Text>
                  </View>
                )}
              </NavLink>
            )}
          </View>
        )}
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  header: {
    position: 'sticky' as any,
    top: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
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
    backgroundColor: colors.primary,
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
  voiceButtonContainer: {
    position: 'relative',
    marginHorizontal: spacing.xs,
  },
  iconButton: {
    width: IS_TV_BUILD ? 60 : 40,
    height: IS_TV_BUILD ? 60 : 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    paddingHorizontal: IS_TV_BUILD ? spacing.lg : spacing.md,
    paddingVertical: IS_TV_BUILD ? spacing.md : spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
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
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.3)',
  },
});
