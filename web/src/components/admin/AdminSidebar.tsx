import { useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
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
  ChevronDown,
  LogOut,
  Home,
  GripVertical,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { colors, spacing, borderRadius } from '@bayit/shared/theme'
import { GlassView } from '@bayit/shared/ui'

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
      { key: 'content-import', labelKey: 'admin.nav.contentImport', route: '/admin/content/import' },
      { key: 'categories', labelKey: 'admin.nav.categories', route: '/admin/categories' },
      { key: 'live-channels', labelKey: 'admin.nav.liveChannels', route: '/admin/live-channels' },
      { key: 'radio-stations', labelKey: 'admin.nav.radioStations', route: '/admin/radio-stations' },
      { key: 'podcasts', labelKey: 'admin.nav.podcasts', route: '/admin/podcasts' },
      { key: 'widgets', labelKey: 'admin.nav.widgets', route: '/admin/widgets' },
    ],
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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [expandedItems, setExpandedItems] = useState(['billing', 'subscriptions', 'marketing', 'content'])

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

  const renderNavItem = (item: NavItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.key)
    const Icon = item.icon

    if (hasChildren) {
      return (
        <View key={item.key}>
          <Pressable
            onPress={() => toggleExpand(item.key)}
            style={({ hovered }: any) => [
              styles.navButton,
              isRTL && styles.navButtonRTL,
              hovered && styles.navButtonHovered,
            ]}
          >
            {Icon && <Icon size={18} color={colors.textSecondary} />}
            <Text style={[styles.navText, isRTL && styles.navTextRTL]}>{t(item.labelKey, item.key)}</Text>
            <View style={[styles.chevron, isExpanded && styles.chevronExpanded]}>
              <ChevronDown size={16} color={colors.textSecondary} />
            </View>
          </Pressable>
          {isExpanded && (
            <View style={[styles.childrenContainer, isRTL && styles.childrenContainerRTL]}>
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
        end={item.route === '/admin'}
        style={{ textDecoration: 'none' }}
        onClick={handleNavClick}
      >
        {({ isActive }) => (
          <View style={[
            styles.navButton,
            isRTL && styles.navButtonRTL,
            isActive && styles.navButtonActive,
            isChild && styles.navButtonChild,
          ]}>
            {Icon && <Icon size={18} color={isActive ? colors.primary : colors.textSecondary} />}
            <Text style={[styles.navText, isRTL && styles.navTextRTL, isActive && styles.navTextActive]}>
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

  return (
    <GlassView
      style={[
        styles.container,
        { width },
        isRTL && styles.containerRTL,
        isMobile && styles.containerMobile,
        isDragging && styles.containerDragging,
      ]}
      intensity="high"
      noBorder
    >
      {/* Drag Handle */}
      {!isMobile && onDragStart && (
        <View
          style={[styles.dragHandle, isRTL && styles.dragHandleRTL]}
          // @ts-ignore - Web mouse events
          onMouseDown={onDragStart}
        >
          <GripVertical size={16} color={colors.textMuted} />
        </View>
      )}

      {/* Brand */}
      <View style={styles.brandSection}>
        <View style={[styles.brandContent, isRTL && styles.brandContentRTL]}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandEmoji}>🏠</Text>
          </View>
          <View>
            <Text style={[styles.brandTitle, isRTL && styles.textRTL]}>
              {t('admin.brand.title', 'Bayit+ Admin')}
            </Text>
            <Text style={[styles.brandSubtitle, isRTL && styles.textRTL]}>
              {t('admin.brand.subtitle', 'System Management')}
            </Text>
          </View>
        </View>
      </View>

      {/* User Info */}
      <View style={styles.userSection}>
        <View style={[styles.userContent, isRTL && styles.userContentRTL]}>
          <View style={styles.userAvatar}>
            <Text style={styles.userInitial}>
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, isRTL && styles.textRTL]} numberOfLines={1}>
              {user?.name || 'Admin'}
            </Text>
            <View style={[styles.roleBadge, isRTL && styles.roleBadgeRTL]}>
              <Text style={styles.roleText}>{user?.role || 'Admin'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Navigation */}
      <ScrollView style={styles.nav} contentContainerStyle={styles.navContent}>
        {NAV_ITEMS.map((item) => renderNavItem(item))}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Link to="/" style={{ textDecoration: 'none' }} onClick={handleNavClick}>
          <Pressable style={({ hovered }: any) => [
            styles.footerButton,
            isRTL && styles.footerButtonRTL,
            hovered && styles.footerButtonHovered,
          ]}>
            <Home size={18} color={colors.textSecondary} />
            <Text style={[styles.footerText, isRTL && styles.textRTL]}>
              {t('admin.backToApp', 'Back to App')}
            </Text>
          </Pressable>
        </Link>
        <Pressable
          onPress={handleLogout}
          style={({ hovered }: any) => [
            styles.footerButton,
            isRTL && styles.footerButtonRTL,
            styles.logoutButton,
            hovered && styles.logoutButtonHovered,
          ]}
        >
          <LogOut size={18} color={colors.error} />
          <Text style={[styles.logoutText, isRTL && styles.textRTL]}>
            {t('account.logout', 'Logout')}
          </Text>
        </Pressable>
      </View>
    </GlassView>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    bottom: 0,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 0,
    zIndex: 100,
    transition: 'width 0.3s ease' as any,
  },
  containerRTL: {
    left: 'auto' as any,
    right: 0,
    borderRightWidth: 0,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
  },
  containerMobile: {
    width: '85%',
    maxWidth: 320,
  },
  containerDragging: {
    transition: 'none' as any,
    userSelect: 'none' as any,
  },
  dragHandle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 12,
    justifyContent: 'center',
    alignItems: 'center',
    cursor: 'ew-resize' as any,
    zIndex: 102,
    backgroundColor: 'transparent',
  },
  dragHandleRTL: {
    right: 'auto' as any,
    left: 0,
  },
  brandSection: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  brandContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandContentRTL: {
    flexDirection: 'row-reverse',
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandEmoji: {
    fontSize: 18,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  brandSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  userSection: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userContentRTL: {
    flexDirection: 'row-reverse',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(138, 43, 226, 0.2)',
  },
  roleBadgeRTL: {
    alignSelf: 'flex-end',
  },
  roleText: {
    fontSize: 11,
    color: colors.secondary,
  },
  nav: {
    flex: 1,
  },
  navContent: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  navButtonRTL: {
    flexDirection: 'row-reverse',
  },
  navButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  navButtonActive: {
    backgroundColor: 'rgba(0, 217, 255, 0.2)',
  },
  navButtonChild: {
    paddingRight: spacing.xl,
  },
  navText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  navTextRTL: {
    textAlign: 'right',
  },
  navTextActive: {
    color: colors.primary,
  },
  chevron: {
    transform: [{ rotate: '0deg' }],
  },
  chevronExpanded: {
    transform: [{ rotate: '180deg' }],
  },
  childrenContainer: {
    marginLeft: spacing.lg,
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  childrenContainerRTL: {
    marginLeft: 0,
    marginRight: spacing.lg,
  },
  footer: {
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    gap: spacing.xs,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  footerButtonRTL: {
    flexDirection: 'row-reverse',
  },
  footerButtonHovered: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  logoutButton: {},
  logoutButtonHovered: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  logoutText: {
    fontSize: 14,
    color: colors.error,
  },
  textRTL: {
    textAlign: 'right',
  },
})
