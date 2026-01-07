import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Search, Menu, X, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useChatbotStore } from '@/stores/chatbotStore';
import { useVoiceSettingsStore } from '@/stores/voiceSettingsStore';
import { chatService } from '@/services/api';
import { VoiceSearchButton, LanguageSelector, AnimatedLogo, SoundwaveVisualizer } from '@bayit/shared';
import { useConstantListening } from '@bayit/shared-hooks';
import { ProfileDropdown } from '@bayit/shared/ProfileDropdown';
import { colors, spacing } from '@bayit/shared/theme';
import { GlassView } from '@bayit/shared/ui';
import { isWebOS } from '@/utils/spatialNavigation';

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

export default function Header() {
  const { i18n, t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, logout } = useAuthStore();
  const { sendMessage } = useChatbotStore();
  const { preferences } = useVoiceSettingsStore();
  const navigate = useNavigate();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTV = isWebOS();
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';
  const showAdmin = isAuthenticated && isAdmin();

  // Constant listening for TV mode (always-on voice input)
  const {
    isListening,
    isProcessing,
    isSendingToServer,
    audioLevel,
  } = useConstantListening({
    enabled: isTV && preferences.constant_listening_enabled,
    onTranscript: (text) => {
      if (text) {
        sendMessage(text);
      }
    },
    onError: (error) => {
      console.error('Voice listening error:', error);
    },
    silenceThresholdMs: preferences.silence_threshold_ms,
    vadSensitivity: preferences.vad_sensitivity,
    transcribeAudio: chatService.transcribeAudio,
  });

  const handleVoiceTranscribed = (text: string) => {
    if (text) {
      // Send voice input to chatbot instead of search
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

  // Navigation component - reverse order for LTR languages
  const navItems = isRTL ? navLinkKeys : [...navLinkKeys].reverse();
  const NavSection = !isMobile && (
    <View style={styles.nav}>
      {navItems.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          style={({ isActive }) => ({
            textDecoration: 'none',
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
          <Search size={20} color={colors.text} />
        </View>
      </Link>

      {/* Constant listening soundwave for TV mode */}
      {isTV && isListening && (
        <View style={styles.soundwaveContainer}>
          <SoundwaveVisualizer
            audioLevel={audioLevel}
            isListening={isListening}
            isProcessing={isProcessing}
            isSendingToServer={isSendingToServer}
            compact={true}
          />
        </View>
      )}

      {/* Regular voice search button for non-TV */}
      {!isTV && (
        <VoiceSearchButton
          onResult={handleVoiceTranscribed}
          transcribeAudio={chatService.transcribeAudio}
        />
      )}

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
          {isRTL ? (
            <>
              {ActionsSection}
              {NavSection}
              {LogoSection}
            </>
          ) : (
            <>
              {LogoSection}
              {NavSection}
              {ActionsSection}
            </>
          )}
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
    maxWidth: 1280,
    marginHorizontal: 'auto',
    paddingHorizontal: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 64,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  navLink: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  navLinkActive: {
    backgroundColor: colors.primary,
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  navLinkTextActive: {
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  loginButtonText: {
    fontSize: 14,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 255, 0.2)',
  },
});
