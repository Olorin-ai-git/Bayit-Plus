/**
 * Login Page
 *
 * API-key based authentication for partner portal.
 */

import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { GlassButton, GlassCard } from "@olorin/glass-ui/web";
import { useAuthStore } from "../stores/authStore";
import { AuthLayout } from "../components/layout/AuthLayout";

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading, error, clearError } =
    useAuthStore();

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await login(apiKey);
  };

  return (
    <AuthLayout>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-white">
          {t("auth.welcomeBack")}
        </h1>
        <p className="mt-2 text-sm text-white/60">
          {t("auth.connectToPortal")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* API Key Field */}
        <div>
          <label
            htmlFor="apiKey"
            className="block text-sm font-medium text-white/80 mb-2"
          >
            {t("auth.apiKey")}
          </label>
          <div className="relative">
            <input
              id="apiKey"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              autoComplete="off"
              className="
                w-full px-4 py-3
                rounded-xl
                bg-white/5 border border-white/10
                text-white placeholder-white/40 font-mono
                focus:outline-none focus:border-partner-primary focus:ring-1 focus:ring-partner-primary
                transition-all duration-200
              "
              placeholder={t("auth.apiKeyPlaceholder")}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="
                absolute right-3 top-1/2 -translate-y-1/2
                text-white/40 hover:text-white/60
                transition-colors
              "
              aria-label={showKey ? t("auth.hideApiKey") : t("auth.showApiKey")}
            >
              {showKey ? (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <GlassButton
          type="submit"
          disabled={isLoading || !apiKey.trim()}
          loading={isLoading}
          size="lg"
          className="w-full"
        >
          {t("auth.connect")}
        </GlassButton>
      </form>
    </AuthLayout>
  );
};

export default LoginPage;
