import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { WizardLogo } from '../branding/WizardLogo';
import { PortalDomain } from '../../types/branding.types';
import { MobileNavigation } from './MobileNavigation';

export interface NavItem {
  name: string;
  href: string;
  description?: string;
}

export interface NavDropdownGroup {
  label: string;
  items: NavItem[];
}

export interface HeaderProps {
  domain?: PortalDomain;
  navigation?: NavItem[];
  dropdowns?: NavDropdownGroup[];
  showDemo?: boolean;
  ctaText?: string;
  ctaHref?: string;
  LanguageSelectorComponent?: React.FC;
}

/**
 * Header Component
 *
 * Shared glassmorphic header with wizard theme.
 * Supports domain-specific branding and customizable navigation.
 *
 * @example
 * <Header
 *   domain="fraud"
 *   navigation={[
 *     { name: 'Home', href: '/' },
 *     { name: 'About', href: '/about' }
 *   ]}
 *   dropdowns={[
 *     {
 *       label: 'Solutions',
 *       items: [{ name: 'AI Agents', href: '/agents', description: 'Explore agents' }]
 *     }
 *   ]}
 * />
 */
export const Header: React.FC<HeaderProps> = ({
  domain = 'main',
  navigation = [],
  dropdowns = [],
  showDemo = true,
  ctaText,
  ctaHref = '/contact',
  LanguageSelectorComponent,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (path: string) => location.pathname === path;

  const defaultCtaText = ctaText || String(t('nav.getStarted', { defaultValue: 'Get Started' }));

  return (
    <header className="glass-header-wizard">
      <div className="wizard-container">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="hover-scale">
            <WizardLogo variant={domain} size="md" showText />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(item.href)
                    ? 'text-wizard-accent-purple bg-wizard-accent-purple/10'
                    : 'text-wizard-text-secondary hover:text-wizard-accent-purple hover:bg-white/5'
                }`}
              >
                {item.name}
              </Link>
            ))}

            {/* Dropdowns */}
            {dropdowns.map((dropdown) => (
              <div
                key={dropdown.label}
                className="relative group"
              >
                <button
                  className="px-3 py-2 rounded-lg text-sm font-medium text-wizard-text-secondary hover:text-wizard-accent-purple hover:bg-white/5 transition-all duration-200"
                >
                  {dropdown.label}
                  <svg
                    className="inline-block ml-1 w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu - shows on group hover */}
                <div className="absolute top-full left-0 pt-2 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="glass-card-wizard p-2 shadow-glass-lg animate-fade-in-up">
                    {dropdown.items.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="block px-3 py-2 rounded-lg text-sm font-medium text-wizard-text-secondary hover:text-wizard-accent-purple hover:bg-white/5 transition-all duration-200"
                      >
                        <div className="font-semibold">{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-wizard-text-muted">{item.description}</div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Demo Link */}
            {showDemo && (
              <Link
                to="/demo/live"
                className="px-3 py-2 rounded-lg text-sm font-medium text-wizard-accent-purple hover:bg-wizard-accent-purple/10 transition-all duration-200"
              >
                {t('nav.demo', { defaultValue: 'Demo' })}
              </Link>
            )}
          </nav>

          {/* CTA Button & Language Selector */}
          <div className="hidden md:flex items-center space-x-4">
            {LanguageSelectorComponent && <LanguageSelectorComponent />}
            <Link
              to={ctaHref}
              className="wizard-button"
            >
              {defaultCtaText}
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-wizard-text-secondary hover:text-wizard-accent-purple hover:bg-white/5 transition-all duration-200"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <MobileNavigation
            navigation={navigation}
            dropdowns={dropdowns}
            showDemo={showDemo}
            ctaText={defaultCtaText}
            ctaHref={ctaHref}
            LanguageSelectorComponent={LanguageSelectorComponent}
            onClose={() => setIsMenuOpen(false)}
          />
        )}
      </div>
    </header>
  );
};

export default Header;
