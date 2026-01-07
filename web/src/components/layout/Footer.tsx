import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Link } from 'react-router-dom';
import { colors, spacing } from '@bayit/shared/theme';
import { GlassView } from '@bayit/shared/ui';

const footerLinks = {
  navigation: [
    { to: '/live', label: 'שידור חי' },
    { to: '/vod', label: 'סרטים וסדרות' },
    { to: '/radio', label: 'תחנות רדיו' },
    { to: '/podcasts', label: 'פודקאסטים' },
  ],
  account: [
    { to: '/profile', label: 'הפרופיל שלי' },
    { to: '/subscribe', label: 'מנויים' },
    { to: '/help', label: 'עזרה ותמיכה' },
  ],
  legal: [
    { to: '/terms', label: 'תנאי שימוש' },
    { to: '/privacy', label: 'מדיניות פרטיות' },
    { to: '/contact', label: 'צור קשר' },
  ],
};

export default function Footer() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  return (
    <GlassView style={styles.footer}>
      <View style={styles.container}>
        <View style={[styles.grid, isMobile && styles.gridMobile]}>
          {/* Brand */}
          <View style={[styles.column, !isMobile && styles.columnBrand]}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <Text style={styles.brandText}>בית+</Text>
            </Link>
            <Text style={styles.brandDescription}>
              הבית שלך בארה״ב. שידורי טלוויזיה, VOD, רדיו ופודקאסטים בעברית.
            </Text>
          </View>

          {/* Navigation */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>ניווט</Text>
            {footerLinks.navigation.map((link) => (
              <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                <Text style={styles.link}>{link.label}</Text>
              </Link>
            ))}
          </View>

          {/* Account */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>חשבון</Text>
            {footerLinks.account.map((link) => (
              <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                <Text style={styles.link}>{link.label}</Text>
              </Link>
            ))}
          </View>

          {/* Legal */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>משפטי</Text>
            {footerLinks.legal.map((link) => (
              <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                <Text style={styles.link}>{link.label}</Text>
              </Link>
            ))}
          </View>
        </View>

        {/* Copyright */}
        <View style={styles.copyright}>
          <Text style={styles.copyrightText}>
            © {new Date().getFullYear()} בית+. כל הזכויות שמורות.
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
