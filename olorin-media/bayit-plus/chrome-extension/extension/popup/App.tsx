/**
 * Main Popup App Component
 *
 * Handles routing and initialization
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from './stores/authStore';
import { useUsageStore } from './stores/usageStore';
import { useSettingsStore } from './stores/settingsStore';
import { OnboardingPage } from './pages/OnboardingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { SubscriptionPage } from './pages/SubscriptionPage';
import { GlassSpinner } from '@bayit/glass';
import { logger } from '../lib/logger';

type Page = 'onboarding' | 'auth' | 'dashboard' | 'settings' | 'subscription';

/**
 * Main App Component
 */
export function App() {
  const { t } = useTranslation();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);

  const authStore = useAuthStore();
  const usageStore = useUsageStore();
  const settingsStore = useSettingsStore();

  /**
   * Initialize app on mount
   */
  useEffect(() => {
    async function initialize() {
      try {
        logger.info('App initializing...');

        // Initialize stores in parallel
        await Promise.all([
          authStore.initialize(),
          settingsStore.initialize(),
        ]);

        // Check if onboarding is needed
        const result = await chrome.storage.local.get('onboarding_completed');
        const onboardingCompleted = result.onboarding_completed === true;

        if (!onboardingCompleted) {
          setCurrentPage('onboarding');
        } else if (!authStore.isAuthenticated) {
          setCurrentPage('auth');
        } else {
          // Initialize usage store (requires auth)
          await usageStore.initialize();

          // Start polling usage
          usageStore.startPolling();

          setCurrentPage('dashboard');
        }

        setIsInitializing(false);
        logger.info('App initialized successfully', {
          page: currentPage,
          authenticated: authStore.isAuthenticated,
        });
      } catch (error) {
        logger.error('Failed to initialize app', { error: String(error) });
        setIsInitializing(false);
      }
    }

    initialize();

    // Cleanup: stop usage polling
    return () => {
      usageStore.stopPolling();
    };
  }, []); // Only run once on mount

  /**
   * Navigate to a different page
   */
  const navigate = (page: Page) => {
    logger.debug('Navigating to page', { page });
    setCurrentPage(page);
  };

  /**
   * Handle onboarding completion
   */
  const handleOnboardingComplete = async () => {
    await chrome.storage.local.set({ onboarding_completed: true });

    if (authStore.isAuthenticated) {
      // Initialize usage store
      await usageStore.initialize();
      usageStore.startPolling();
      navigate('dashboard');
    } else {
      navigate('auth');
    }
  };

  /**
   * Handle successful authentication
   */
  const handleAuthSuccess = async () => {
    // Refresh auth state
    await authStore.refresh();

    // Initialize usage store
    await usageStore.initialize();
    usageStore.startPolling();

    navigate('dashboard');
  };

  /**
   * Render loading state
   */
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center w-full h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center">
          <GlassSpinner size="large" />
          <p className="mt-4 text-white/80 text-sm">
            {t('common.loading')}
          </p>
        </div>
      </div>
    );
  }

  /**
   * Render current page
   */
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      {currentPage === 'onboarding' && (
        <OnboardingPage onComplete={handleOnboardingComplete} />
      )}

      {currentPage === 'auth' && (
        <AuthPage onSuccess={handleAuthSuccess} />
      )}

      {currentPage === 'dashboard' && (
        <DashboardPage
          onNavigateToSettings={() => navigate('settings')}
          onNavigateToSubscription={() => navigate('subscription')}
        />
      )}

      {currentPage === 'settings' && (
        <SettingsPage onBack={() => navigate('dashboard')} />
      )}

      {currentPage === 'subscription' && (
        <SubscriptionPage onBack={() => navigate('dashboard')} />
      )}
    </div>
  );
}
