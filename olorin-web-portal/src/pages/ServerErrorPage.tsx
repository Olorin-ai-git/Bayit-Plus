import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, RefreshCw, Mail, AlertCircle, Clock } from 'lucide-react';

const ServerErrorPage: React.FC = () => {
  const { t } = useTranslation();

  const handleRefresh = () => {
    window.location.reload();
  };

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
          <div className="bg-red-500/20 backdrop-blur-sm p-4 rounded-full border border-red-500/30">
            <AlertCircle className="h-16 w-16 text-red-400" />
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-8xl font-bold text-red-400 mb-4">500</h1>

        {/* Error Title */}
        <h2 className="text-3xl font-bold text-corporate-textPrimary mb-4">
          {t('errors.500.title', 'Internal Server Error')}
        </h2>

        {/* Error Description */}
        <p className="text-lg text-corporate-textSecondary mb-8 leading-relaxed">
          {t('errors.500.description', 'Something went wrong on our end. Our AI wizards are working to fix this issue as quickly as possible.')}
        </p>

        {/* Error Details */}
        <div className="glass-card p-6 mb-8">
          <h3 className="text-xl font-semibold text-corporate-textPrimary mb-4">
            {t('errors.500.details.title', 'What happened?')}
          </h3>
          <div className="text-left space-y-3 text-corporate-textSecondary">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <span>{t('errors.500.details.server', 'Our server encountered an unexpected condition')}</span>
            </div>
            <div className="flex items-start space-x-3">
              <Clock className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <span>{t('errors.500.details.temporary', 'This is usually a temporary issue')}</span>
            </div>
            <div className="flex items-start space-x-3">
              <RefreshCw className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
              <span>{t('errors.500.details.team', 'Our technical team has been automatically notified')}</span>
            </div>
          </div>
        </div>

        {/* What to do */}
        <div className="glass-panel p-6 mb-8">
          <h3 className="text-xl font-semibold text-corporate-textPrimary mb-4">
            {t('errors.500.actions.title', 'What can you try?')}
          </h3>
          <ul className="text-left space-y-2 text-corporate-textSecondary">
            <li>• {t('errors.500.actions.refresh', 'Refresh the page in a few minutes')}</li>
            <li>• {t('errors.500.actions.clear', 'Clear your browser cache and cookies')}</li>
            <li>• {t('errors.500.actions.try', 'Try accessing the page from a different browser')}</li>
            <li>• {t('errors.500.actions.contact', 'Contact our support team if the issue persists')}</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleRefresh}
            className="inline-flex items-center justify-center px-6 py-3 border-2 border-corporate-accentPrimary text-corporate-accentPrimary font-medium rounded-lg hover:bg-corporate-accentPrimary/10 backdrop-blur-sm transition-all duration-200"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            {t('errors.500.buttons.refresh', 'Try Again')}
          </button>

          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-corporate-accentPrimary text-white font-medium rounded-lg hover:brightness-110 transition-all duration-200 shadow-lg"
          >
            <Home className="h-5 w-5 mr-2" />
            {t('errors.500.buttons.home', 'Go Home')}
          </Link>
        </div>

        {/* Support Contact */}
        <div className="mt-8 p-4 glass-panel">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <Mail className="h-5 w-5 text-corporate-accentPrimary" />
            <span className="font-medium text-corporate-textPrimary">
              {t('errors.500.support.title', 'Need Immediate Help?')}
            </span>
          </div>
          <p className="text-sm text-corporate-textSecondary">
            {t('errors.500.support.description', 'Contact our technical support team:')}
          </p>
          <div className="mt-2 space-y-1">
            <a
              href="mailto:support@olorin.ai"
              className="block text-corporate-accentPrimary hover:brightness-110 underline text-sm transition-all duration-200"
            >
              support@olorin.ai
            </a>
            <p className="text-xs text-corporate-textMuted">
              {t('errors.500.support.response', 'We typically respond within 24 hours')}
            </p>
          </div>
        </div>

        {/* Error ID (for debugging) */}
        <div className="mt-6 text-xs text-corporate-textMuted">
          <p>
            {t('errors.500.errorId', 'Error ID')}: {Date.now().toString(36).toUpperCase()}
          </p>
          <p>
            {t('errors.500.timestamp', 'Timestamp')}: {new Date().toISOString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServerErrorPage; 