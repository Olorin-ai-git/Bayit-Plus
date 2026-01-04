import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';
import NavDropdown from './NavDropdown';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  const navigation = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.about'), href: '/about' },
    { name: t('nav.services'), href: '/services' },
  ];

  const solutions = [
    { name: 'AI Agents', href: '/agents', description: 'Explore our 6 specialized agents' },
    { name: 'ROI Calculator', href: '/roi', description: 'Calculate your potential savings' },
    { name: 'Compare', href: '/compare', description: 'See how we stack up' },
  ];

  const resources = [
    { name: 'Use Cases', href: '/use-cases', description: 'Industry-specific solutions' },
    { name: 'Contact', href: '/contact', description: 'Get in touch with us' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="glass-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <img
              src={`${process.env.PUBLIC_URL}/assets/images/Olorin-Logo-Wizard-Only-transparent.png`}
              alt="Olorin.ai Wizard Logo"
              className="h-10 w-auto"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `${process.env.PUBLIC_URL}/logo.png`;
              }}
            />
            <span className="text-2xl font-bold text-corporate-textPrimary">
              Olorin<span className="text-corporate-accentPrimary">.ai</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive(item.href)
                    ? 'text-corporate-accentPrimary bg-corporate-accentPrimary/10'
                    : 'text-corporate-textSecondary hover:text-corporate-accentPrimary hover:bg-white/5'
                }`}
              >
                {item.name}
              </Link>
            ))}

            <NavDropdown label="Solutions" items={solutions} />
            <NavDropdown label="Resources" items={resources} />

            {/* Demo Link */}
            <Link
              to="/demo/live"
              className="px-3 py-2 rounded-lg text-sm font-medium text-corporate-accentPrimary hover:bg-corporate-accentPrimary/10 transition-all duration-200"
            >
              {t('nav.demo')}
            </Link>
          </nav>

          {/* CTA Button */}
          <div className="hidden md:flex items-center space-x-4">
            <LanguageSelector />
            <Link
              to="/contact"
              className="bg-corporate-accentPrimary text-white px-4 py-2 rounded-lg text-sm font-medium hover:brightness-110 transition-all duration-200"
            >
              {t('nav.getStarted')}
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 rounded-lg text-corporate-textSecondary hover:text-corporate-accentPrimary hover:bg-white/5 transition-all duration-200"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10 animate-dropdown-in">
            <div className="flex flex-col space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2.5 rounded-lg text-base font-medium transition-all duration-200 ${
                    isActive(item.href)
                      ? 'text-corporate-accentPrimary bg-corporate-accentPrimary/10'
                      : 'text-corporate-textSecondary hover:text-corporate-accentPrimary hover:bg-white/5'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              {/* Solutions Section */}
              <div className="pt-3 pb-1 px-3">
                <span className="text-xs font-semibold text-corporate-textMuted uppercase tracking-wider">
                  Solutions
                </span>
              </div>
              {solutions.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2.5 rounded-lg text-base font-medium ml-2 transition-all duration-200 ${
                    isActive(item.href)
                      ? 'text-corporate-accentPrimary bg-corporate-accentPrimary/10'
                      : 'text-corporate-textSecondary hover:text-corporate-accentPrimary hover:bg-white/5'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              {/* Resources Section */}
              <div className="pt-3 pb-1 px-3">
                <span className="text-xs font-semibold text-corporate-textMuted uppercase tracking-wider">
                  Resources
                </span>
              </div>
              {resources.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`px-3 py-2.5 rounded-lg text-base font-medium ml-2 transition-all duration-200 ${
                    isActive(item.href)
                      ? 'text-corporate-accentPrimary bg-corporate-accentPrimary/10'
                      : 'text-corporate-textSecondary hover:text-corporate-accentPrimary hover:bg-white/5'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              <Link
                to="/demo/live"
                className="px-3 py-2.5 rounded-lg text-base font-medium text-corporate-accentPrimary hover:bg-corporate-accentPrimary/10 transition-all duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.demo')}
              </Link>

              <div className="pt-3 border-t border-white/10 mt-2">
                <LanguageSelector />
              </div>

              <Link
                to="/contact"
                className="mt-2 bg-corporate-accentPrimary text-white px-4 py-3 rounded-lg text-sm font-medium hover:brightness-110 transition-all duration-200 text-center"
                onClick={() => setIsMenuOpen(false)}
              >
                {t('nav.getStarted')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
