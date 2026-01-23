import { useState } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Users,
  Tag,
  CreditCard,
  Package,
  Megaphone,
  Film,
  Settings,
  FileText,
  ChevronRight,
  LogOut,
  Home,
  GripVertical,
  Bot,
  Languages,
  Check,
  Video,
  Upload,
  Star,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'

const LANGUAGE_OPTIONS = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'he', flag: '🇮🇱', label: 'עברית' },
  { code: 'es', flag: '🇪🇸', label: 'Español' },
]

interface NavItem {
  key: string
  labelKey: string
  icon?: any
  route?: string
  children?: NavItem[]
}

const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    labelKey: 'admin.nav.dashboard',
    icon: LayoutDashboard,
    route: '/admin',
  },
  {
    key: 'users',
    labelKey: 'admin.nav.users',
    icon: Users,
    route: '/admin/users',
  },
  {
    key: 'librarian',
    labelKey: 'admin.nav.librarian',
    icon: Bot,
    route: '/admin/librarian',
  },
  {
    key: 'campaigns',
    labelKey: 'admin.nav.campaigns',
    icon: Tag,
    route: '/admin/campaigns',
  },
  {
    key: 'billing',
    labelKey: 'admin.nav.billing',
    icon: CreditCard,
    children: [
      { key: 'billing-overview', labelKey: 'admin.nav.billingOverview', route: '/admin/billing' },
      { key: 'transactions', labelKey: 'admin.nav.transactions', route: '/admin/transactions' },
      { key: 'refunds', labelKey: 'admin.nav.refunds', route: '/admin/refunds' },
    ],
  },
  {
    key: 'subscriptions',
    labelKey: 'admin.nav.subscriptions',
    icon: Package,
    children: [
      { key: 'subscriptions-list', labelKey: 'admin.nav.subscriptionsList', route: '/admin/subscriptions' },
      { key: 'plans', labelKey: 'admin.nav.plans', route: '/admin/plans' },
    ],
  },
  {
    key: 'marketing',
    labelKey: 'admin.nav.marketing',
    icon: Megaphone,
    children: [
      { key: 'marketing-dashboard', labelKey: 'admin.nav.marketingDashboard', route: '/admin/marketing' },
      { key: 'email-campaigns', labelKey: 'admin.nav.emailCampaigns', route: '/admin/emails' },
      { key: 'push-notifications', labelKey: 'admin.nav.pushNotifications', route: '/admin/push' },
    ],
  },
  {
    key: 'content',
    labelKey: 'admin.nav.content',
    icon: Film,
    children: [
      { key: 'content-library', labelKey: 'admin.nav.contentLibrary', route: '/admin/content' },
      { key: 'featured', labelKey: 'admin.nav.featured', route: '/admin/featured' },
      { key: 'categories', labelKey: 'admin.nav.categories', route: '/admin/categories' },
      { key: 'live-channels', labelKey: 'admin.nav.liveChannels', route: '/admin/live-channels' },
      { key: 'radio-stations', labelKey: 'admin.nav.radioStations', route: '/admin/radio-stations' },
      { key: 'podcasts', labelKey: 'admin.nav.podcasts', route: '/admin/podcasts' },
      { key: 'widgets', labelKey: 'admin.nav.widgets', route: '/admin/widgets' },
    ],
  },
  {
    key: 'recordings',
    labelKey: 'admin.nav.recordings',
    icon: Video,
    route: '/admin/recordings',
  },
  {
    key: 'uploads',
    labelKey: 'admin.nav.uploads',
    icon: Upload,
    route: '/admin/uploads',
  },
  {
    key: 'settings',
    labelKey: 'admin.nav.settings',
    icon: Settings,
    route: '/admin/settings',
  },
  {
    key: 'logs',
    labelKey: 'admin.nav.auditLogs',
    icon: FileText,
    route: '/admin/logs',
  },
]

interface AdminSidebarProps {
  isOpen: boolean
  width: number
  isRTL?: boolean
  isMobile?: boolean
  isDragging?: boolean
  onClose?: () => void
  onDragStart?: (e: any) => void
}

