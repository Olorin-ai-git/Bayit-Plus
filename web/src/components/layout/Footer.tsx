import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { colors, spacing } from '@bayit/shared/theme';
import { GlassView } from '@bayit/shared/ui';

export default function Footer() {
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isHebrew = i18n.language === 'he';

  const footerLinks = {
    navigation: [
      { to: '/live', labelKey: 'footer.liveTV' },
      { to: '/vod', labelKey: 'footer.moviesAndSeries' },
      { to: '/radio', labelKey: 'footer.radioStations' },
      { to: '/podcasts', labelKey: 'footer.podcasts' },
    ],
    account: [
      { to: '/profile', labelKey: 'footer.myProfile' },
      { to: '/subscribe', labelKey: 'footer.subscriptions' },
      { to: '/help', labelKey: 'footer.helpAndSupport' },
    ],
    legal: [
      { to: '/terms', labelKey: 'footer.termsOfUse' },
      { to: '/privacy', labelKey: 'footer.privacyPolicy' },
      { to: '/contact', labelKey: 'footer.contactUs' },
    ],
  };

  return (
    <GlassView style={styles.footer}>
      <View style={styles.container}>
        <View style={[styles.grid, isMobile && styles.gridMobile]}>
          {/* Brand */}
          <View style={[styles.column, !isMobile && styles.columnBrand]}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <Text style={styles.brandText}>{isHebrew ? 'בית+' : 'Bayit+'}</Text>
            </Link>
            <Text style={styles.brandDescription}>
              {t('footer.brandDescription')}
            </Text>
          </View>

          {/* Navigation */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>{t('footer.navigation')}</Text>
            {footerLinks.navigation.map((link) => (
              <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                <Text style={styles.link}>{t(link.labelKey)}</Text>
              </Link>
            ))}
          </View>

          {/* Account */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>{t('footer.account')}</Text>
            {footerLinks.account.map((link) => (
              <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                <Text style={styles.link}>{t(link.labelKey)}</Text>
              </Link>
            ))}
          </View>

          {/* Legal */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>{t('footer.legal')}</Text>
            {footerLinks.legal.map((link) => (
              <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                <Text style={styles.link}>{t(link.labelKey)}</Text>
              </Link>
            ))}
          </View>
        </View>

        {/* Copyright */}
        <View style={styles.copyright}>
          <Text style={styles.copyrightText}>
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </Text>
        </View>
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  footer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: spacing.xl * 1.5,
    marginTop: 'auto' as any,
  },
  container: {
    maxWidth: 1280,
    marginHorizontal: 'auto',
    paddingHorizontal: spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  gridMobile: {
    flexDirection: 'column',
  },
  column: {
    flex: 1,
    minWidth: 150,
    gap: spacing.sm,
  },
  columnBrand: {
    flex: 2,
  },
  brandText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  brandDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  link: {
    fontSize: 14,
    color: colors.textSecondary,
    paddingVertical: spacing.xs,
  },
  copyright: {
    marginTop: spacing.xl * 1.5,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
