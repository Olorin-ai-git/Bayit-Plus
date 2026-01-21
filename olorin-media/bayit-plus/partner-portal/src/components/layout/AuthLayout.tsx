/**
 * Auth Layout Component
 *
 * Layout for unauthenticated pages (login, register).
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { LanguageSelector } from './LanguageSelector';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-glass-bg flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-partner-primary flex items-center justify-center">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <span className="text-white font-semibold text-xl">Bayit Partner</span>
        </Link>

        <LanguageSelector />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Glass Card */}
          <div
            className="
              rounded-3xl border border-white/10
              bg-glass-card backdrop-blur-xl
              p-8 shadow-2xl shadow-black/30
            "
          >
            {children}
          </div>

          {/* Footer Link */}
          <p className="mt-6 text-center text-sm text-white/60">
            {isLogin ? (
              <>
                {t('auth.noAccount')}{' '}
                <Link
                  to="/register"
                  className="text-partner-primary hover:text-partner-primary/80 font-medium transition-colors"
                >
                  {t('auth.register')}
                </Link>
              </>
            ) : (
              <>
                {t('auth.hasAccount')}{' '}
                <Link
                  to="/login"
                  className="text-partner-primary hover:text-partner-primary/80 font-medium transition-colors"
                >
                  {t('auth.login')}
                </Link>
              </>
            )}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-sm text-white/40">
        <p>&copy; {new Date().getFullYear()} Bayit Plus. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default AuthLayout;
