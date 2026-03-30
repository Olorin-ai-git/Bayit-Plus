/**
 * Register Page
 *
 * Registration is CLI-only; this page directs users accordingly.
 */

import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { GlassCard } from "@olorin/glass-ui/web";
import { AuthLayout } from "../components/layout/AuthLayout";

export const RegisterPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <AuthLayout>
      <div className="text-center space-y-6">
        <h1 className="text-2xl font-bold text-white">
          {t("auth.createYourAccount")}
        </h1>

        <GlassCard>
          <p className="text-white/70 text-sm leading-relaxed">
            {t("auth.cliOnly")}
          </p>
        </GlassCard>

        <Link
          to="/login"
          className="inline-block text-sm text-partner-primary hover:text-partner-primary/80 font-medium transition-colors"
        >
          {t("auth.login")} &rarr;
        </Link>
      </div>
    </AuthLayout>
  );
};

export default RegisterPage;
