/**
 * Insufficient Credits Modal for Web
 *
 * Shown when user attempts an operation without enough Beta 500 credits.
 * Provides upgrade options and information about the Beta program.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export interface InsufficientCreditsModalProps {
  visible: boolean;
  onClose: () => void;
  requiredCredits: number;
  currentBalance: number;
  featureName: string;
}

export const InsufficientCreditsModal: React.FC<InsufficientCreditsModalProps> = ({
  visible,
  onClose,
  requiredCredits,
  currentBalance,
  featureName,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate('/subscribe');
  };

  const handleViewProfile = () => {
    onClose();
    navigate('/profile');
  };

  if (!visible) return null;

  const deficit = requiredCredits - currentBalance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 border-b border-white/10 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {t('beta.insufficientCredits.title')}
                </h2>
                <p className="text-sm text-red-300 mt-1">
                  {t('beta.insufficientCredits.subtitle')}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Feature Info */}
          <div className="bg-white/5 rounded-xl p-4 border border-white/10">
            <p className="text-white/80 text-sm mb-4">
              {t('beta.insufficientCredits.featureRequires', { feature: featureName })}
            </p>

            <div className="space-y-3">
              {/* Required Credits */}
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">{t('beta.insufficientCredits.required')}:</span>
                <span className="text-white font-semibold text-lg">{requiredCredits} credits</span>
              </div>

              {/* Current Balance */}
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">{t('beta.insufficientCredits.yourBalance')}:</span>
                <span className="text-red-400 font-semibold text-lg">{currentBalance} credits</span>
              </div>

              <div className="h-px bg-white/10 my-3"></div>

              {/* Deficit */}
              <div className="flex items-center justify-between">
                <span className="text-white/60 text-sm">{t('beta.insufficientCredits.needMore')}:</span>
                <span className="text-orange-400 font-bold text-lg">{deficit} credits</span>
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-200">
                <p className="font-semibold mb-1">{t('beta.insufficientCredits.whatAreCredits')}</p>
                <p>{t('beta.insufficientCredits.creditsExplanation')}</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary: Upgrade */}
            <button
              onClick={handleUpgrade}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {t('beta.insufficientCredits.upgradeButton')}
            </button>

            {/* Secondary: View Profile */}
            <button
              onClick={handleViewProfile}
              className="w-full px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-xl transition-colors"
            >
              {t('beta.insufficientCredits.viewProfileButton')}
            </button>

            {/* Tertiary: Close */}
            <button
              onClick={onClose}
              className="w-full px-6 py-3 text-white/60 hover:text-white text-sm transition-colors"
            >
              {t('beta.insufficientCredits.cancelButton')}
            </button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-white/40 text-center">
            {t('beta.insufficientCredits.helpText')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default InsufficientCreditsModal;
