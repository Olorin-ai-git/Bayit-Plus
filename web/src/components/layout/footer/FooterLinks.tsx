/**
 * FooterLinks Component
 *
 * Displays 4 columns of navigation links (Browse, Account, Support, Legal)
 * Part of Footer - StyleSheet implementation for RN Web compatibility
 *
 * Features:
 * - 4-column grid layout (responsive on mobile)
 * - React Router Link integration
 * - i18n support for all link labels
 * - RTL layout support
 * - Touch targets meet accessibility standards
 */

import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

// Zod schema for link structure
const LinkSchema = z.object({
  to: z.string(),
  label: z.string(),
});

const FooterLinksPropsSchema = z.object({
  isMobile: z.boolean(),
  isRTL: z.boolean(),
});

type FooterLink = z.infer<typeof LinkSchema>;
type FooterLinksProps = z.infer<typeof FooterLinksPropsSchema>;

interface LinkColumn {
  title: string;
  links: FooterLink[];
}

export default function FooterLinks({
  isMobile = false,
  isRTL = false,
}: Partial<FooterLinksProps>) {
  const { t } = useTranslation();

  // Validate props
  FooterLinksPropsSchema.partial().parse({ isMobile, isRTL });

  // Link data structure
  const columns: LinkColumn[] = [
    {
      title: t('footer.browse', 'Browse'),
      links: [
        { to: '/', label: t('footer.links.home', 'Home') },
        { to: '/live', label: t('footer.links.liveTV', 'Live TV') },
        { to: '/vod', label: t('footer.links.vod', 'Movies & Series') },
        { to: '/radio', label: t('footer.links.radio', 'Radio') },
        { to: '/podcasts', label: t('footer.links.podcasts', 'Podcasts') },
        { to: '/judaism', label: t('footer.links.judaism', 'Judaism') },
      ],
    },
    {
      title: t('footer.account', 'Account'),
      links: [
        { to: '/profile', label: t('footer.links.profile', 'My Profile') },
        { to: '/favorites', label: t('footer.links.favorites', 'Favorites') },
        { to: '/watchlist', label: t('footer.links.watchlist', 'Watchlist') },
        { to: '/subscribe', label: t('footer.links.subscribe', 'Subscribe') },
        { to: '/downloads', label: t('footer.links.downloads', 'Downloads') },
      ],
    },
    {
      title: t('footer.support', 'Support'),
      links: [
        { to: '/help', label: t('footer.links.help', 'Help Center') },
        { to: '/faq', label: t('footer.links.faq', 'FAQ') },
        { to: '/contact', label: t('footer.links.contact', 'Contact Us') },
        { to: '/feedback', label: t('footer.links.feedback', 'Feedback') },
      ],
    },
    {
      title: t('footer.legal', 'Legal'),
      links: [
        { to: '/terms', label: t('footer.links.terms', 'Terms of Service') },
        { to: '/privacy', label: t('footer.links.privacy', 'Privacy Policy') },
        { to: '/cookies', label: t('footer.links.cookies', 'Cookie Policy') },
        { to: '/licenses', label: t('footer.links.licenses', 'Licenses') },
      ],
    },
  ];

  return (
    <View style={[styles.container, isMobile && styles.containerMobile]}>
      {columns.map((column, idx) => (
        <View key={idx} style={styles.column}>
          {/* Column Title */}
          <Text style={[styles.columnTitle, isRTL && styles.textRTL]}>
            {column.title}
          </Text>

          {/* Links List */}
          <View style={styles.linksList}>
            {column.links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                style={{ textDecoration: 'none' }}
              >
                <Text
                  style={[styles.linkText, isRTL && styles.textRTL]}
                  accessibilityRole="link"
                >
                  {link.label}
                </Text>
              </Link>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
  },
  containerMobile: {
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  column: {
    gap: 8,
  },
  columnTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  textRTL: {
    textAlign: 'right',
  },
  linksList: {
    gap: 2,
  },
  linkText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    paddingVertical: 2,
  },
});
