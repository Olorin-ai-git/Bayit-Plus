/**
 * Sidebar Component
 *
 * Navigation sidebar for the partner portal.
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../stores/uiStore';
import { isB2BFeatureEnabled, getB2BConfig } from '../../config/env';

interface NavItem {
  path: string;
  labelKey: string;
  icon: React.ReactNode;
  featureFlag?: 'enablePlayground' | 'enableBilling' | 'enableTeamManagement' | 'enableWebhooks';
}

const navItems: NavItem[] = [
  {
    path: '/',
    labelKey: 'nav.dashboard',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    path: '/usage',
    labelKey: 'nav.usage',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    path: '/billing',
    labelKey: 'nav.billing',
    featureFlag: 'enableBilling',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    path: '/api-keys',
    labelKey: 'nav.apiKeys',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
  {
    path: '/team',
    labelKey: 'nav.team',
    featureFlag: 'enableTeamManagement',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    path: '/settings',
    labelKey: 'nav.settings',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    path: '/playground',
    labelKey: 'nav.playground',
    featureFlag: 'enablePlayground',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { isSidebarCollapsed, setSidebarCollapsed } = useUIStore();

  const filteredItems = navItems.filter((item) => {
    if (!item.featureFlag) return true;
    return isB2BFeatureEnabled(item.featureFlag);
  });

  return (
    <aside
      className={`
        flex flex-col
        h-full
        bg-glass-card/50 backdrop-blur-xl
        border-r border-white/5
        transition-all duration-300
        ${isSidebarCollapsed ? 'w-20' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
        <div className="h-10 w-10 rounded-xl bg-partner-primary flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-lg">B</span>
        </div>
        {!isSidebarCollapsed && (
          <span className="text-white font-semibold text-lg truncate">Bayit Partner</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`
                    flex items-center gap-3
                    px-3 py-2.5
                    rounded-xl
                    text-sm font-medium
                    transition-all duration-200
                    ${
                      isActive
                        ? 'bg-partner-primary/20 text-partner-primary'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }
                  `}
                  title={isSidebarCollapsed ? t(item.labelKey) : undefined}
                >
                  <span className={`shrink-0 ${isActive ? 'text-partner-primary' : ''}`}>
                    {item.icon}
                  </span>
                  {!isSidebarCollapsed && <span className="truncate">{t(item.labelKey)}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Help Link */}
      <div className="px-3 py-4 border-t border-white/5">
        <a
          href={getB2BConfig().docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="
            flex items-center gap-3
            px-3 py-2.5
            rounded-xl
            text-sm font-medium text-white/60
            hover:text-white hover:bg-white/5
            transition-all duration-200
          "
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {!isSidebarCollapsed && <span>{t('nav.help')}</span>}
        </a>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
          className="
            mt-2 w-full
            flex items-center justify-center
            px-3 py-2
            rounded-xl
            text-white/40 hover:text-white/60 hover:bg-white/5
            transition-all duration-200
          "
          aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`h-5 w-5 transition-transform ${isSidebarCollapsed ? 'rotate-180 rtl:rotate-0' : 'rtl:rotate-180'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
