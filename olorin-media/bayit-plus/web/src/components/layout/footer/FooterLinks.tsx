/**
 * FooterLinks Component
 *
 * Displays 4 columns of navigation links (Browse, Account, Support, Legal)
 * Part of Footer migration from StyleSheet to TailwindCSS
 *
 * Features:
 * - 4-column grid layout (responsive on mobile)
 * - React Router Link integration
 * - i18n support for all link labels
 * - RTL layout support
 * - Touch targets meet accessibility standards
 */

import { View, Text } from 'react-native';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { platformClass } from '../../../utils/platformClass';

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
    <View
      className={platformClass(
        `flex-1 flex-row gap-6 justify-center ${isMobile ? 'flex-wrap justify-around' : ''}`,
        `flex-1 flex-row gap-6 justify-center ${isMobile ? 'flex-wrap justify-around' : ''}`
      )}
    >
      {columns.map((column, idx) => (
        <View key={idx} className={platformClass('gap-2')}>
          {/* Column Title */}
          <Text
            className={platformClass(
              `text-xs font-semibold text-white mb-1 ${isRTL ? 'text-right' : 'text-left'}`,
              `text-xs font-semibold text-white mb-1 ${isRTL ? 'text-right' : 'text-left'}`
            )}
          >
            {column.title}
          </Text>

          {/* Links List */}
          <View className={platformClass('gap-0.5')}>
            {column.links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                style={{ textDecoration: 'none' }}
              >
                <Text
                  className={platformClass(
                    `text-[11px] text-white/60 py-0.5 hover:text-white/90 ${isRTL ? 'text-right' : 'text-left'}`,
                    `text-[11px] text-white/60 py-0.5 ${isRTL ? 'text-right' : 'text-left'}`
                  )}
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
