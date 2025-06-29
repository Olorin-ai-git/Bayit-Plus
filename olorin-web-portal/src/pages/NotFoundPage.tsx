import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Search, ArrowLeft, AlertTriangle } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-primary-100 to-purple-200 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src={`${process.env.PUBLIC_URL}/assets/images/Olorin-Logo-Wizard-Only-transparent.png`}
            alt="Olorin.ai Wizard Logo" 
            className="h-20 w-auto opacity-75"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `${process.env.PUBLIC_URL}/logo.png`;
            }}
          />
        </div>

        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="bg-primary-100 p-4 rounded-full">
            <AlertTriangle className="h-16 w-16 text-primary-600" />
          </div>
        </div>

        {/* Error Code */}
        <h1 className="text-8xl font-bold text-primary-600 mb-4">404</h1>
        
        {/* Error Title */}
        <h2 className="text-3xl font-bold text-secondary-900 mb-4">
          {t('errors.404.title', 'Page Not Found')}
        </h2>
        
        {/* Error Description */}
        <p className="text-lg text-secondary-600 mb-8 leading-relaxed">
          {t('errors.404.description', 'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.')}
        </p>

        {/* Suggestions */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 mb-8 shadow-lg">
          <h3 className="text-xl font-semibold text-secondary-900 mb-4">
            {t('errors.404.suggestions.title', 'What can you do?')}
          </h3>
          <ul className="text-left space-y-3 text-secondary-700">
            <li className="flex items-start space-x-3">
              <Search className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <span>{t('errors.404.suggestions.check', 'Check the URL for any typos or errors')}</span>
            </li>
            <li className="flex items-start space-x-3">
              <ArrowLeft className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <span>{t('errors.404.suggestions.back', 'Go back to the previous page')}</span>
            </li>
            <li className="flex items-start space-x-3">
              <Home className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
              <span>{t('errors.404.suggestions.home', 'Return to our homepage')}</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center px-6 py-3 border border-primary-600 text-primary-600 font-medium rounded-lg hover:bg-primary-50 transition-colors duration-200"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            {t('errors.404.actions.back', 'Go Back')}
          </button>
          
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors duration-200 shadow-lg"
          >
            <Home className="h-5 w-5 mr-2" />
            {t('errors.404.actions.home', 'Go Home')}
          </Link>
        </div>

        {/* Additional Help */}
        <div className="mt-8 text-sm text-secondary-500">
          <p>
            {t('errors.404.help', 'Need help? Contact our support team at')}{' '}
            <a 
              href="mailto:support@olorin.ai" 
              className="text-primary-600 hover:text-primary-700 underline"
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