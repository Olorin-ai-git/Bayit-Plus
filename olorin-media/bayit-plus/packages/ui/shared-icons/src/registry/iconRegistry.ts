/**
 * Olorin Unified Icon Registry
 * Centralized icon definitions for all platforms (Web, Mobile, TV)
 * Uses lucide-react icons for consistency across the ecosystem
 */

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type IconCategory = 'navigation' | 'action' | 'status' | 'media' | 'ui' | 'admin';
export type IconVariant = 'solid' | 'outline';

export interface IconDefinition {
  name: string;
  lucideName: string;
  category: IconCategory;
  description: string;
  usage?: string[];
}

export interface IconSizeMap {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

/**
 * Lucide Icon Registry
 * Complete mapping of all icons used across Olorin ecosystem
 */
export const ICON_REGISTRY: Record<string, IconDefinition> = {
  // Navigation Icons
  home: {
    name: 'home',
    lucideName: 'Home',
    category: 'navigation',
    description: 'Home/Dashboard',
    usage: ['navbar', 'sidebar', 'main_nav'],
  },
  live: {
    name: 'live',
    lucideName: 'Tv',
    category: 'navigation',
    description: 'Live TV',
    usage: ['navbar', 'sidebar', 'main_nav'],
  },
  vod: {
    name: 'vod',
    lucideName: 'Film',
    category: 'navigation',
    description: 'Video On Demand',
    usage: ['navbar', 'sidebar', 'main_nav'],
  },
  radio: {
    name: 'radio',
    lucideName: 'Radio',
    category: 'navigation',
    description: 'Radio',
    usage: ['navbar', 'sidebar', 'main_nav'],
  },
  podcasts: {
    name: 'podcasts',
    lucideName: 'Mic',
    category: 'navigation',
    description: 'Podcasts',
    usage: ['navbar', 'sidebar', 'main_nav'],
  },
  epg: {
    name: 'epg',
    lucideName: 'Calendar',
    category: 'navigation',
    description: 'EPG / TV Guide',
    usage: ['navbar', 'sidebar', 'main_nav'],
  },
  search: {
    name: 'search',
    lucideName: 'Search',
    category: 'navigation',
    description: 'Search',
    usage: ['navbar', 'header', 'action_bar'],
  },
  profile: {
    name: 'profile',
    lucideName: 'User',
    category: 'navigation',
    description: 'User Profile',
    usage: ['navbar', 'sidebar', 'user_menu'],
  },
  settings: {
    name: 'settings',
    lucideName: 'Settings',
    category: 'navigation',
    description: 'Settings',
    usage: ['navbar', 'sidebar', 'settings_page'],
  },
  support: {
    name: 'support',
    lucideName: 'HelpCircle',
    category: 'navigation',
    description: 'Help & Support',
    usage: ['navbar', 'sidebar', 'footer'],
  },
  admin: {
    name: 'admin',
    lucideName: 'ShieldAlert',
    category: 'admin',
    description: 'Admin Dashboard',
    usage: ['navbar', 'sidebar', 'settings'],
  },

  // Content Discovery
  discover: {
    name: 'discover',
    lucideName: 'Compass',
    category: 'navigation',
    description: 'Discover',
    usage: ['navbar', 'sidebar'],
  },
  judaism: {
    name: 'judaism',
    lucideName: 'BookOpen',
    category: 'navigation',
    description: 'Judaism / Spirituality',
    usage: ['sidebar', 'content_category'],
  },
  children: {
    name: 'children',
    lucideName: 'Users',
    category: 'navigation',
    description: 'Kids Content',
    usage: ['sidebar', 'content_category'],
  },

  // Games & Social
  games: {
    name: 'games',
    lucideName: 'Gamepad2',
    category: 'navigation',
    description: 'Games',
    usage: ['navbar', 'sidebar', 'games_menu'],
  },
  friends: {
    name: 'friends',
    lucideName: 'Users2',
    category: 'navigation',
    description: 'Friends / Social',
    usage: ['navbar', 'sidebar', 'games_submenu'],
  },

  // Favorites & Library
  favorites: {
    name: 'favorites',
    lucideName: 'Star',
    category: 'navigation',
    description: 'Favorites',
    usage: ['navbar', 'sidebar', 'library'],
  },
  watchlist: {
    name: 'watchlist',
    lucideName: 'ListVideo',
    category: 'navigation',
    description: 'Watchlist / Queue',
    usage: ['navbar', 'sidebar', 'library'],
  },
  downloads: {
    name: 'downloads',
    lucideName: 'Download',
    category: 'navigation',
    description: 'Downloads',
    usage: ['navbar', 'sidebar', 'library'],
  },
  recordings: {
    name: 'recordings',
    lucideName: 'Disc3',
    category: 'navigation',
    description: 'My Recordings',
    usage: ['navbar', 'sidebar', 'library'],
  },
  widgets: {
    name: 'widgets',
    lucideName: 'Grid',
    category: 'navigation',
    description: 'Widgets',
    usage: ['navbar', 'sidebar'],
  },

  // Subscription
  plans: {
    name: 'plans',
    lucideName: 'Crown',
    category: 'navigation',
    description: 'Subscription Plans',
    usage: ['navbar', 'sidebar', 'cta'],
  },

  // Actions
  play: {
    name: 'play',
    lucideName: 'Play',
    category: 'action',
    description: 'Play',
    usage: ['player', 'controls'],
  },
  pause: {
    name: 'pause',
    lucideName: 'Pause',
    category: 'action',
    description: 'Pause',
    usage: ['player', 'controls'],
  },
  skip: {
    name: 'skip',
    lucideName: 'SkipForward',
    category: 'action',
    description: 'Skip Forward',
    usage: ['player', 'controls'],
  },
  skipBack: {
    name: 'skipBack',
    lucideName: 'SkipBack',
    category: 'action',
    description: 'Skip Back',
    usage: ['player', 'controls'],
  },
  volumeUp: {
    name: 'volumeUp',
    lucideName: 'Volume2',
    category: 'action',
    description: 'Volume Up',
    usage: ['player', 'controls'],
  },
  volumeDown: {
    name: 'volumeDown',
    lucideName: 'Volume1',
    category: 'action',
    description: 'Volume Down',
    usage: ['player', 'controls'],
  },
  mute: {
    name: 'mute',
    lucideName: 'VolumeX',
    category: 'action',
    description: 'Mute',
    usage: ['player', 'controls'],
  },
  fullscreen: {
    name: 'fullscreen',
    lucideName: 'Maximize',
    category: 'action',
    description: 'Fullscreen',
    usage: ['player', 'controls'],
  },
  exitFullscreen: {
    name: 'exitFullscreen',
    lucideName: 'Minimize',
    category: 'action',
    description: 'Exit Fullscreen',
    usage: ['player', 'controls'],
  },
  add: {
    name: 'add',
    lucideName: 'Plus',
    category: 'action',
    description: 'Add',
    usage: ['buttons', 'toolbar'],
  },
  remove: {
    name: 'remove',
    lucideName: 'Minus',
    category: 'action',
    description: 'Remove',
    usage: ['buttons', 'toolbar'],
  },
  close: {
    name: 'close',
    lucideName: 'X',
    category: 'action',
    description: 'Close',
    usage: ['modals', 'dialogs', 'panels'],
  },
  menu: {
    name: 'menu',
    lucideName: 'Menu',
    category: 'action',
    description: 'Menu',
    usage: ['navbar', 'hamburger'],
  },
  back: {
    name: 'back',
    lucideName: 'ArrowLeft',
    category: 'action',
    description: 'Back',
    usage: ['navigation', 'breadcrumbs'],
  },
  forward: {
    name: 'forward',
    lucideName: 'ArrowRight',
    category: 'action',
    description: 'Forward',
    usage: ['navigation', 'breadcrumbs'],
  },
  edit: {
    name: 'edit',
    lucideName: 'Edit2',
    category: 'action',
    description: 'Edit',
    usage: ['forms', 'crud'],
  },
  delete: {
    name: 'delete',
    lucideName: 'Trash2',
    category: 'action',
    description: 'Delete',
    usage: ['crud', 'forms'],
  },
  share: {
    name: 'share',
    lucideName: 'Share2',
    category: 'action',
    description: 'Share',
    usage: ['social', 'content_actions'],
  },
  download: {
    name: 'download',
    lucideName: 'Download',
    category: 'action',
    description: 'Download',
    usage: ['content_actions', 'toolbar'],
  },

  // Status
  loading: {
    name: 'loading',
    lucideName: 'Loader',
    category: 'status',
    description: 'Loading',
    usage: ['indicators', 'spinners'],
  },
  success: {
    name: 'success',
    lucideName: 'CheckCircle',
    category: 'status',
    description: 'Success',
    usage: ['alerts', 'validation'],
  },
  error: {
    name: 'error',
    lucideName: 'AlertCircle',
    category: 'status',
    description: 'Error',
    usage: ['alerts', 'validation'],
  },
  warning: {
    name: 'warning',
    lucideName: 'AlertTriangle',
    category: 'status',
    description: 'Warning',
    usage: ['alerts', 'notifications'],
  },
  info: {
    name: 'info',
    lucideName: 'Info',
    category: 'status',
    description: 'Information',
    usage: ['alerts', 'tooltips'],
  },
  check: {
    name: 'check',
    lucideName: 'Check',
    category: 'status',
    description: 'Checkmark',
    usage: ['validation', 'lists'],
  },
  clock: {
    name: 'clock',
    lucideName: 'Clock',
    category: 'status',
    description: 'Time / Clock',
    usage: ['timing', 'duration'],
  },

  // UI Elements
  dropdown: {
    name: 'dropdown',
    lucideName: 'ChevronDown',
    category: 'ui',
    description: 'Dropdown',
    usage: ['dropdowns', 'selects'],
  },
  expand: {
    name: 'expand',
    lucideName: 'ChevronDown',
    category: 'ui',
    description: 'Expand',
    usage: ['accordions', 'collapsible'],
  },
  collapse: {
    name: 'collapse',
    lucideName: 'ChevronUp',
    category: 'ui',
    description: 'Collapse',
    usage: ['accordions', 'collapsible'],
  },
  more: {
    name: 'more',
    lucideName: 'MoreVertical',
    category: 'ui',
    description: 'More Options',
    usage: ['context_menus', 'overflow'],
  },
};

/**
 * Icon size mappings for different platforms and contexts
 */
export const ICON_SIZES: Record<string, IconSizeMap> = {
  default: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  navigation: {
    xs: 14,
    sm: 18,
    md: 22,
    lg: 28,
    xl: 36,
    xxl: 48,
  },
  player: {
    xs: 20,
    sm: 24,
    md: 32,
    lg: 40,
    xl: 48,
    xxl: 64,
  },
  tv: {
    xs: 20,
    sm: 28,
    md: 36,
    lg: 48,
    xl: 64,
    xxl: 80,
  },
};

/**
 * Get an icon definition by name
 */
export function getIcon(iconName: string): IconDefinition | undefined {
  return ICON_REGISTRY[iconName];
}

/**
 * Get all icons by category
 */
export function getIconsByCategory(category: IconCategory): IconDefinition[] {
  return Object.values(ICON_REGISTRY).filter(icon => icon.category === category);
}

/**
 * Get size value for a given context
 */
export function getIconSize(size: IconSize, context: string = 'default'): number {
  const sizeMap = ICON_SIZES[context] || ICON_SIZES.default;
  return sizeMap[size];
}

/**
 * Validate icon name exists in registry
 */
export function isValidIcon(iconName: string): boolean {
  return iconName in ICON_REGISTRY;
}

export default ICON_REGISTRY;
