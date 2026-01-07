import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Search, User, Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { VoiceSearchButton, LanguageSelector, AnimatedLogo } from '@bayit/shared';
import { colors, spacing } from '@bayit/shared/theme';
import { GlassView } from '@bayit/shared/ui';

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
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const handleVoiceTranscribed = (text: string) => {
    if (text) {
      navigate(`/search?q=${encodeURIComponent(text)}`);
    }
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
      {isAuthenticated ? (
        <Link to="/profile" style={{ textDecoration: 'none' }}>
          <View style={styles.iconButton}>
            <User size={20} color={colors.text} />
          </View>
        </Link>
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

      <VoiceSearchButton
        onTranscribed={handleVoiceTranscribed}
        size="sm"
      />

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
    zIndex: 50,
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
});
