import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NavItem, NavDropdownGroup } from './Header';

export interface MobileNavigationProps {
  navigation: NavItem[];
  dropdowns: NavDropdownGroup[];
  showDemo: boolean;
  ctaText: string;
  ctaHref: string;
  LanguageSelectorComponent?: React.FC;
  onClose: () => void;
}

/**
 * MobileNavigation Component
 *
 * Mobile menu navigation extracted from Header component.
 * Displays navigation items, dropdowns, demo link, language selector, and CTA.
 */
export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  navigation,
  dropdowns,
  showDemo,
  ctaText,
  ctaHref,
  LanguageSelectorComponent,
  onClose,
}) => {
  const location = useLocation();
  const { t } = useTranslation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="md:hidden py-4 border-t border-wizard-border-secondary animate-fade-in-up">
      <div className="flex flex-col space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={`px-3 py-2.5 rounded-lg text-base font-medium transition-all duration-200 ${
              isActive(item.href)
                ? 'text-wizard-accent-purple bg-wizard-accent-purple/10'
                : 'text-wizard-text-secondary hover:text-wizard-accent-purple hover:bg-white/5'
            }`}
            onClick={onClose}
          >
            {item.name}
          </Link>
        ))}

        {/* Mobile Dropdowns */}
        {dropdowns.map((dropdown) => (
          <div key={dropdown.label}>
            <div className="pt-3 pb-1 px-3">
              <span className="text-xs font-semibold text-wizard-text-muted uppercase tracking-wider">
                {dropdown.label}
              </span>
            </div>
            {dropdown.items.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2.5 rounded-lg text-base font-medium ml-2 transition-all duration-200 ${
                  isActive(item.href)
                    ? 'text-wizard-accent-purple bg-wizard-accent-purple/10'
                    : 'text-wizard-text-secondary hover:text-wizard-accent-purple hover:bg-white/5'
                }`}
                onClick={onClose}
              >
                {item.name}
              </Link>
            ))}
          </div>
        ))}

        {showDemo && (
          <Link
            to="/demo/live"
            className="px-3 py-2.5 rounded-lg text-base font-medium text-wizard-accent-purple hover:bg-wizard-accent-purple/10 transition-all duration-200"
            onClick={onClose}
          >
            {t('nav.demo', { defaultValue: 'Demo' })}
          </Link>
        )}

        {LanguageSelectorComponent && (
          <div className="pt-3 border-t border-wizard-border-secondary mt-2">
            <LanguageSelectorComponent />
          </div>
        )}

        <Link
          to={ctaHref}
          className="mt-2 wizard-button text-center"
          onClick={onClose}
        >
          {ctaText}
        </Link>
      </div>
    </div>
  );
};

export default MobileNavigation;