export default function AdminSidebar({
  isOpen,
  width,
  isRTL = false,
  isMobile = false,
  isDragging = false,
  onClose,
  onDragStart,
}: AdminSidebarProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [expandedItems, setExpandedItems] = useState<string[]>([]) // Collapsed by default
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)

  const toggleExpand = (key: string) => {
    setExpandedItems((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose()
    }
  }

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode)
    localStorage.setItem('bayit-language', langCode)
    setShowLanguageMenu(false)
  }

  const currentLanguage = LANGUAGE_OPTIONS.find(lang => lang.code === i18n.language) || LANGUAGE_OPTIONS[0]

  const renderNavItem = (item: NavItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.key)
    const Icon = item.icon

    // Dynamic styles for RTL and child indentation
    const navItemContainerStyle = [
      isRTL ? styles.flexRowReverse : styles.flexRow,
    ];

    const navItemContentStyle = (hovered: boolean) => [
      styles.navItemContent,
      isRTL ? styles.flexRowReverse : null,
      hovered ? styles.navItemHovered : null,
    ];

    const childIndentStyle = isChild ? (isRTL ? styles.childIndentRTL : styles.childIndentLTR) : null;

    if (hasChildren) {
      return (
        <View key={item.key}>
          <Pressable
            onPress={() => toggleExpand(item.key)}
            style={navItemContainerStyle}
          >
            {({ hovered }: any) => (
              <View
                className="flex-row items-center gap-2 px-4 py-3 rounded-lg"
                style={navItemContentStyle(hovered)}
              >
                {Icon && <Icon size={18} color={colors.textSecondary} />}
                <Text className="flex-1 text-sm" style={[{ color: colors.textSecondary }, isRTL && styles.textRight]}>
                  {t(item.labelKey, item.key)}
                </Text>
                <View
                  className={isRTL ? 'rotate-180' : ''}
                  style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }], transition: 'transform 0.3s ease' } as any}
                >
                  <ChevronRight size={16} color={colors.textSecondary} />
                </View>
              </View>
            )}
          </Pressable>
          {isExpanded && (
            <View className={`gap-1 mt-1`} style={isRTL ? styles.childIndentRTL : styles.childIndentLTR}>
              {item.children!.map((child) => renderNavItem(child, true))}
            </View>
          )}
        </View>
      )
    }

    return (
      <NavLink
        key={item.key}
        to={item.route!}
        end
        style={{ textDecoration: 'none' }}
        onClick={handleNavClick}
      >
        {({ isActive }) => (
          <View
            className="flex-row items-center gap-2 px-4 py-3 rounded-lg"
            style={[
              isRTL ? styles.flexRowReverse : null,
              childIndentStyle,
              { backgroundColor: isActive ? colors.glassPurple : 'transparent' }
            ]}
          >
            {Icon && <Icon size={18} color={isActive ? colors.primary : colors.textSecondary} />}
            <Text
              className="flex-1 text-sm"
              style={[
                { color: isActive ? colors.primary : colors.textSecondary },
                isRTL && styles.textRight
              ]}
            >
              {t(item.labelKey, item.key)}
            </Text>
          </View>
        )}
      </NavLink>
    )
  }

  if (!isOpen) {
    return null
  }

  // Dynamic styles for sidebar positioning and dragging
  const sidebarContainerStyle = [
    styles.sidebarContainer,
    isRTL ? styles.sidebarRTL : styles.sidebarLTR,
    isMobile ? styles.sidebarMobile : null,
    isDragging ? styles.sidebarDragging : null,
  ];

  const sidebarStyle = {
    width: isMobile ? '85%' : width,
    borderRadius: 0,
    transition: isDragging ? 'none' : 'width 0.3s ease',
  };

  const dragHandleStyle = [
    styles.dragHandle,
    isRTL ? styles.dragHandleRTL : styles.dragHandleLTR,
  ];

  const languageSelectorStyle = [
    isRTL ? styles.flexRowReverse : styles.flexRow,
  ];

  const languageButtonContentStyle = (hovered: boolean) => [
    styles.languageButtonContent,
    isRTL ? styles.flexRowReverse : null,
    { backgroundColor: hovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)' },
  ];

  const languageMenuItemStyle = (isSelected: boolean, hovered: boolean) => [
    styles.languageMenuItem,
    isRTL ? styles.flexRowReverse : null,
    {
      backgroundColor: isSelected ? colors.glassPurpleLight : (hovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent')
    },
  ];

  const footerLinkStyle = [
    isRTL ? styles.flexRowReverse : styles.flexRow,
  ];

  const footerButtonContentStyle = (hovered: boolean, isLogout = false) => [
    styles.footerButtonContent,
    isRTL ? styles.flexRowReverse : null,
    {
      backgroundColor: hovered
        ? (isLogout ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.05)')
        : 'transparent'
    },
  ];

  return (
    <GlassView
      className="fixed top-0 bottom-0 border-r-0 z-100"
      style={[sidebarContainerStyle, sidebarStyle] as any}
      intensity="high"
      noBorder
    >
      {/* Drag Handle */}
      {!isMobile && onDragStart && (
        <View
          className="absolute top-0 bottom-0 w-3 justify-center items-center z-102 bg-transparent"
          style={[dragHandleStyle, { cursor: 'ew-resize' }] as any}
          // @ts-ignore - Web mouse events
          onMouseDown={onDragStart}
        >
          <GripVertical size={16} color={colors.textMuted} />
        </View>
      )}

      {/* Language Selector */}
      <View className="p-4 border-b border-b-white/5">
        <Pressable
          onPress={() => setShowLanguageMenu(!showLanguageMenu)}
          style={languageSelectorStyle}
        >
          {({ hovered }: any) => (
            <View
              className="flex-row items-center gap-2 px-4 py-2 rounded-lg"
              style={languageButtonContentStyle(hovered)}
            >
              <Languages size={18} color={colors.textSecondary} />
              <Text className="text-lg">{currentLanguage.flag}</Text>
              <Text className="flex-1 text-sm font-medium" style={[{ color: colors.text }, isRTL && styles.textRight]}>
                {currentLanguage.label}
              </Text>
              <View
                className={isRTL ? 'rotate-180' : ''}
                style={{ transform: [{ rotate: showLanguageMenu ? '90deg' : '0deg' }], transition: 'transform 0.3s ease' } as any}
              >
                <ChevronRight size={16} color={colors.textSecondary} />
              </View>
            </View>
          )}
        </Pressable>

        {showLanguageMenu && (
          <View className="mt-2 rounded-lg overflow-hidden border border-white/10" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
            {LANGUAGE_OPTIONS.map((lang) => (
              <Pressable
                key={lang.code}
                onPress={() => handleLanguageChange(lang.code)}
                className="border-b border-b-white/5"
                style={isRTL ? styles.flexRowReverse : styles.flexRow}
              >
                {({ hovered }: any) => (
                  <View
                    className="flex-row items-center gap-2 px-4 py-3"
                    style={languageMenuItemStyle(lang.code === i18n.language, hovered)}
                  >
                    <Text className="text-lg">{lang.flag}</Text>
                    <Text className="flex-1 text-sm" style={[{ color: colors.text }, isRTL && styles.textRight]}>
                      {lang.label}
                    </Text>
                    {lang.code === i18n.language && (
                      <Check size={16} color={colors.primary} />
                    )}
                  </View>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Navigation */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: spacing.sm, gap: spacing.xs }}>
        {NAV_ITEMS.map((item) => renderNavItem(item))}
      </ScrollView>

      {/* Footer */}
      <View className="p-2 border-t border-t-white/5 gap-1">
        <Link to="/" style={{ textDecoration: 'none' }} onClick={handleNavClick}>
          <Pressable style={footerLinkStyle}>
            {({ hovered }: any) => (
              <View
                className="flex-row items-center gap-2 px-4 py-3 rounded-lg"
                style={footerButtonContentStyle(hovered)}
              >
                <Home size={18} color={colors.textSecondary} />
                <Text className="text-sm" style={[{ color: colors.textSecondary }, isRTL && styles.textRight]}>
                  {t('admin.backToApp', 'Back to App')}
                </Text>
              </View>
            )}
          </Pressable>
        </Link>
        <Pressable
          onPress={handleLogout}
          style={footerLinkStyle}
        >
          {({ hovered }: any) => (
            <View
              className="flex-row items-center gap-2 px-4 py-3 rounded-lg"
              style={footerButtonContentStyle(hovered, true)}
            >
              <LogOut size={18} color={colors.error} />
              <Text className="text-sm" style={[{ color: colors.error }, isRTL && styles.textRight]}>
                {t('account.logout', 'Logout')}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </GlassView>
  )
}

const styles = StyleSheet.create({
  sidebarContainer: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    zIndex: 100,
  },
  sidebarLTR: {
    left: 0,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
  },
  sidebarRTL: {
    right: 0,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },
  sidebarMobile: {
    maxWidth: 320,
  },
  sidebarDragging: {
    userSelect: 'none',
  } as any,
  dragHandle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 12,
    zIndex: 102,
    backgroundColor: 'transparent',
  },
  dragHandleLTR: {
    right: 0,
  },
  dragHandleRTL: {
    left: 0,
  },
  flexRow: {
    flexDirection: 'row',
  },
  flexRowReverse: {
    flexDirection: 'row-reverse',
  },
  navItemContent: {
    flexDirection: 'row',
  },
  navItemHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  childIndentLTR: {
    marginLeft: 32,
  },
  childIndentRTL: {
    marginRight: 32,
  },
  languageButtonContent: {
    flexDirection: 'row',
  },
  languageMenuItem: {
    flexDirection: 'row',
  },
  footerButtonContent: {
    flexDirection: 'row',
  },
  textRight: {
    textAlign: 'right',
  },
});
