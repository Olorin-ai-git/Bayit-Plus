/**
 * Accept Household Invitation Page - Web
 *
 * Handles invitation acceptance from email links.
 * Extracts invitation code from URL query param and accepts invitation.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { acceptHouseholdInvitation, setApiClient } from '../../../shared/services/householdApi';
import { useAuthStore } from '../../../shared/stores/authStore';
import api from '../services/api';

// Initialize API client
setApiClient(api);

export default function AcceptHouseholdInvitationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [householdName, setHouseholdName] = useState('');

  useEffect(() => {
    const acceptInvitation = async () => {
      const code = searchParams.get('code');

      if (!code) {
        setStatus('error');
        setMessage(t('household.invalidInvitationLink'));
        return;
      }

      if (!isAuthenticated) {
        setStatus('error');
        setMessage(t('household.mustBeLoggedIn'));
        return;
      }

      try {
        const household = await acceptHouseholdInvitation(code);
        setStatus('success');
        setHouseholdName(household.name);
        setMessage(t('household.invitationAccepted', { name: household.name }));

        // Redirect to household page after 3 seconds
        setTimeout(() => {
          navigate('/household');
        }, 3000);
      } catch (error: any) {
        setStatus('error');
        const errorMessage = error.response?.data?.detail || error.message;

        if (errorMessage.includes('expired')) {
          setMessage(t('household.invitationExpired'));
        } else if (errorMessage.includes('Invalid')) {
          setMessage(t('household.invalidInvitationCode'));
        } else {
          setMessage(t('household.invitationAcceptFailed'));
        }
      }
    };

    acceptInvitation();
  }, [searchParams, isAuthenticated, navigate, t]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-2xl p-8">
        {/* Loading State */}
        {status === 'loading' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t('household.acceptingInvitation')}
            </h2>
            <p className="text-gray-400">{t('common.pleaseWait')}</p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t('household.success')}
            </h2>
            <p className="text-gray-300 mb-4">{message}</p>
            <p className="text-sm text-gray-400">
              {t('household.redirectingToHousehold')}
            </p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {t('household.error')}
            </h2>
            <p className="text-gray-300 mb-6">{message}</p>
            <div className="space-y-3">
              {!isAuthenticated ? (
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  {t('auth.login')}
                </button>
              ) : (
                <button
                  onClick={() => navigate('/household')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  {t('household.goToHousehold')}
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                {t('common.goHome')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
