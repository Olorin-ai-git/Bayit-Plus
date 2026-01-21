import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Search, ArrowLeft, AlertTriangle } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-corporate-bgPrimary via-corporate-bgSecondary to-corporate-bgPrimary flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img
            src={`${process.env.PUBLIC_URL}/assets/images/Olorin-Logo-Wizard-Only-transparent.png`}
            alt="Olorin.ai Wizard Logo"
            className="h-20 w-auto brightness-110"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `${process.env.PUBLIC_URL}/logo.png`;
            }}
          />
        </div>

        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-corporate-accentPrimary/20 backdrop-blur-sm p-4 rounded-full border border-corporate-accentPrimary/30">
            <AlertTriangle className="h-16 w-16 text-corporate-accentPrimary" />
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-8xl font-bold text-corporate-accentPrimary mb-4">404</h1>

        {/* Error Title */}
        <h2 className="text-3xl font-bold text-corporate-textPrimary mb-4">
          {t('errors.404.title', 'Page Not Found')}
        </h2>

        {/* Error Description */}
        <p className="text-lg text-corporate-textSecondary mb-8 leading-relaxed">
          {t('errors.404.description', 'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.')}
        </p>

        {/* Suggestions */}
        <div className="glass-card p-6 mb-8">
          <h3 className="text-xl font-semibold text-corporate-textPrimary mb-4">
            {t('errors.404.suggestions.title', 'What can you do?')}
          </h3>
          <ul className="text-left space-y-3 text-corporate-textSecondary">
            <li className="flex items-start space-x-3">
              <Search className="h-5 w-5 text-corporate-accentPrimary mt-0.5 flex-shrink-0" />
              <span>{t('errors.404.suggestions.check', 'Check the URL for any typos or errors')}</span>
            </li>
            <li className="flex items-start space-x-3">
              <ArrowLeft className="h-5 w-5 text-corporate-accentPrimary mt-0.5 flex-shrink-0" />
              <span>{t('errors.404.suggestions.back', 'Go back to the previous page')}</span>
            </li>
            <li className="flex items-start space-x-3">
              <Home className="h-5 w-5 text-corporate-accentPrimary mt-0.5 flex-shrink-0" />
              <span>{t('errors.404.suggestions.home', 'Return to our homepage')}</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center px-6 py-3 border-2 border-corporate-accentPrimary text-corporate-accentPrimary font-medium rounded-lg hover:bg-corporate-accentPrimary/10 backdrop-blur-sm transition-all duration-200"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t('errors.404.actions.back', 'Go Back')}
          </button>

          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-corporate-accentPrimary text-white font-medium rounded-lg hover:brightness-110 transition-all duration-200 shadow-lg"
          >
            <Home className="h-5 w-5 mr-2" />
            {t('errors.404.actions.home', 'Go Home')}
          </Link>
        </div>

        {/* Additional Help */}
        <div className="mt-8 text-sm text-corporate-textMuted">
          <p>
            {t('errors.404.help', 'Need help? Contact our support team at')}{' '}
            <a
              href="mailto:support@olorin.ai"
              className="text-corporate-accentPrimary hover:brightness-110 underline transition-all duration-200"
            >
              support@olorin.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage; 