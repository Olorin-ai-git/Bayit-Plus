import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Users,
  Tag,
  CreditCard,
  Package,
  Megaphone,
  Settings,
  FileText,
  ChevronDown,
  ChevronLeft,
  LogOut,
  Home,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

const NAV_ITEMS = [
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
      { key: 'email-campaigns', labelKey: 'admin.nav.emailCampaigns', route: '/admin/emails' },
      { key: 'push-notifications', labelKey: 'admin.nav.pushNotifications', route: '/admin/push' },
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

export default function AdminSidebar() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [expandedItems, setExpandedItems] = useState(['billing', 'subscriptions', 'marketing'])

  const toggleExpand = (key) => {
    setExpandedItems((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const renderNavItem = (item, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0
    const isExpanded = expandedItems.includes(item.key)
    const Icon = item.icon

    if (hasChildren) {
      return (
        <div key={item.key}>
          <button
            onClick={() => toggleExpand(item.key)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors text-dark-300 hover:text-white hover:bg-white/5`}
          >
            {Icon && <Icon size={18} />}
            <span className="flex-1 text-right">{t(item.labelKey, item.key)}</span>
            <ChevronDown
              size={16}
              className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
          {isExpanded && (
            <div className="mr-6 mt-1 space-y-1">
              {item.children.map((child) => renderNavItem(child, true))}
            </div>
          )}
        </div>
      )
    }

    return (
      <NavLink
        key={item.key}
        to={item.route}
        end={item.route === '/admin'}
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
            isActive
              ? 'bg-primary-500/20 text-primary-400'
              : 'text-dark-300 hover:text-white hover:bg-white/5'
          } ${isChild ? 'pr-8' : ''}`
        }
      >
        {Icon && <Icon size={18} />}
        <span>{t(item.labelKey, item.key)}</span>
      </NavLink>
    )
  }

  return (
    <div className="w-64 h-screen glass-strong border-l border-white/5 flex flex-col">
      {/* Brand */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center">
            <span className="text-lg">🏠</span>
          </div>
          <div>
            <h2 className="font-bold text-gradient">Bayit+ Admin</h2>
            <span className="text-xs text-dark-400">ניהול מערכת</span>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary-500 flex items-center justify-center">
            <span className="font-semibold">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{user?.name || 'Admin'}</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary-500/20 text-secondary-400">
              {user?.role || 'Admin'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {NAV_ITEMS.map((item) => renderNavItem(item))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-white/5 space-y-1">
        <Link
          to="/"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-dark-300 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Home size={18} />
          <span>חזרה לאפליקציה</span>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={18} />
          <span>התנתקות</span>
        </button>
      </div>
    </div>
  )
}
