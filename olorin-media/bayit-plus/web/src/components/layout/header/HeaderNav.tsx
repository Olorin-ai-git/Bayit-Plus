/**
 * HeaderNav Component
 *
 * Navigation links for desktop header
 * Part of Header migration from StyleSheet to TailwindCSS
 *
 * Features:
 * - NavLink with active state styling
 * - i18n support for all link labels
 * - RTL layout support
 * - Remote control mode support (disabled state)
 * - Touch targets meet accessibility standards
 */

import { View, Text } from 'react-native';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { platformClass } from '../../../utils/platformClass';

// Zod schema for navigation link
const NavLinkSchema = z.object({
  to: z.string(),
  key: z.string(),
});

const HeaderNavPropsSchema = z.object({
  isRemoteControlEnabled: z.boolean(),
  navLinks: z.array(NavLinkSchema).optional(),
});

type NavLinkItem = z.infer<typeof NavLinkSchema>;
type HeaderNavProps = z.infer<typeof HeaderNavPropsSchema>;

const DEFAULT_NAV_LINKS: NavLinkItem[] = [
  { to: '/', key: 'nav.home' },
  { to: '/live', key: 'nav.liveTV' },
  { to: '/epg', key: 'nav.epg' },
  { to: '/vod', key: 'nav.vod' },
  { to: '/radio', key: 'nav.radio' },
  { to: '/podcasts', key: 'nav.podcasts' },
  { to: '/judaism', key: 'nav.judaism' },
  { to: '/children', key: 'nav.children' },
];

export default function HeaderNav({
  isRemoteControlEnabled = true,
  navLinks = DEFAULT_NAV_LINKS,
}: Partial<HeaderNavProps>) {
  const { t } = useTranslation();

  // Validate props
  HeaderNavPropsSchema.partial().parse({ isRemoteControlEnabled, navLinks });

  return (
    <View
      className={platformClass(
        'flex-row gap-1',
        'flex-row gap-1'
      )}
    >
      {navLinks.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          style={{
            textDecoration: 'none',
            pointerEvents: isRemoteControlEnabled ? 'auto' : 'none',
            opacity: isRemoteControlEnabled ? 1 : 0.5,
          }}
        >
          {({ isActive }) => (
            <View
              className={platformClass(
                `px-3 py-2 rounded-lg transition-all ${
                  isActive
                    ? 'bg-purple-500/30 border border-purple-500/50'
                    : 'hover:bg-white/10'
                }`,
                `px-3 py-2 rounded-lg ${
                  isActive
                    ? 'bg-purple-500/30 border border-purple-500/50'
                    : ''
                }`
              )}
            >
              <Text
                className={platformClass(
                  `text-sm ${
                    isActive
                      ? 'text-purple-300 font-semibold'
                      : 'text-white/80 font-medium'
                  }`,
                  `text-sm ${
                    isActive
                      ? 'text-purple-300 font-semibold'
                      : 'text-white/80 font-medium'
                  }`
                )}
              >
                {t(link.key)}
              </Text>
            </View>
          )}
        </NavLink>
      ))}
    </View>
  );
}

// Export default nav links for reuse
export { DEFAULT_NAV_LINKS };
