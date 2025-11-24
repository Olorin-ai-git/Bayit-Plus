/**
 * Navigation Header Component
 *
 * Main navigation header with logo, service links, and status badges.
 * Extracted from App.tsx to maintain < 200 line limit.
 */

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { serviceLinks } from '../constants/serviceData';

const NavigationHeader: React.FC = () => {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="bg-black/50 backdrop-blur-lg border-b border-corporate-borderPrimary sticky top-0 z-50">
      <div className="max-w-full mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-24 gap-8">
          {/* Logo Section */}
          <div className="flex-shrink-0">
            <Link to="/" className="flex items-center group hover:opacity-80 transition-opacity duration-200">
              <img
                src="/assets/images/Olorin-Logo-With-Text-transparent.png"
                alt="Olorin Logo"
                className="h-12 w-auto"
              />
            </Link>
          </div>

          {/* Center: Navigation Links - Desktop */}
          {!isHomePage && (
            <nav className="hidden lg:flex items-center justify-center flex-1 gap-4">
              {serviceLinks.filter(service => service.name !== 'Status').map((service) => {
                const isActive = location.pathname.startsWith(service.path);
                return (
                  <Link
                    key={service.name}
                    to={service.path}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 border h-10 ${
                      isActive
                        ? `bg-corporate-accentPrimary text-white border-corporate-accentPrimary shadow-lg shadow-corporate-accentPrimary/20`
                        : 'text-corporate-textSecondary border-2 border-corporate-borderPrimary/40/50 hover:text-corporate-accentSecondary hover:border-corporate-accentSecondary bg-black/20 hover:bg-black/30'
                    }`}
                  >
                    <span className="text-base">{service.icon}</span>
                    <span>{service.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Right Section - Status & Controls */}
          <div className="flex-shrink-0 flex items-center gap-4">
            {/* Status Badges - Desktop */}
            <div className="hidden xl:flex items-center gap-2 border-r border-corporate-borderPrimary/30 pr-4">
              {/* System Live Badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-corporate-success/10 border border-corporate-success/40 h-10 whitespace-nowrap hover:border-corporate-success transition-all duration-200">
                <div className="w-2.5 h-2.5 bg-corporate-success rounded-full animate-pulse flex-shrink-0"></div>
                <span className="text-xs font-semibold text-corporate-success">Live</span>
              </div>

              {/* Version Badge */}
              <div className="px-3 py-2 rounded-lg bg-corporate-accentPrimary/10 border border-corporate-accentPrimary/40 h-10 flex items-center whitespace-nowrap hover:border-corporate-accentPrimary transition-all duration-200">
                <span className="text-xs font-semibold text-corporate-accentSecondary">v1.0.0</span>
              </div>

              {/* AI Ready Badge */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-corporate-accentSecondary/10 border border-corporate-accentSecondary/40 h-10 whitespace-nowrap hover:border-corporate-accentSecondary transition-all duration-200">
                <svg className="w-4 h-4 text-corporate-accentSecondary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-semibold text-corporate-accentSecondary">Ready</span>
              </div>
            </div>

            {/* Event Bus Status - Desktop */}
            <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-corporate-success/5 border border-corporate-success/30 h-10 whitespace-nowrap">
              <div className="w-2 h-2 bg-corporate-success rounded-full animate-pulse flex-shrink-0"></div>
              <span className="text-xs font-medium text-corporate-textTertiary">Event Bus</span>
              <span className="text-xs text-corporate-textTertiary opacity-50">•</span>
              <span className="text-xs text-corporate-textTertiary">{process.env.NODE_ENV}</span>
            </div>

            {/* Settings Button */}
            <button
              className="p-2.5 text-corporate-textSecondary hover:text-corporate-accentSecondary rounded-lg hover:bg-black/30 transition-all duration-200 border border-transparent hover:border-corporate-borderPrimary h-10 w-10 flex items-center justify-center flex-shrink-0"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </button>

            {/* Mobile Menu Toggle */}
            {!isHomePage && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2.5 text-corporate-textSecondary hover:text-corporate-accentSecondary rounded-lg hover:bg-black/30 transition-all duration-200 border border-transparent hover:border-corporate-borderPrimary h-10 w-10 flex items-center justify-center flex-shrink-0"
                aria-label="Toggle mobile menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {!isHomePage && isMobileMenuOpen && (
          <div className="lg:hidden border-t border-corporate-borderPrimary/30 bg-black/30 backdrop-blur">
            <div className="px-6 py-3">
              <div className="grid grid-cols-1 gap-3">
                {serviceLinks.filter(service => service.name !== 'Status').map((service) => {
                  const isActive = location.pathname.startsWith(service.path);
                  return (
                    <Link
                      key={service.name}
                      to={service.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 border ${
                        isActive
                          ? `bg-corporate-accentPrimary text-white border-corporate-accentPrimary shadow-lg shadow-corporate-accentPrimary/20`
                          : 'text-corporate-textSecondary border-corporate-borderPrimary/50 hover:text-corporate-accentSecondary hover:border-corporate-accentSecondary bg-black/30 hover:bg-black/50'
                      }`}
                    >
                      <span className="text-lg flex-shrink-0">{service.icon}</span>
                      <div className="flex-1">
                        <div>{service.name}</div>
                        <div className="text-xs opacity-60">{service.description}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default NavigationHeader;
