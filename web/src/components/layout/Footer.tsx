import { useState } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Globe,
  ChevronDown,
  ExternalLink,
  Smartphone,
  Send,
} from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassCard, GlassInput, GlassButton, AnimatedLogo } from '@bayit/shared';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

const SOCIAL_LINKS = [
  { icon: Facebook, url: 'https://facebook.com/bayitplus', label: 'Facebook' },
  { icon: Twitter, url: 'https://twitter.com/bayitplus', label: 'Twitter' },
  { icon: Instagram, url: 'https://instagram.com/bayitplus', label: 'Instagram' },
  { icon: Youtube, url: 'https://youtube.com/bayitplus', label: 'YouTube' },
];

export default function Footer() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width < 1024;
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const [email, setEmail] = useState('');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageMenu(false);
  };

  const handleSubscribe = () => {
    if (email.trim()) {
      // TODO: Implement newsletter subscription
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  const footerLinks = {
    browse: [
      { to: '/', label: t('footer.links.home', 'Home') },
      { to: '/live', label: t('footer.links.liveTV', 'Live TV') },
      { to: '/vod', label: t('footer.links.vod', 'Movies & Series') },
      { to: '/radio', label: t('footer.links.radio', 'Radio') },
      { to: '/podcasts', label: t('footer.links.podcasts', 'Podcasts') },
      { to: '/judaism', label: t('footer.links.judaism', 'Judaism') },
    ],
    account: [
      { to: '/profile', label: t('footer.links.profile', 'My Profile') },
      { to: '/favorites', label: t('footer.links.favorites', 'Favorites') },
      { to: '/watchlist', label: t('footer.links.watchlist', 'Watchlist') },
      { to: '/subscribe', label: t('footer.links.subscribe', 'Subscribe') },
      { to: '/downloads', label: t('footer.links.downloads', 'Downloads') },
    ],
    support: [
      { to: '/help', label: t('footer.links.help', 'Help Center') },
      { to: '/faq', label: t('footer.links.faq', 'FAQ') },
      { to: '/contact', label: t('footer.links.contact', 'Contact Us') },
      { to: '/feedback', label: t('footer.links.feedback', 'Feedback') },
    ],
    legal: [
      { to: '/terms', label: t('footer.links.terms', 'Terms of Service') },
      { to: '/privacy', label: t('footer.links.privacy', 'Privacy Policy') },
      { to: '/cookies', label: t('footer.links.cookies', 'Cookie Policy') },
      { to: '/licenses', label: t('footer.links.licenses', 'Licenses') },
    ],
  };

  return (
    <GlassView style={styles.footer} intensity="high">
      <View style={styles.container}>
        {/* Main Footer Content */}
        <View style={[styles.mainContent, isMobile && styles.mainContentMobile]}>
          {/* Brand Section */}
          <View style={[styles.brandSection, isMobile && styles.brandSectionMobile]}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <View style={styles.logoContainer}>
                <AnimatedLogo size="medium" />
              </View>
            </Link>
            <Text style={[styles.brandDescription, isRTL && styles.textRTL]}>
              {t('footer.brandDescription', 'Your home in the USA. TV broadcasts, VOD, radio and podcasts in Hebrew.')}
            </Text>

            {/* Contact Info */}
            <View style={styles.contactInfo}>
              <View style={[styles.contactItem, isRTL && styles.contactItemRTL]}>
                <Mail size={16} color={colors.textMuted} />
                <Text style={styles.contactText}>support@bayitplus.com</Text>
              </View>
              <View style={[styles.contactItem, isRTL && styles.contactItemRTL]}>
                <Phone size={16} color={colors.textMuted} />
                <Text style={styles.contactText}>1-800-BAYIT-TV</Text>
              </View>
              <View style={[styles.contactItem, isRTL && styles.contactItemRTL]}>
                <MapPin size={16} color={colors.textMuted} />
                <Text style={styles.contactText}>{t('footer.location', 'New York, USA')}</Text>
              </View>
            </View>

            {/* Social Links */}
            <View style={styles.socialLinks}>
              {SOCIAL_LINKS.map((social) => (
                <Pressable
                  key={social.label}
                  onPress={() => window.open(social.url, '_blank')}
                  style={({ pressed }) => [
                    styles.socialButton,
                    pressed && styles.socialButtonPressed,
                  ]}
                >
                  <social.icon size={20} color={colors.text} />
                </Pressable>
              ))}
            </View>
          </View>

          {/* Links Grid */}
          <View style={[styles.linksGrid, isMobile && styles.linksGridMobile]}>
            {/* Browse Column */}
            <View style={styles.linkColumn}>
              <Text style={[styles.columnTitle, isRTL && styles.textRTL]}>
                {t('footer.browse', 'Browse')}
              </Text>
              {footerLinks.browse.map((link) => (
                <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                  <Text style={[styles.linkText, isRTL && styles.textRTL]}>
                    {link.label}
                  </Text>
                </Link>
              ))}
            </View>

            {/* Account Column */}
            <View style={styles.linkColumn}>
              <Text style={[styles.columnTitle, isRTL && styles.textRTL]}>
                {t('footer.account', 'Account')}
              </Text>
              {footerLinks.account.map((link) => (
                <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                  <Text style={[styles.linkText, isRTL && styles.textRTL]}>
                    {link.label}
                  </Text>
                </Link>
              ))}
            </View>

            {/* Support Column */}
            <View style={styles.linkColumn}>
              <Text style={[styles.columnTitle, isRTL && styles.textRTL]}>
                {t('footer.support', 'Support')}
              </Text>
              {footerLinks.support.map((link) => (
                <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                  <Text style={[styles.linkText, isRTL && styles.textRTL]}>
                    {link.label}
                  </Text>
                </Link>
              ))}
            </View>

            {/* Legal Column */}
            <View style={styles.linkColumn}>
              <Text style={[styles.columnTitle, isRTL && styles.textRTL]}>
                {t('footer.legal', 'Legal')}
              </Text>
              {footerLinks.legal.map((link) => (
                <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                  <Text style={[styles.linkText, isRTL && styles.textRTL]}>
                    {link.label}
                  </Text>
                </Link>
              ))}
            </View>
          </View>

          {/* Newsletter & Apps Section */}
          <View style={[styles.rightSection, isMobile && styles.rightSectionMobile]}>
            {/* Newsletter */}
            <GlassCard style={styles.newsletterCard}>
              <Text style={[styles.newsletterTitle, isRTL && styles.textRTL]}>
                {t('footer.newsletter.title', 'Stay Updated')}
              </Text>
              <Text style={[styles.newsletterDescription, isRTL && styles.textRTL]}>
                {t('footer.newsletter.description', 'Subscribe to our newsletter for the latest updates and exclusive content.')}
              </Text>

              {subscribed ? (
                <View style={styles.subscribedMessage}>
                  <Text style={styles.subscribedText}>
                    {t('footer.newsletter.success', 'Thanks for subscribing!')}
                  </Text>
                </View>
              ) : (
                <View style={[styles.newsletterForm, isRTL && styles.newsletterFormRTL]}>
                  <View style={styles.inputWrapper}>
                    <GlassInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder={t('footer.newsletter.placeholder', 'Enter your email')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      containerStyle={styles.emailInput}
                      icon={<Mail size={18} color={colors.textMuted} />}
                    />
                  </View>
                  <Pressable
                    onPress={handleSubscribe}
                    style={({ pressed }) => [
                      styles.subscribeButton,
                      pressed && styles.subscribeButtonPressed,
                    ]}
                  >
                    <Send size={18} color="#000" />
                  </Pressable>
                </View>
              )}
            </GlassCard>

            {/* App Downloads */}
            <View style={styles.appDownloads}>
              <Text style={[styles.appTitle, isRTL && styles.textRTL]}>
                {t('footer.apps.title', 'Get the App')}
              </Text>
              <View style={styles.appButtons}>
                <Pressable
                  onPress={() => window.open('https://apps.apple.com/app/bayitplus', '_blank')}
                  style={({ pressed }) => [
                    styles.appButton,
                    pressed && styles.appButtonPressed,
                  ]}
                >
                  <GlassView style={styles.appButtonContent} intensity="low">
                    <Smartphone size={20} color={colors.text} />
                    <View>
                      <Text style={styles.appButtonLabel}>
                        {t('footer.apps.downloadOn', 'Download on')}
                      </Text>
                      <Text style={styles.appButtonStore}>App Store</Text>
                    </View>
                  </GlassView>
                </Pressable>
                <Pressable
                  onPress={() => window.open('https://play.google.com/store/apps/details?id=com.bayitplus', '_blank')}
                  style={({ pressed }) => [
                    styles.appButton,
                    pressed && styles.appButtonPressed,
                  ]}
                >
                  <GlassView style={styles.appButtonContent} intensity="low">
                    <Smartphone size={20} color={colors.text} />
                    <View>
                      <Text style={styles.appButtonLabel}>
                        {t('footer.apps.getItOn', 'Get it on')}
                      </Text>
                      <Text style={styles.appButtonStore}>Google Play</Text>
                    </View>
                  </GlassView>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <View style={[styles.bottomBarContent, isRTL && styles.bottomBarContentRTL]}>
            {/* Copyright */}
            <Text style={styles.copyrightText}>
              {t('footer.copyright', '© {{year}} Bayit+. All rights reserved.', {
                year: new Date().getFullYear(),
              })}
            </Text>

            {/* Language Selector */}
            <View style={styles.languageSelector}>
              <Pressable
                style={styles.languageButton}
                onPress={() => setShowLanguageMenu(!showLanguageMenu)}
              >
                <Globe size={16} color={colors.textSecondary} />
                <Text style={styles.languageButtonText}>
                  {currentLanguage.flag} {currentLanguage.label}
                </Text>
                <ChevronDown size={14} color={colors.textSecondary} />
              </Pressable>

              {showLanguageMenu && (
                <View style={styles.languageMenu}>
                  {LANGUAGES.map((lang) => (
                    <Pressable
                      key={lang.code}
                      style={[
                        styles.languageOption,
                        lang.code === i18n.language && styles.languageOptionActive,
                      ]}
                      onPress={() => handleLanguageChange(lang.code)}
                    >
                      <Text style={styles.languageOptionFlag}>{lang.flag}</Text>
                      <Text
                        style={[
                          styles.languageOptionText,
                          lang.code === i18n.language && styles.languageOptionTextActive,
                        ]}
                      >
                        {lang.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Additional Links */}
            <View style={[styles.bottomLinks, isRTL && styles.bottomLinksRTL]}>
              <Link to="/sitemap" style={{ textDecoration: 'none' }}>
                <Text style={styles.bottomLink}>{t('footer.sitemap', 'Sitemap')}</Text>
              </Link>
              <Text style={styles.bottomDivider}>•</Text>
              <Link to="/accessibility" style={{ textDecoration: 'none' }}>
                <Text style={styles.bottomLink}>{t('footer.accessibility', 'Accessibility')}</Text>
              </Link>
            </View>
          </View>
        </View>
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 'auto' as any,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  container: {
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  mainContent: {
    flexDirection: 'row',
    padding: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xl,
  },
  mainContentMobile: {
    flexDirection: 'column',
  },
  brandSection: {
    flex: 1,
    maxWidth: 280,
    gap: spacing.md,
  },
  brandSectionMobile: {
    maxWidth: '100%',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing.sm,
  },
  brandDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  textRTL: {
    textAlign: 'right',
  },
  contactInfo: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contactItemRTL: {
    flexDirection: 'row-reverse',
  },
  contactText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore
    transition: 'all 0.2s ease',
  },
  socialButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    // @ts-ignore
    transform: 'scale(0.95)',
  },
  linksGrid: {
    flex: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  linksGridMobile: {
    justifyContent: 'space-between',
  },
  linkColumn: {
    minWidth: 120,
    gap: spacing.sm,
  },
  columnTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  linkText: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingVertical: 4,
    // @ts-ignore
    transition: 'color 0.2s ease',
  },
  rightSection: {
    flex: 1,
    maxWidth: 320,
    gap: spacing.lg,
  },
  rightSectionMobile: {
    maxWidth: '100%',
  },
  newsletterCard: {
    padding: spacing.lg,
  },
  newsletterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  newsletterDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  newsletterForm: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  newsletterFormRTL: {
    flexDirection: 'row-reverse',
  },
  inputWrapper: {
    flex: 1,
  },
  emailInput: {
    marginBottom: 0,
  },
  subscribeButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore
    transition: 'all 0.2s ease',
  },
  subscribeButtonPressed: {
    opacity: 0.9,
    // @ts-ignore
    transform: 'scale(0.95)',
  },
  subscribedMessage: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  subscribedText: {
    fontSize: 14,
    color: colors.success,
    textAlign: 'center',
    fontWeight: '500',
  },
  appDownloads: {
    gap: spacing.sm,
  },
  appTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  appButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  appButton: {
    flex: 1,
    minWidth: 140,
    // @ts-ignore
    transition: 'all 0.2s ease',
  },
  appButtonPressed: {
    opacity: 0.8,
    // @ts-ignore
    transform: 'scale(0.98)',
  },
  appButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  appButtonLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  appButtonStore: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.lg,
    paddingVertical: spacing.md,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  bottomBarContentRTL: {
    flexDirection: 'row-reverse',
  },
  copyrightText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  languageSelector: {
    position: 'relative',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  languageButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  languageMenu: {
    position: 'absolute',
    bottom: '100%',
    left: 0,
    marginBottom: spacing.xs,
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    minWidth: 140,
    // @ts-ignore
    backdropFilter: 'blur(20px)',
    boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  languageOptionActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  languageOptionFlag: {
    fontSize: 16,
  },
  languageOptionText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  languageOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  bottomLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  bottomLinksRTL: {
    flexDirection: 'row-reverse',
  },
  bottomLink: {
    fontSize: 13,
    color: colors.textMuted,
  },
  bottomDivider: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
