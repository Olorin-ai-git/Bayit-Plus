import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthProvider';
import { GlassButton } from '@/components/glass';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Header() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <header className="safe-top safe-left safe-right border-b border-gray-800 bg-black/50 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="mb-2 pt-2">
          <LanguageSwitcher />
        </div>
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/upload" className="flex items-center">
            <span className="text-2xl font-bold">{t('common.appName')}</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/upload" className="hover:text-blue-400 transition-colors">
              {t('nav.newCV')}
            </Link>
            <Link to="/dashboard" className="hover:text-blue-400 transition-colors">
              {t('nav.dashboard')}
            </Link>
            <Link to="/pricing" className="hover:text-blue-400 transition-colors">
              {t('nav.pricing')}
            </Link>
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="hidden md:inline text-gray-400">
                  {user.email}
                </span>
                <GlassButton variant="outline" size="sm" onClick={logout}>
                  {t('common.logout')}
                </GlassButton>
              </>
            ) : (
              <GlassButton variant="primary" size="sm">
                {t('common.login')}
              </GlassButton>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
