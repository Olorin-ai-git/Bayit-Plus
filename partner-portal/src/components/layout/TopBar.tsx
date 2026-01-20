/**
 * TopBar Component
 *
 * Header bar with user menu and global actions.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useB2BAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { LanguageSelector } from './LanguageSelector';

export const TopBar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, organization, logout } = useB2BAuthStore();
  const { toggleSidebar, isSidebarOpen } = useUIStore();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-glass-card/30 backdrop-blur-xl">
      {/* Left Side */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Toggle */}
        <button
          onClick={toggleSidebar}
          className="
            lg:hidden
            flex items-center justify-center
            h-10 w-10
            rounded-xl
            text-white/60 hover:text-white hover:bg-white/10
            transition-all duration-200
          "
          aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Organization Name */}
        {organization && (
          <div className="hidden sm:block">
            <p className="text-sm text-white/40">Organization</p>
            <p className="text-white font-medium">{organization.name}</p>
          </div>
        )}
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Language Selector */}
        <LanguageSelector />

        {/* Notifications (placeholder) */}
        <button
          className="
            flex items-center justify-center
            h-10 w-10
            rounded-xl
            text-white/60 hover:text-white hover:bg-white/10
            transition-all duration-200
            relative
          "
          aria-label="Notifications"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {/* Notification Badge */}
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-partner-primary" />
        </button>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="
              flex items-center gap-3
              px-3 py-2
              rounded-xl
              hover:bg-white/5
              transition-all duration-200
            "
            aria-expanded={isUserMenuOpen}
            aria-haspopup="menu"
          >
            {/* Avatar */}
            <div className="h-9 w-9 rounded-full bg-partner-primary/20 flex items-center justify-center">
              <span className="text-partner-primary font-semibold text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>

            {/* User Info */}
            <div className="hidden md:block text-left rtl:text-right">
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-white/50">{user?.role}</p>
            </div>

            {/* Dropdown Arrow */}
            <svg
              className={`h-4 w-4 text-white/50 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <div
              className="
                absolute right-0 rtl:right-auto rtl:left-0 mt-2
                w-56
                rounded-xl border border-white/10
                bg-glass-card backdrop-blur-xl
                py-1
                shadow-xl shadow-black/30
                z-50
              "
              role="menu"
            >
              {/* User Info Header */}
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-white/50">{user?.email}</p>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="
                    w-full flex items-center gap-3 px-4 py-2.5
                    text-left rtl:text-right
                    text-sm text-white/80
                    hover:bg-white/10
                    transition-colors
                  "
                  role="menuitem"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t('nav.settings')}
                </button>
              </div>

              {/* Logout */}
              <div className="border-t border-white/10 py-1">
                <button
                  onClick={handleLogout}
                  className="
                    w-full flex items-center gap-3 px-4 py-2.5
                    text-left rtl:text-right
                    text-sm text-red-400
                    hover:bg-red-500/10
                    transition-colors
                  "
                  role="menuitem"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {t('auth.logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
