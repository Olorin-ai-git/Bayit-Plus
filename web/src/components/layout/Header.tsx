import { View, Text, StyleSheet, Pressable, Image, useWindowDimensions } from 'react-native';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Search, User, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import VoiceSearchButton from '@/components/search/VoiceSearchButton';
import LanguageSelector from './LanguageSelector';
import { colors, spacing } from '@bayit/shared/theme';
import { GlassView } from '@bayit/shared/ui';

const navLinks = [
  { to: '/', label: 'ראשי' },
  { to: '/live', label: 'שידור חי' },
  { to: '/vod', label: 'VOD' },
  { to: '/radio', label: 'רדיו' },
  { to: '/podcasts', label: 'פודקאסטים' },
  { to: '/judaism', label: 'יהדות' },
  { to: '/children', label: 'ילדים' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const handleVoiceTranscribed = (text: string) => {
    if (text) {
      navigate(`/search?q=${encodeURIComponent(text)}`);
    }
  };

  return (
    <GlassView style={styles.header}>
      <View style={styles.container}>
        <View style={styles.headerContent}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none' }}>
            <View style={styles.logoContainer}>
              <Image
                source={{ uri: '/logo.png' }}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.logoText}>בית+</Text>
            </View>
          </Link>

          {/* Desktop Navigation */}
          {!isMobile && (
            <View style={styles.nav}>
              {navLinks.map((link) => (
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
                        {link.label}
                      </Text>
                    </View>
                  )}
                </NavLink>
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <VoiceSearchButton
              onTranscribed={handleVoiceTranscribed}
              size="sm"
            />

            <Link to="/search" style={{ textDecoration: 'none' }}>
              <View style={styles.iconButton}>
                <Search size={20} color={colors.text} />
              </View>
            </Link>

            <LanguageSelector compact />

            {isAuthenticated ? (
              <Link to="/profile" style={{ textDecoration: 'none' }}>
                <View style={styles.iconButton}>
                  <User size={20} color={colors.text} />
                </View>
              </Link>
            ) : (
              <Link to="/login" style={{ textDecoration: 'none' }}>
                <View style={styles.loginButton}>
                  <Text style={styles.loginButtonText}>התחברות</Text>
                </View>
              </Link>
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
        </View>

        {/* Mobile Navigation */}
        {isMobile && mobileMenuOpen && (
          <View style={styles.mobileNav}>
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                style={{ textDecoration: 'none' }}
              >
                {({ isActive }) => (
                  <View style={[styles.mobileNavLink, isActive && styles.navLinkActive]}>
                    <Text style={[styles.navLinkText, isActive && styles.navLinkTextActive]}>
                      {link.label}
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
    maxWidth: 1280,
    marginHorizontal: 'auto',
    paddingHorizontal: spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  logo: {
    height: 40,
    width: 40,
  },
  logoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
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
