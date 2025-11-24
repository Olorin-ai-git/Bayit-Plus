import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  const navigation = [
    { name: t('nav.home'), href: '/' },
    { name: t('nav.about'), href: '/about' },
    { name: t('nav.services'), href: '/services' },
    { name: t('nav.contact'), href: '/contact' },
  ];

  const demoLink = {
    name: t('nav.demo'),
    href: 'https://olorin-ai.web.app/investigation?demo=true',
    isExternal: true
  };

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
          <nav className="hidden md:flex space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-sm font-medium transition-colors duration-200 ${
                  isActive(item.href)
                    ? 'text-corporate-accentPrimary border-b-2 border-corporate-accentPrimary pb-1'
                    : 'text-corporate-textSecondary hover:text-corporate-accentPrimary'
                }`}
              >
                {item.name}
              </Link>
            ))}
            <a
              href={demoLink.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-corporate-textSecondary hover:text-corporate-accentPrimary transition-colors duration-200"
            >
              {demoLink.name}
            </a>
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
            className="md:hidden p-2 rounded-md text-corporate-textSecondary hover:text-corporate-accentPrimary hover:bg-corporate-hover transition-colors duration-200"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-corporate-borderPrimary/40">
            <div className="flex flex-col space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-base font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'text-corporate-accentPrimary'
                      : 'text-corporate-textSecondary hover:text-corporate-accentPrimary'
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <a
                href={demoLink.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-medium text-corporate-textSecondary hover:text-corporate-accentPrimary transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                {demoLink.name}
              </a>
              <div className="pt-2 border-t border-corporate-borderPrimary/20">
                <LanguageSelector />
              </div>
              <Link
                to="/contact"
                className="bg-corporate-accentPrimary text-white px-4 py-2 rounded-lg text-sm font-medium hover:brightness-110 transition-all duration-200 text-center"
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