/**
 * Auth Layout Component
 *
 * Layout for unauthenticated pages (login).
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LanguageSelector } from "./LanguageSelector";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-glass-bg flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-partner-primary flex items-center justify-center">
            <span className="text-white font-bold text-lg">O</span>
          </div>
          <span className="text-white font-semibold text-xl">
            Olorin Partner
          </span>
        </Link>

        <LanguageSelector />
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div
            className="
              rounded-3xl border border-white/10
              bg-glass-card backdrop-blur-xl
              p-8 shadow-2xl shadow-black/30
            "
          >
            {children}
          </div>

          <p className="mt-6 text-center text-sm text-white/60">
            {t("auth.cliOnly")}
          </p>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-sm text-white/40">
        <p>
          &copy; {new Date().getFullYear()} Olorin AI.{" "}
          {t("common.allRightsReserved")}
        </p>
      </footer>
    </div>
  );
};

export default AuthLayout;
