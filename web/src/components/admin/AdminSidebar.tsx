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
  Clock,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'

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
  { key: 'dashboard', labelKey: 'admin.nav.dashboard', icon: LayoutDashboard, route: '/admin' },
  { key: 'users', labelKey: 'admin.nav.users', icon: Users, route: '/admin/users' },
  { key: 'librarian', labelKey: 'admin.nav.librarian', icon: Bot, route: '/admin/librarian' },
  { key: 'live-quotas', labelKey: 'admin.nav.liveQuotas', icon: Clock, route: '/admin/live-quotas' },
  { key: 'campaigns', labelKey: 'admin.nav.campaigns', icon: Tag, route: '/admin/campaigns' },
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
      { key: 'translations', labelKey: 'admin.nav.translations', route: '/admin/translations' },
      { key: 'widgets', labelKey: 'admin.nav.widgets', route: '/admin/widgets' },
    ],
  },
  { key: 'recordings', labelKey: 'admin.nav.recordings', icon: Video, route: '/admin/recordings' },
  { key: 'uploads', labelKey: 'admin.nav.uploads', icon: Upload, route: '/admin/uploads' },
  { key: 'settings', labelKey: 'admin.nav.settings', icon: Settings, route: '/admin/settings' },
  { key: 'logs', labelKey: 'admin.nav.auditLogs', icon: FileText, route: '/admin/logs' },
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
  const { logout } = useAuthStore()
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

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
    const isHovered = hoveredItem === item.key

    if (hasChildren) {
      return (
        <View key={item.key}>
          <Pressable
            onPress={() => toggleExpand(item.key)}
            onHoverIn={() => setHoveredItem(item.key)}
            onHoverOut={() => setHoveredItem(null)}
            style={[
              styles.navItem,
              isRTL && styles.navItemRTL,
              isHovered && styles.navItemHovered,
            ]}
          >
            {Icon && <Icon size={18} color={colors.textSecondary} style={styles.navIcon} />}
            <Text style={[styles.navText, isRTL && styles.textRTL]}>
              {t(item.labelKey, item.key)}
            </Text>
            <View style={[styles.chevron, isExpanded && styles.chevronExpanded]}>
              <ChevronRight size={16} color={colors.textSecondary} />
            </View>
          </Pressable>
          {isExpanded && (
            <View style={[styles.childContainer, isRTL ? styles.childContainerRTL : styles.childContainerLTR]}>
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
          <Pressable
            onHoverIn={() => setHoveredItem(item.key)}
            onHoverOut={() => setHoveredItem(null)}
            style={[
              styles.navItem,
              isRTL && styles.navItemRTL,
              isChild && (isRTL ? styles.navItemChildRTL : styles.navItemChildLTR),
              isActive && styles.navItemActive,
              !isActive && hoveredItem === item.key && styles.navItemHovered,
            ]}
          >
            {Icon && (
              <Icon
                size={18}
                color={isActive ? colors.primary : colors.textSecondary}
                style={styles.navIcon}
              />
            )}
            <Text
              style={[
                styles.navText,
                isRTL && styles.textRTL,
                isActive && styles.navTextActive,
              ]}
            >
              {t(item.labelKey, item.key)}
            </Text>
          </Pressable>
        )}
      </NavLink>
    )
  }

  if (!isOpen) {
    return null
  }

  return (
    <View
      style={[
        styles.sidebar,
        isRTL ? styles.sidebarRTL : styles.sidebarLTR,
        isMobile && styles.sidebarMobile,
        isDragging && styles.sidebarDragging,
        { width: isMobile ? '85%' : width, maxWidth: isMobile ? 320 : undefined },
      ]}
    >
      {/* Drag Handle */}
      {!isMobile && onDragStart && (
        <View
          style={[styles.dragHandle, isRTL ? styles.dragHandleRTL : styles.dragHandleLTR]}
          // @ts-ignore - Web mouse events
          onMouseDown={onDragStart}
        >
          <GripVertical size={16} color={colors.textMuted} />
        </View>
      )}

      {/* Language Selector */}
      <View style={styles.languageSection}>
        <Pressable
          onPress={() => setShowLanguageMenu(!showLanguageMenu)}
          onHoverIn={() => setHoveredItem('language')}
          onHoverOut={() => setHoveredItem(null)}
          style={[
            styles.languageButton,
            isRTL && styles.languageButtonRTL,
            hoveredItem === 'language' && styles.languageButtonHovered,
          ]}
        >
          <Languages size={18} color={colors.textSecondary} />
          <Text style={styles.languageFlag}>{currentLanguage.flag}</Text>
          <Text style={[styles.languageLabel, isRTL && styles.textRTL]}>
            {currentLanguage.label}
          </Text>
          <View style={[styles.chevron, showLanguageMenu && styles.chevronExpanded]}>
            <ChevronRight size={16} color={colors.textSecondary} />
          </View>
        </Pressable>

        {showLanguageMenu && (
          <View style={styles.languageMenu}>
            {LANGUAGE_OPTIONS.map((lang) => (
              <Pressable
                key={lang.code}
                onPress={() => handleLanguageChange(lang.code)}
                onHoverIn={() => setHoveredItem(`lang-${lang.code}`)}
                onHoverOut={() => setHoveredItem(null)}
                style={[
                  styles.languageMenuItem,
                  isRTL && styles.languageMenuItemRTL,
                  lang.code === i18n.language && styles.languageMenuItemActive,
                  hoveredItem === `lang-${lang.code}` && styles.languageMenuItemHovered,
                ]}
              >
                <Text style={styles.languageFlag}>{lang.flag}</Text>
                <Text style={[styles.languageMenuLabel, isRTL && styles.textRTL]}>
                  {lang.label}
                </Text>
                {lang.code === i18n.language && (
                  <Check size={16} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Navigation */}
      <ScrollView style={styles.navContainer} contentContainerStyle={styles.navContent}>
        {NAV_ITEMS.map((item) => renderNavItem(item))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Link to="/" style={{ textDecoration: 'none' }} onClick={handleNavClick}>
          <Pressable
            onHoverIn={() => setHoveredItem('home')}
            onHoverOut={() => setHoveredItem(null)}
            style={[
              styles.footerButton,
              isRTL && styles.footerButtonRTL,
              hoveredItem === 'home' && styles.footerButtonHovered,
            ]}
          >
            <Home size={18} color={colors.textSecondary} />
            <Text style={[styles.footerText, isRTL && styles.textRTL]}>
              {t('admin.backToApp', 'Back to App')}
            </Text>
          </Pressable>
        </Link>
        <Pressable
          onPress={handleLogout}
          onHoverIn={() => setHoveredItem('logout')}
          onHoverOut={() => setHoveredItem(null)}
          style={[
            styles.footerButton,
            isRTL && styles.footerButtonRTL,
            hoveredItem === 'logout' && styles.footerButtonLogoutHovered,
          ]}
        >
          <LogOut size={18} color={colors.error} />
          <Text style={[styles.footerTextLogout, isRTL && styles.textRTL]}>
            {t('account.logout', 'Logout')}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  sidebar: {
    position: 'fixed' as any,
    top: 0,
    bottom: 0,
    zIndex: 100,
    backgroundColor: colors.glassStrong,
    // @ts-ignore - Web-specific CSS
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    display: 'flex',
    flexDirection: 'column',
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
    // @ts-ignore
    userSelect: 'none',
  },
  dragHandle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 12,
    zIndex: 102,
    justifyContent: 'center',
    alignItems: 'center',
    // @ts-ignore
    cursor: 'ew-resize',
  },
  dragHandleLTR: {
    right: 0,
  },
  dragHandleRTL: {
    left: 0,
  },
  languageSection: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  languageButtonRTL: {
    flexDirection: 'row-reverse',
  },
  languageButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  languageFlag: {
    fontSize: 18,
  },
  languageLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  languageMenu: {
    marginTop: 8,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  languageMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  languageMenuItemRTL: {
    flexDirection: 'row-reverse',
  },
  languageMenuItemActive: {
    backgroundColor: colors.glassPurpleLight,
  },
  languageMenuItemHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  languageMenuLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  navContainer: {
    flex: 1,
  },
  navContent: {
    padding: spacing.sm,
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
  },
  navItemRTL: {
    flexDirection: 'row-reverse',
  },
  navItemChildLTR: {
    marginLeft: 0,
  },
  navItemChildRTL: {
    marginRight: 0,
  },
  navItemActive: {
    backgroundColor: colors.glassPurple,
  },
  navItemHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  navIcon: {
    width: 18,
    height: 18,
  },
  navText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  navTextActive: {
    color: colors.primary,
    fontWeight: '500',
  },
  textRTL: {
    textAlign: 'right',
  },
  chevron: {
    // @ts-ignore
    transition: 'transform 0.2s ease',
  },
  chevronExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  childContainer: {
    marginTop: 4,
    gap: 2,
  },
  childContainerLTR: {
    marginLeft: 32,
  },
  childContainerRTL: {
    marginRight: 32,
  },
  footer: {
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    gap: 4,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
  },
  footerButtonRTL: {
    flexDirection: 'row-reverse',
  },
  footerButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerButtonLogoutHovered: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  footerText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerTextLogout: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
  },
})
