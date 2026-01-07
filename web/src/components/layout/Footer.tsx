import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Animated } from 'react-native';
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
  ChevronUp,
  Smartphone,
  Send,
  GripHorizontal,
} from 'lucide-react';
import { colors, spacing, borderRadius } from '@bayit/shared/theme';
import { GlassView, GlassCard, GlassInput, GlassButton, AnimatedLogo } from '@bayit/shared';

const LANGUAGE_CODES = [
  { code: 'en', flag: '🇺🇸' },
  { code: 'he', flag: '🇮🇱' },
  { code: 'es', flag: '🇪🇸' },
];

const SOCIAL_PLATFORMS = [
  { icon: Facebook, url: 'https://facebook.com/bayitplus', key: 'facebook' },
  { icon: Twitter, url: 'https://twitter.com/bayitplus', key: 'twitter' },
  { icon: Instagram, url: 'https://instagram.com/bayitplus', key: 'instagram' },
  { icon: Youtube, url: 'https://youtube.com/bayitplus', key: 'youtube' },
];

const COLLAPSED_HEIGHT = 48;
const EXPANDED_HEIGHT = 320;
const MIN_HEIGHT = 48;
const MAX_HEIGHT = 500;

export default function Footer() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isTablet = width < 1024;
  const isRTL = i18n.language === 'he' || i18n.language === 'ar';

  const [isExpanded, setIsExpanded] = useState(false);
  const [height, setHeight] = useState(COLLAPSED_HEIGHT);
  const [isDragging, setIsDragging] = useState(false);
  const [email, setEmail] = useState('');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const currentLanguage = LANGUAGE_CODES.find(lang => lang.code === i18n.language) || LANGUAGE_CODES[0];
  const currentLanguageLabel = t(`settings.languages.${i18n.language}`);

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    setShowLanguageMenu(false);
  };

  const handleSubscribe = () => {
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    setHeight(newExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT);
  };

  const handleDragStart = useCallback((e: any) => {
    e.preventDefault();
    setIsDragging(true);

    const startY = e.clientY || (e.touches && e.touches[0].clientY);
    const startHeight = height;

    const handleDrag = (moveEvent: any) => {
      const currentY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0].clientY);
      const deltaY = startY - currentY;
      const newHeight = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + deltaY));
      setHeight(newHeight);
      setIsExpanded(newHeight > COLLAPSED_HEIGHT + 20);
    };

    const handleDragEnd = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleDrag);
      document.removeEventListener('mouseup', handleDragEnd);
      document.removeEventListener('touchmove', handleDrag);
      document.removeEventListener('touchend', handleDragEnd);

      // Snap to collapsed or expanded
      if (height < (COLLAPSED_HEIGHT + EXPANDED_HEIGHT) / 2) {
        setHeight(COLLAPSED_HEIGHT);
        setIsExpanded(false);
      } else {
        setHeight(EXPANDED_HEIGHT);
        setIsExpanded(true);
      }
    };

    document.addEventListener('mousemove', handleDrag);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchmove', handleDrag);
    document.addEventListener('touchend', handleDragEnd);
  }, [height]);

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
    <GlassView
      style={[
        styles.footer,
        { height },
        isDragging && styles.footerDragging,
      ]}
      intensity="high"
    >
      {/* Splitter Handle */}
      <Pressable
        style={[styles.splitterHandle, isDragging && styles.splitterHandleActive]}
        onPress={toggleExpanded}
        onPressIn={handleDragStart as any}
      >
        <View style={styles.splitterGrip}>
          <GripHorizontal size={20} color={colors.textMuted} />
        </View>
        <View style={[styles.splitterContent, isRTL && styles.splitterContentRTL]}>
          {!isExpanded && (
            <>
              <View style={styles.collapsedBrand}>
                <AnimatedLogo size="small" />
                <Text style={styles.collapsedTitle}>Bayit+</Text>
              </View>
              <Text style={styles.collapsedCopyright}>
                {t('footer.copyright', '© {{year}} Bayit+. All rights reserved.', {
                  year: new Date().getFullYear(),
                })}
              </Text>
            </>
          )}
          <Pressable
            style={styles.expandButton}
            onPress={toggleExpanded}
          >
            {isExpanded ? (
              <ChevronDown size={18} color={colors.textSecondary} />
            ) : (
              <ChevronUp size={18} color={colors.textSecondary} />
            )}
          </Pressable>
        </View>
      </Pressable>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.container}>
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
                  <Mail size={14} color={colors.textMuted} />
                  <Text style={styles.contactText}>support@bayitplus.com</Text>
                </View>
                <View style={[styles.contactItem, isRTL && styles.contactItemRTL]}>
                  <Phone size={14} color={colors.textMuted} />
                  <Text style={styles.contactText}>1-800-BAYIT-TV</Text>
                </View>
              </View>

              {/* Social Links */}
              <View style={styles.socialLinks}>
                {SOCIAL_PLATFORMS.map((social) => (
                  <Pressable
                    key={social.key}
                    onPress={() => window.open(social.url, '_blank')}
                    style={({ pressed }) => [
                      styles.socialButton,
                      pressed && styles.socialButtonPressed,
                    ]}
                    aria-label={t(`footer.social.${social.key}`)}
                  >
                    <social.icon size={16} color={colors.text} />
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Links Grid - Horizontal */}
            <View style={[styles.linksGrid, isMobile && styles.linksGridMobile]}>
              {/* Browse Column */}
              <View style={styles.linkColumn}>
                <Text style={[styles.columnTitle, isRTL && styles.textRTL]}>
                  {t('footer.browse', 'Browse')}
                </Text>
                <View style={styles.linksList}>
                  {footerLinks.browse.map((link) => (
                    <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                      <Text style={[styles.linkText, isRTL && styles.textRTL]}>
                        {link.label}
                      </Text>
                    </Link>
                  ))}
                </View>
              </View>

              {/* Account Column */}
              <View style={styles.linkColumn}>
                <Text style={[styles.columnTitle, isRTL && styles.textRTL]}>
                  {t('footer.account', 'Account')}
                </Text>
                <View style={styles.linksList}>
                  {footerLinks.account.map((link) => (
                    <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                      <Text style={[styles.linkText, isRTL && styles.textRTL]}>
                        {link.label}
                      </Text>
                    </Link>
                  ))}
                </View>
              </View>

              {/* Support Column */}
              <View style={styles.linkColumn}>
                <Text style={[styles.columnTitle, isRTL && styles.textRTL]}>
                  {t('footer.support', 'Support')}
                </Text>
                <View style={styles.linksList}>
                  {footerLinks.support.map((link) => (
                    <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                      <Text style={[styles.linkText, isRTL && styles.textRTL]}>
                        {link.label}
                      </Text>
                    </Link>
                  ))}
                </View>
              </View>

              {/* Legal Column */}
              <View style={styles.linkColumn}>
                <Text style={[styles.columnTitle, isRTL && styles.textRTL]}>
                  {t('footer.legal', 'Legal')}
                </Text>
                <View style={styles.linksList}>
                  {footerLinks.legal.map((link) => (
                    <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                      <Text style={[styles.linkText, isRTL && styles.textRTL]}>
                        {link.label}
                      </Text>
                    </Link>
                  ))}
                </View>
              </View>
            </View>

            {/* Newsletter & Actions */}
            <View style={[styles.rightSection, isMobile && styles.rightSectionMobile]}>
              {/* Newsletter */}
              <View style={styles.newsletterSection}>
                <Text style={[styles.newsletterTitle, isRTL && styles.textRTL]}>
                  {t('footer.newsletter.title', 'Stay Updated')}
                </Text>
                {subscribed ? (
                  <Text style={styles.subscribedText}>
                    {t('footer.newsletter.success', 'Thanks for subscribing!')}
                  </Text>
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
                        icon={<Mail size={16} color={colors.textMuted} />}
                      />
                    </View>
                    <Pressable
                      onPress={handleSubscribe}
                      style={({ pressed }) => [
                        styles.subscribeButton,
                        pressed && styles.subscribeButtonPressed,
                      ]}
                    >
                      <Send size={16} color="#000" />
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Language Selector */}
              <View style={styles.languageSelector}>
                <Pressable
                  style={styles.languageButton}
                  onPress={() => setShowLanguageMenu(!showLanguageMenu)}
                >
                  <Globe size={14} color={colors.textSecondary} />
                  <Text style={styles.languageButtonText}>
                    {currentLanguage.flag} {currentLanguageLabel}
                  </Text>
                  <ChevronUp size={12} color={colors.textSecondary} />
                </Pressable>

                {showLanguageMenu && (
                  <View style={styles.languageMenu}>
                    {LANGUAGE_CODES.map((lang) => (
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
                          {t(`settings.languages.${lang.code}`)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              {/* App Downloads */}
              <View style={styles.appDownloads}>
                <View style={styles.appButtons}>
                  <Pressable
                    onPress={() => window.open('https://apps.apple.com/app/bayitplus', '_blank')}
                    style={({ pressed }) => [
                      styles.appButton,
                      pressed && styles.appButtonPressed,
                    ]}
                  >
                    <GlassView style={styles.appButtonContent} intensity="low">
                      <Smartphone size={14} color={colors.text} />
                      <Text style={styles.appButtonStore}>{t('footer.apps.appStore')}</Text>
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
                      <Smartphone size={14} color={colors.text} />
                      <Text style={styles.appButtonStore}>{t('footer.apps.googlePlay')}</Text>
                    </GlassView>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom Bar */}
          <View style={styles.bottomBar}>
            <View style={[styles.bottomBarContent, isRTL && styles.bottomBarContentRTL]}>
              <Text style={styles.copyrightText}>
                {t('footer.copyright', '© {{year}} Bayit+. All rights reserved.', {
                  year: new Date().getFullYear(),
                })}
              </Text>
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
      )}
    </GlassView>
  );
}

const styles = StyleSheet.create({
  footer: {
    marginTop: 'auto' as any,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    // @ts-ignore
    transition: 'height 0.3s ease',
  },
  footerDragging: {
    // @ts-ignore
    transition: 'none',
    // @ts-ignore
    userSelect: 'none',
  },
  splitterHandle: {
    height: COLLAPSED_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    // @ts-ignore
    cursor: 'ns-resize',
  },
  splitterHandleActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.05)',
  },
  splitterGrip: {
    position: 'absolute',
    top: 0,
    left: '50%',
    // @ts-ignore
    transform: 'translateX(-50%)',
    paddingVertical: 4,
    paddingHorizontal: spacing.md,
    opacity: 0.6,
  },
  splitterContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    height: '100%',
  },
  splitterContentRTL: {
    flexDirection: 'row-reverse',
  },
  collapsedBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  collapsedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  collapsedCopyright: {
    fontSize: 12,
    color: colors.textMuted,
  },
  expandButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  container: {
    flex: 1,
    maxWidth: 1400,
    marginHorizontal: 'auto',
    width: '100%',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    padding: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  mainContentMobile: {
    flexDirection: 'column',
  },
  brandSection: {
    minWidth: 180,
    gap: spacing.xs,
  },
  brandSectionMobile: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing.xs,
  },
  brandDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  textRTL: {
    textAlign: 'right',
  },
  contactInfo: {
    gap: 4,
    marginTop: spacing.xs,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contactItemRTL: {
    flexDirection: 'row-reverse',
  },
  contactText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  socialButton: {
    width: 32,
    height: 32,
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
    flex: 1,
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'center',
  },
  linksGridMobile: {
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  linkColumn: {
    gap: spacing.xs,
  },
  columnTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  linksList: {
    gap: 2,
  },
  linkText: {
    fontSize: 11,
    color: colors.textSecondary,
    paddingVertical: 2,
    // @ts-ignore
    transition: 'color 0.2s ease',
  },
  rightSection: {
    minWidth: 200,
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  rightSectionMobile: {
    alignItems: 'center',
  },
  newsletterSection: {
    gap: spacing.xs,
  },
  newsletterTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  newsletterForm: {
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  newsletterFormRTL: {
    flexDirection: 'row-reverse',
  },
  inputWrapper: {
    width: 160,
  },
  emailInput: {
    marginBottom: 0,
  },
  subscribeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
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
  subscribedText: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '500',
  },
  languageSelector: {
    position: 'relative',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  languageButtonText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  languageMenu: {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    marginBottom: spacing.xs,
    backgroundColor: 'rgba(20, 20, 30, 0.95)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    minWidth: 120,
    // @ts-ignore
    backdropFilter: 'blur(20px)',
    boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)',
    zIndex: 100,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  languageOptionActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.1)',
  },
  languageOptionFlag: {
    fontSize: 14,
  },
  languageOptionText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  languageOptionTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  appDownloads: {
    gap: spacing.xs,
  },
  appButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  appButton: {
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
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  appButtonStore: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  bottomBarContentRTL: {
    flexDirection: 'row-reverse',
  },
  copyrightText: {
    fontSize: 10,
    color: colors.textMuted,
  },
  bottomLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bottomLinksRTL: {
    flexDirection: 'row-reverse',
  },
  bottomLink: {
    fontSize: 10,
    color: colors.textMuted,
  },
  bottomDivider: {
    color: colors.textMuted,
    fontSize: 10,
  },
});
