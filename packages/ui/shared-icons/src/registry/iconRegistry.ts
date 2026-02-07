/**
 * Olorin Unified Icon Registry
 * Centralized icon definitions for all platforms (Web, Mobile, TV)
 * Uses lucide-react icons for consistency across the ecosystem
 */

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type IconCategory = 'navigation' | 'action' | 'status' | 'media' | 'ui' | 'admin';
export type IconVariant = 'solid' | 'outline';
export type GlassLevel = 'light' | 'medium' | 'strong';

export interface IconStyling {
  defaultColor?: string;
  gradientColors?: [string, string];
  backgroundColor?: string;
  glassLevel?: GlassLevel;
  borderColor?: string;
}

export interface IconDefinition {
  name: string;
  lucideName: string;
  category: IconCategory;
  description: string;
  usage?: string[];
  styling?: IconStyling;
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
  audiobooks: {
    name: 'audiobooks',
    lucideName: 'Headphones',
    category: 'navigation',
    description: 'Audiobooks',
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
  playlist: {
    name: 'playlist',
    lucideName: 'ListMusic',
    category: 'navigation',
    description: 'Playlist',
    usage: ['navbar', 'sidebar', 'library'],
  },
  watchlist: {
    name: 'watchlist',
    lucideName: 'ListVideo',
    category: 'navigation',
    description: 'Playlist / Queue (legacy alias)',
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
  x: {
    name: 'x',
    lucideName: 'X',
    category: 'action',
    description: 'X / Close / Clear',
    usage: ['modals', 'dialogs', 'filters', 'clear_buttons'],
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
  chevronDown: {
    name: 'chevronDown',
    lucideName: 'ChevronDown',
    category: 'ui',
    description: 'Chevron Down Arrow',
    usage: ['dropdowns', 'accordions', 'navigation'],
  },
  chevronUp: {
    name: 'chevronUp',
    lucideName: 'ChevronUp',
    category: 'ui',
    description: 'Chevron Up Arrow',
    usage: ['dropdowns', 'accordions', 'navigation'],
  },
  chevronLeft: {
    name: 'chevronLeft',
    lucideName: 'ChevronLeft',
    category: 'ui',
    description: 'Chevron Left Arrow',
    usage: ['navigation', 'back', 'pagination'],
  },
  chevronRight: {
    name: 'chevronRight',
    lucideName: 'ChevronRight',
    category: 'ui',
    description: 'Chevron Right Arrow',
    usage: ['navigation', 'forward', 'pagination'],
  },
  more: {
    name: 'more',
    lucideName: 'MoreVertical',
    category: 'ui',
    description: 'More Options',
    usage: ['context_menus', 'overflow'],
  },

  // ============================================
  // NEW ICONS - Emoji Migration (2026-01-31)
  // ============================================

  // Navigation/UI Icons
  logout: {
    name: 'logout',
    lucideName: 'LogOut',
    category: 'action',
    description: 'Sign Out / Logout',
    usage: ['auth', 'profile_menu', 'sidebar'],
  },
  lock: {
    name: 'lock',
    lucideName: 'Lock',
    category: 'status',
    description: 'Locked / Security',
    usage: ['permissions', 'auth', 'passkey'],
  },
  unlock: {
    name: 'unlock',
    lucideName: 'Unlock',
    category: 'status',
    description: 'Unlocked',
    usage: ['permissions', 'auth'],
  },
  key: {
    name: 'key',
    lucideName: 'Key',
    category: 'status',
    description: 'Key / Passkey',
    usage: ['auth', 'passkey', 'security'],
  },
  globe: {
    name: 'globe',
    lucideName: 'Globe',
    category: 'navigation',
    description: 'Globe / International',
    usage: ['language_selector', 'localization'],
  },
  translate: {
    name: 'translate',
    lucideName: 'Languages',
    category: 'navigation',
    description: 'Translate / Languages',
    usage: ['translation', 'language_selector', 'subtitles'],
  },
  location: {
    name: 'location',
    lucideName: 'MapPin',
    category: 'navigation',
    description: 'Location / Map Pin',
    usage: ['geolocation', 'content_location'],
  },
  calendar: {
    name: 'calendar',
    lucideName: 'CalendarDays',
    category: 'ui',
    description: 'Calendar / Date',
    usage: ['date_picker', 'scheduling', 'events'],
  },
  notification: {
    name: 'notification',
    lucideName: 'Bell',
    category: 'ui',
    description: 'Notification / Alert Bell',
    usage: ['notifications', 'alerts'],
  },

  // Content Type Icons
  stories: {
    name: 'stories',
    lucideName: 'BookText',
    category: 'media',
    description: 'Stories / Reading Content',
    usage: ['content_category', 'kids_content'],
  },
  music: {
    name: 'music',
    lucideName: 'Music',
    category: 'media',
    description: 'Music Content',
    usage: ['content_category', 'audio'],
  },
  educational: {
    name: 'educational',
    lucideName: 'GraduationCap',
    category: 'media',
    description: 'Educational Content',
    usage: ['content_category', 'kids_content'],
  },
  cartoons: {
    name: 'cartoons',
    lucideName: 'Clapperboard',
    category: 'media',
    description: 'Cartoons / Animation',
    usage: ['content_category', 'kids_content'],
  },
  news: {
    name: 'news',
    lucideName: 'Newspaper',
    category: 'media',
    description: 'News Content',
    usage: ['content_category', 'trending'],
  },
  document: {
    name: 'document',
    lucideName: 'FileText',
    category: 'ui',
    description: 'Document / File',
    usage: ['documents', 'admin', 'billing'],
  },
  folder: {
    name: 'folder',
    lucideName: 'Folder',
    category: 'ui',
    description: 'Folder / Category',
    usage: ['file_management', 'categories'],
  },
  broadcast: {
    name: 'broadcast',
    lucideName: 'Cast',
    category: 'media',
    description: 'Broadcast / Signal',
    usage: ['live_content', 'streaming'],
  },

  // Action Icons
  trash: {
    name: 'trash',
    lucideName: 'Trash2',
    category: 'action',
    description: 'Delete / Trash',
    usage: ['crud', 'delete_action'],
  },
  record: {
    name: 'record',
    lucideName: 'Circle',
    category: 'action',
    description: 'Record',
    usage: ['recording', 'voice_input'],
  },
  stop: {
    name: 'stop',
    lucideName: 'Square',
    category: 'action',
    description: 'Stop',
    usage: ['player', 'recording'],
  },
  eye: {
    name: 'eye',
    lucideName: 'Eye',
    category: 'action',
    description: 'Visible / Show',
    usage: ['visibility', 'password_toggle'],
  },
  eyeOff: {
    name: 'eyeOff',
    lucideName: 'EyeOff',
    category: 'action',
    description: 'Hidden / Hide',
    usage: ['visibility', 'password_toggle'],
  },
  upload: {
    name: 'upload',
    lucideName: 'Upload',
    category: 'action',
    description: 'Upload',
    usage: ['file_upload', 'admin'],
  },

  // Status/Category Icons
  rainbow: {
    name: 'rainbow',
    lucideName: 'Sparkles',
    category: 'status',
    description: 'All / Everything (Kids)',
    usage: ['content_category', 'kids_content'],
  },
  baby: {
    name: 'baby',
    lucideName: 'Baby',
    category: 'media',
    description: 'Baby / Kids Section',
    usage: ['content_category', 'kids_content'],
  },
  users: {
    name: 'users',
    lucideName: 'UsersRound',
    category: 'navigation',
    description: 'Users / Group',
    usage: ['social', 'groups', 'youngsters'],
  },
  target: {
    name: 'target',
    lucideName: 'Target',
    category: 'status',
    description: 'Target / Goal',
    usage: ['categories', 'targeting'],
  },
  flame: {
    name: 'flame',
    lucideName: 'Flame',
    category: 'status',
    description: 'Trending / Hot',
    usage: ['trending', 'popular'],
  },
  gem: {
    name: 'gem',
    lucideName: 'Gem',
    category: 'status',
    description: 'Premium / Gem',
    usage: ['subscription', 'premium_content'],
  },

  // Additional Cultural/Religious Icons
  candle: {
    name: 'candle',
    lucideName: 'Flame',
    category: 'media',
    description: 'Candle / Shabbat',
    usage: ['judaism', 'shabbat'],
  },
  moon: {
    name: 'moon',
    lucideName: 'Moon',
    category: 'status',
    description: 'Moon / Night',
    usage: ['judaism', 'night_mode'],
  },
  synagogue: {
    name: 'synagogue',
    lucideName: 'Building2',
    category: 'media',
    description: 'Synagogue / Yiddish',
    usage: ['judaism', 'language_selector'],
  },

  // ============================================
  // Additional Aliases & Missing Icons (2026-01-31)
  // ============================================

  // Common aliases for easier usage
  star: {
    name: 'star',
    lucideName: 'Star',
    category: 'status',
    description: 'Star / Rating / Favorite',
    usage: ['ratings', 'favorites', 'highlights'],
  },
  alertTriangle: {
    name: 'alertTriangle',
    lucideName: 'AlertTriangle',
    category: 'status',
    description: 'Alert / Warning Triangle',
    usage: ['alerts', 'warnings', 'errors'],
  },
  plus: {
    name: 'plus',
    lucideName: 'Plus',
    category: 'action',
    description: 'Plus / Add',
    usage: ['buttons', 'toolbar', 'add_actions'],
  },
  user: {
    name: 'user',
    lucideName: 'User',
    category: 'navigation',
    description: 'User / Profile',
    usage: ['profile', 'auth', 'avatar'],
  },
  tv: {
    name: 'tv',
    lucideName: 'Tv',
    category: 'navigation',
    description: 'TV / Television',
    usage: ['live_tv', 'epg', 'channels'],
  },
  list: {
    name: 'list',
    lucideName: 'List',
    category: 'ui',
    description: 'List / Items',
    usage: ['lists', 'menus', 'navigation'],
  },
  clipboard: {
    name: 'clipboard',
    lucideName: 'Clipboard',
    category: 'ui',
    description: 'Clipboard / Copy',
    usage: ['copy', 'paste', 'playlist'],
  },
  video: {
    name: 'video',
    lucideName: 'Video',
    category: 'media',
    description: 'Video / Recording',
    usage: ['recordings', 'video_content'],
  },
  sparkles: {
    name: 'sparkles',
    lucideName: 'Sparkles',
    category: 'status',
    description: 'Sparkles / Magic / AI',
    usage: ['ai_features', 'special_content', 'premium'],
  },
  smartphone: {
    name: 'smartphone',
    lucideName: 'Smartphone',
    category: 'ui',
    description: 'Smartphone / Mobile',
    usage: ['devices', 'mobile_app', 'verification'],
  },
  creditCard: {
    name: 'creditCard',
    lucideName: 'CreditCard',
    category: 'ui',
    description: 'Credit Card / Payment',
    usage: ['billing', 'payments', 'subscription'],
  },
  mail: {
    name: 'mail',
    lucideName: 'Mail',
    category: 'ui',
    description: 'Mail / Email',
    usage: ['email', 'verification', 'support'],
  },
  heart: {
    name: 'heart',
    lucideName: 'Heart',
    category: 'action',
    description: 'Heart / Like / Love',
    usage: ['favorites', 'likes', 'reactions'],
  },
  mic: {
    name: 'mic',
    lucideName: 'Mic',
    category: 'action',
    description: 'Microphone',
    usage: ['voice', 'recording', 'audio_input'],
  },
  fingerprint: {
    name: 'fingerprint',
    lucideName: 'Fingerprint',
    category: 'status',
    description: 'Fingerprint / Biometric',
    usage: ['auth', 'security', 'biometrics'],
  },
  arrowUp: {
    name: 'arrowUp',
    lucideName: 'ArrowUp',
    category: 'navigation',
    description: 'Arrow Up',
    usage: ['navigation', 'scroll'],
  },
  arrowDown: {
    name: 'arrowDown',
    lucideName: 'ArrowDown',
    category: 'navigation',
    description: 'Arrow Down',
    usage: ['navigation', 'scroll'],
  },
  arrowLeft: {
    name: 'arrowLeft',
    lucideName: 'ArrowLeft',
    category: 'navigation',
    description: 'Arrow Left',
    usage: ['navigation'],
  },
  arrowRight: {
    name: 'arrowRight',
    lucideName: 'ArrowRight',
    category: 'navigation',
    description: 'Arrow Right',
    usage: ['navigation'],
  },
  helpCircle: {
    name: 'helpCircle',
    lucideName: 'HelpCircle',
    category: 'status',
    description: 'Help / Question',
    usage: ['help', 'tooltips', 'faq'],
  },
  messageCircle: {
    name: 'messageCircle',
    lucideName: 'MessageCircle',
    category: 'ui',
    description: 'Message / Chat',
    usage: ['chat', 'comments', 'support'],
  },
  sun: {
    name: 'sun',
    lucideName: 'Sun',
    category: 'status',
    description: 'Sun / Day / Morning',
    usage: ['theme', 'time_of_day', 'morning_ritual'],
  },
  fileText: {
    name: 'fileText',
    lucideName: 'FileText',
    category: 'ui',
    description: 'File / Document',
    usage: ['documents', 'files', 'chapters'],
  },
  shield: {
    name: 'shield',
    lucideName: 'Shield',
    category: 'status',
    description: 'Shield / Security',
    usage: ['security', 'protection', 'privacy'],
  },
  activity: {
    name: 'activity',
    lucideName: 'Activity',
    category: 'status',
    description: 'Activity / Analytics',
    usage: ['analytics', 'monitoring', 'sports'],
  },
  circle: {
    name: 'circle',
    lucideName: 'Circle',
    category: 'ui',
    description: 'Circle',
    usage: ['indicators', 'bullets', 'record'],
  },
  checkCircle: {
    name: 'checkCircle',
    lucideName: 'CheckCircle',
    category: 'status',
    description: 'Check Circle / Success',
    usage: ['success', 'completed', 'verified'],
  },
  xCircle: {
    name: 'xCircle',
    lucideName: 'XCircle',
    category: 'status',
    description: 'X Circle / Error',
    usage: ['error', 'failed', 'cancelled'],
  },
  barChart: {
    name: 'barChart',
    lucideName: 'BarChart',
    category: 'admin',
    description: 'Bar Chart / Analytics',
    usage: ['analytics', 'reports', 'dashboard'],
  },
  trendingUp: {
    name: 'trendingUp',
    lucideName: 'TrendingUp',
    category: 'status',
    description: 'Trending Up',
    usage: ['trending', 'growth', 'analytics'],
  },
  volumeHigh: {
    name: 'volumeHigh',
    lucideName: 'Volume2',
    category: 'action',
    description: 'Volume High',
    usage: ['audio', 'player'],
  },
  send: {
    name: 'send',
    lucideName: 'Send',
    category: 'action',
    description: 'Send',
    usage: ['messages', 'submit', 'email'],
  },
  refresh: {
    name: 'refresh',
    lucideName: 'RefreshCw',
    category: 'action',
    description: 'Refresh / Reload',
    usage: ['refresh', 'reload', 'sync'],
  },
  copy: {
    name: 'copy',
    lucideName: 'Copy',
    category: 'action',
    description: 'Copy',
    usage: ['copy', 'clipboard'],
  },
  monitor: {
    name: 'monitor',
    lucideName: 'Monitor',
    category: 'ui',
    description: 'Monitor / Desktop',
    usage: ['devices', 'desktop', 'display'],
  },
  bookOpen: {
    name: 'bookOpen',
    lucideName: 'BookOpen',
    category: 'media',
    description: 'Book Open / Reading',
    usage: ['books', 'reading', 'education'],
  },
  newspaper: {
    name: 'newspaper',
    lucideName: 'Newspaper',
    category: 'media',
    description: 'Newspaper / News',
    usage: ['news', 'articles'],
  },
  utensils: {
    name: 'utensils',
    lucideName: 'UtensilsCrossed',
    category: 'media',
    description: 'Utensils / Food / Dining',
    usage: ['food', 'recipes', 'shabbat'],
  },
  bread: {
    name: 'bread',
    lucideName: 'Croissant',
    category: 'media',
    description: 'Bread / Challah',
    usage: ['shabbat', 'judaism', 'food'],
  },

  // Additional missing icons found during migration
  film: {
    name: 'film',
    lucideName: 'Film',
    category: 'media',
    description: 'Film / Movie',
    usage: ['movies', 'vod', 'content'],
  },
  tag: {
    name: 'tag',
    lucideName: 'Tag',
    category: 'ui',
    description: 'Tag / Label',
    usage: ['tags', 'labels', 'categories'],
  },
  sparkle: {
    name: 'sparkle',
    lucideName: 'Sparkle',
    category: 'status',
    description: 'Sparkle / Special',
    usage: ['special', 'featured', 'ai'],
  },
  logOut: {
    name: 'logOut',
    lucideName: 'LogOut',
    category: 'action',
    description: 'Log Out / Sign Out',
    usage: ['auth', 'profile_menu'],
  },
  book: {
    name: 'book',
    lucideName: 'Book',
    category: 'media',
    description: 'Book / Reading',
    usage: ['books', 'reading', 'education'],
  },
  zap: {
    name: 'zap',
    lucideName: 'Zap',
    category: 'status',
    description: 'Zap / Lightning / Fast',
    usage: ['fast', 'instant', 'ai'],
  },
  thumbsUp: {
    name: 'thumbsUp',
    lucideName: 'ThumbsUp',
    category: 'action',
    description: 'Thumbs Up / Like',
    usage: ['feedback', 'ratings', 'reactions'],
  },
  thumbsDown: {
    name: 'thumbsDown',
    lucideName: 'ThumbsDown',
    category: 'action',
    description: 'Thumbs Down / Dislike',
    usage: ['feedback', 'ratings', 'reactions'],
  },
  smile: {
    name: 'smile',
    lucideName: 'Smile',
    category: 'status',
    description: 'Smile / Happy',
    usage: ['feedback', 'status', 'kids'],
  },
  shuffle: {
    name: 'shuffle',
    lucideName: 'Shuffle',
    category: 'action',
    description: 'Shuffle / Random',
    usage: ['player', 'playlist', 'random'],
  },
  premium: {
    name: 'premium',
    lucideName: 'Crown',
    category: 'status',
    description: 'Premium / Crown',
    usage: ['subscription', 'premium_content'],
  },
  headphones: {
    name: 'headphones',
    lucideName: 'Headphones',
    category: 'media',
    description: 'Headphones / Audio',
    usage: ['audio', 'audiobooks', 'podcasts'],
  },
  hand: {
    name: 'hand',
    lucideName: 'Hand',
    category: 'action',
    description: 'Hand / Touch',
    usage: ['interactive', 'touch', 'gesture'],
  },
  flask: {
    name: 'flask',
    lucideName: 'FlaskConical',
    category: 'admin',
    description: 'Flask / Test / Experiment',
    usage: ['testing', 'experiments', 'admin'],
  },
  cpu: {
    name: 'cpu',
    lucideName: 'Cpu',
    category: 'status',
    description: 'CPU / AI / Processing',
    usage: ['ai', 'processing', 'tech'],
  },
  briefcase: {
    name: 'briefcase',
    lucideName: 'Briefcase',
    category: 'media',
    description: 'Briefcase / Business',
    usage: ['business', 'politics', 'events', 'categories'],
  },
  award: {
    name: 'award',
    lucideName: 'Award',
    category: 'status',
    description: 'Award / Achievement',
    usage: ['awards', 'achievements', 'ceremonies'],
  },
  bell: {
    name: 'bell',
    lucideName: 'Bell',
    category: 'ui',
    description: 'Bell / Notification',
    usage: ['notifications', 'alerts', 'reminders'],
  },
  checkmark: {
    name: 'checkmark',
    lucideName: 'Check',
    category: 'status',
    description: 'Checkmark / Done',
    usage: ['validation', 'completed', 'success'],
  },
  flows: {
    name: 'flows',
    lucideName: 'Workflow',
    category: 'admin',
    description: 'Flows / Workflow',
    usage: ['workflows', 'pipelines', 'admin'],
  },
  idle: {
    name: 'idle',
    lucideName: 'CircleDot',
    category: 'status',
    description: 'Idle / Inactive',
    usage: ['status', 'connection', 'state'],
  },
  processing: {
    name: 'processing',
    lucideName: 'Loader2',
    category: 'status',
    description: 'Processing / Loading',
    usage: ['loading', 'processing', 'async'],
  },
  rocket: {
    name: 'rocket',
    lucideName: 'Rocket',
    category: 'status',
    description: 'Rocket / Launch / Fast',
    usage: ['launch', 'boost', 'premium'],
  },
  thinking: {
    name: 'thinking',
    lucideName: 'Brain',
    category: 'status',
    description: 'Thinking / AI Processing',
    usage: ['ai', 'processing', 'thinking'],
  },
  tool: {
    name: 'tool',
    lucideName: 'Wrench',
    category: 'admin',
    description: 'Tool / Settings / Config',
    usage: ['tools', 'settings', 'admin'],
  },
  waveform: {
    name: 'waveform',
    lucideName: 'AudioWaveform',
    category: 'media',
    description: 'Waveform / Audio Visualization',
    usage: ['audio', 'voice', 'sound'],
  },
  navigation: {
    name: 'navigation',
    lucideName: 'Navigation',
    category: 'navigation',
    description: 'Navigation / Direction',
    usage: ['navigation', 'directions', 'location'],
  },
  alert: {
    name: 'alert',
    lucideName: 'AlertCircle',
    category: 'status',
    description: 'Alert / Notice',
    usage: ['alerts', 'notices', 'warnings'],
  },
  ai: {
    name: 'ai',
    lucideName: 'Bot',
    category: 'status',
    description: 'AI / Bot / Artificial Intelligence',
    usage: ['ai_features', 'chatbot', 'automation'],
  },
  columns: {
    name: 'columns',
    lucideName: 'Columns2',
    category: 'ui',
    description: 'Columns / Split View',
    usage: ['split_screen', 'layout', 'subtitles'],
  },
  splitScreen: {
    name: 'splitScreen',
    lucideName: 'Columns2',
    category: 'ui',
    description: 'Split Screen / Dual Pane',
    usage: ['split_screen', 'subtitles', 'side_by_side'],
  },
  messageSquareQuote: {
    name: 'messageSquareQuote',
    lucideName: 'MessageSquareQuote',
    category: 'ui',
    description: 'Message with Quote / Comprehension / Question',
    usage: ['comprehension_quiz', 'questions', 'dialog', 'quotes'],
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

/**
 * Get icon styling (color, glass level, etc.)
 * Returns styling metadata for the icon if available
 */
export function getIconStyle(iconName: string): IconStyling | undefined {
  const icon = ICON_REGISTRY[iconName];
  return icon?.styling;
}

/**
 * Get all icons with a specific styling property
 */
export function getIconsByGlassLevel(glassLevel: GlassLevel): IconDefinition[] {
  return Object.values(ICON_REGISTRY).filter(icon => icon.styling?.glassLevel === glassLevel);
}

/**
 * Get all icons with a specific color
 */
export function getIconsByColor(color: string): IconDefinition[] {
  return Object.values(ICON_REGISTRY).filter(icon => icon.styling?.defaultColor === color);
}

export default ICON_REGISTRY;
