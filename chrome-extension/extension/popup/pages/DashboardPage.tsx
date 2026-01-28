/**
 * Dashboard Page
 *
 * Main view showing:
 * - Subscription status
 * - Usage meter
 * - Quick actions
 * - Navigation to settings and subscription management
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton, GlassBadge, GlassProgress } from '@bayit/glass';
import { useAuthStore } from '../stores/authStore';
import { useUsageStore } from '../stores/usageStore';
import { useSettingsStore } from '../stores/settingsStore';
import { CONFIG } from '../../config/constants';

interface DashboardPageProps {
  onNavigateToSettings: () => void;
  onNavigateToSubscription: () => void;
}

/**
 * Dashboard Page Component
 */
export function DashboardPage({
  onNavigateToSettings,
  onNavigateToSubscription,
}: DashboardPageProps) {
  const { t } = useTranslation();
  const authStore = useAuthStore();
  const usageStore = useUsageStore();
  const settingsStore = useSettingsStore();

  const { user, isPremium } = authStore;
  const { minutesUsed, minutesTotal, minutesRemaining, usagePercentage, hasQuota } =
    usageStore;

  /**
   * Open supported site in new tab
   */
  const openSite = (url: string) => {
    chrome.tabs.create({ url });
  };

  return (
    <div className="w-full p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {t('dashboard.welcome', 'Welcome back')}
          </h1>
          {user && (
            <p className="text-white/60 text-sm mt-1">{user.email}</p>
          )}
        </div>

        <GlassButton
          variant="ghost"
          onPress={onNavigateToSettings}
          aria-label={t('dashboard.settings', 'Settings')}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </GlassButton>
      </div>

      {/* Subscription Status */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">
              {t('dashboard.subscription', 'Subscription')}
            </h2>
            <p className="text-white/60 text-sm">
              {isPremium
                ? t('subscription.unlimited', 'Unlimited dubbing')
                : t(
                    'subscription.freeTier',
                    '5 minutes per day free'
                  )}
            </p>
          </div>

          <GlassBadge
            variant={isPremium ? 'success' : 'default'}
            aria-label={`Subscription tier: ${user?.subscription_tier || 'free'}`}
          >
            {t(`subscription.tier.${user?.subscription_tier || 'free'}`)}
          </GlassBadge>
        </div>
      </GlassCard>

      {/* Usage Meter (Free Tier Only) */}
      {!isPremium && (
        <GlassCard className="p-4">
          <h3 className="text-sm font-medium text-white/80 mb-3">
            {t('dashboard.usageToday', 'Usage Today')}
          </h3>

          <GlassProgress
            value={minutesUsed}
            max={minutesTotal}
            label={`${minutesUsed.toFixed(1)} / ${minutesTotal} ${t('common.minutes', 'minutes')}`}
            aria-label={`Usage: ${minutesUsed.toFixed(1)} of ${minutesTotal} minutes used`}
          />

          {!hasQuota && (
            <div className="mt-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
              <p className="text-yellow-200 text-sm font-medium mb-2">
                {t('dashboard.quotaExhausted', 'Daily quota exhausted')}
              </p>
              <GlassButton
                variant="primary"
                size="small"
                onPress={onNavigateToSubscription}
                aria-label={t('dashboard.upgradeNow', 'Upgrade to Premium')}
              >
                {t('dashboard.upgradeNow', 'Upgrade to Premium')}
              </GlassButton>
            </div>
          )}

          {hasQuota && usagePercentage >= 80 && (
            <div className="mt-4 p-3 bg-orange-500/20 border border-orange-500/50 rounded-lg">
              <p className="text-orange-200 text-sm">
                {t(
                  'dashboard.quotaWarning',
                  'You have {{minutes}} minutes remaining today',
                  { minutes: minutesRemaining.toFixed(1) }
                )}
              </p>
            </div>
          )}
        </GlassCard>
      )}

      {/* Upgrade CTA (Free Tier Only) */}
      {!isPremium && hasQuota && (
        <GlassCard className="p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="text-white font-bold mb-1">
                {t('dashboard.upgradeToPremium', 'Upgrade to Premium')}
              </h3>
              <p className="text-white/80 text-sm mb-3">
                {t(
                  'dashboard.upgradeBenefits',
                  'Unlimited dubbing, priority support, and more'
                )}
              </p>
              <p className="text-white font-bold text-lg">
                ${CONFIG.QUOTA.PREMIUM_TIER_PRICE_USD}
                <span className="text-white/60 text-sm font-normal">
                  {t('subscription.perMonth', '/month')}
                </span>
              </p>
            </div>
            <GlassButton
              variant="primary"
              onPress={onNavigateToSubscription}
              aria-label={t('dashboard.upgrade', 'Upgrade')}
            >
              {t('dashboard.upgrade', 'Upgrade')}
            </GlassButton>
          </div>
        </GlassCard>
      )}

      {/* Active Features */}
      <GlassCard className="p-4">
        <h3 className="text-sm font-medium text-white/80 mb-3">
          {t('dashboard.activeFeatures', 'Active Features')}
        </h3>

        <div className="space-y-2">
          <FeatureBadge
            enabled={settingsStore.audioDubbing}
            label={t('settings.audioDubbing', 'Audio Dubbing')}
            icon="🎙️"
          />
          <FeatureBadge
            enabled={settingsStore.liveSubtitles}
            label={t('settings.liveSubtitles', 'Live Subtitles')}
            icon="📝"
          />
        </div>
      </GlassCard>

      {/* Quick Actions */}
      <GlassCard className="p-4">
        <h3 className="text-sm font-medium text-white/80 mb-3">
          {t('dashboard.quickActions', 'Quick Actions')}
        </h3>

        <div className="grid grid-cols-3 gap-2">
          <QuickActionButton
            icon="🎬"
            label="Screenil"
            onClick={() => openSite('https://screenil.com')}
          />
          <QuickActionButton
            icon="📺"
            label="Mako"
            onClick={() => openSite('https://mako.co.il')}
          />
          <QuickActionButton
            icon="📡"
            label="13TV"
            onClick={() => openSite('https://13tv.co.il')}
          />
        </div>
      </GlassCard>
    </div>
  );
}

/**
 * Feature Badge Component
 */
function FeatureBadge({
  enabled,
  label,
  icon,
}: {
  enabled: boolean;
  label: string;
  icon: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg ${
        enabled
          ? 'bg-green-500/20 border border-green-500/50'
          : 'bg-white/5 border border-white/10'
      }`}
      role="status"
      aria-label={`${label}: ${enabled ? 'enabled' : 'disabled'}`}
    >
      <span className="text-lg" aria-hidden="true">
        {icon}
      </span>
      <span className={`text-sm ${enabled ? 'text-green-200' : 'text-white/60'}`}>
        {label}
      </span>
      {enabled && (
        <svg
          className="w-4 h-4 text-green-400 ml-auto"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </div>
  );
}

/**
 * Quick Action Button Component
 */
function QuickActionButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 bg-white/5 hover:bg-white/10 backdrop-blur-sm rounded-lg transition-colors"
      aria-label={`Open ${label}`}
    >
      <span className="text-2xl" aria-hidden="true">
        {icon}
      </span>
      <span className="text-white/80 text-xs font-medium">{label}</span>
    </button>
  );
}
