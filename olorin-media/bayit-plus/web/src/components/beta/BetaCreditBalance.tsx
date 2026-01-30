/**
 * Beta Credit Balance Display for Web
 *
 * Shows user's Beta 500 credit balance with visual progress indicator.
 * Can be placed in header, sidebar, or settings.
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export interface BetaCreditBalanceProps {
  /** API base URL */
  apiBaseUrl?: string;
  /** Variant: compact for header/sidebar, full for settings */
  variant?: 'compact' | 'full';
  /** Auto-refresh interval in ms (default: 30s) */
  refreshInterval?: number;
  /** Callback when balance changes */
  onBalanceChange?: (balance: number) => void;
}

interface CreditBalanceData {
  balance: number;
  total_credits: number;
  status: 'pending_verification' | 'active' | 'expired';
  expires_at?: string;
}

export const BetaCreditBalance: React.FC<BetaCreditBalanceProps> = ({
  apiBaseUrl = '/api/v1',
  variant = 'compact',
  refreshInterval = 30000,
  onBalanceChange,
}) => {
  const { t } = useTranslation();
  const [balance, setBalance] = useState<CreditBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/beta/credits`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          // User not enrolled in Beta
          setBalance(null);
          return;
        }
        throw new Error('Failed to fetch balance');
      }

      const data: CreditBalanceData = await response.json();
      setBalance(data);
      onBalanceChange?.(data.balance);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setBalance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();

    // Auto-refresh
    const interval = setInterval(fetchBalance, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Not enrolled or loading
  if (loading) {
    return (
      <div className={variant === 'compact' ? 'px-3 py-1' : 'p-4'}>
        <div className="animate-pulse">
          <div className="h-4 bg-white/10 rounded w-20"></div>
        </div>
      </div>
    );
  }

  if (error || !balance) {
    return null; // Don't show if not enrolled
  }

  const percentage = (balance.balance / balance.total_credits) * 100;
  const isLow = percentage < 20;
  const isCritical = percentage < 10;

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
        {/* Icon */}
        <div className={`text-lg ${isCritical ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-blue-400'}`}>
          ✨
        </div>

        {/* Credits */}
        <div className="flex items-baseline gap-1">
          <span className={`font-bold ${isCritical ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-white'}`}>
            {balance.balance.toLocaleString()}
          </span>
          <span className="text-xs text-white/60">
            / {balance.total_credits.toLocaleString()}
          </span>
        </div>

        {/* Status indicator */}
        {balance.status === 'active' && (
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className="w-full bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-2xl">✨</span>
            {t('beta.credits.balance')}
          </h3>
          <p className="text-sm text-white/60 mt-1">
            {t('beta.credits.subtitle')}
          </p>
        </div>

        {/* Status Badge */}
        {balance.status === 'active' && (
          <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
            <span className="text-sm font-semibold text-green-300">
              {t('beta.status.active')}
            </span>
          </div>
        )}
        {balance.status === 'pending_verification' && (
          <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
            <span className="text-sm font-semibold text-yellow-300">
              {t('beta.status.pending')}
            </span>
          </div>
        )}
      </div>

      {/* Balance Display */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${isCritical ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-white'}`}>
              {balance.balance.toLocaleString()}
            </span>
            <span className="text-xl text-white/60">
              / {balance.total_credits.toLocaleString()}
            </span>
          </div>
          <span className={`text-lg font-semibold ${isCritical ? 'text-red-400' : isLow ? 'text-yellow-400' : 'text-blue-400'}`}>
            {percentage.toFixed(0)}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isCritical
                ? 'bg-gradient-to-r from-red-500 to-red-600'
                : isLow
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                : 'bg-gradient-to-r from-blue-500 to-purple-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Warnings */}
      {isCritical && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-red-400 font-medium">
            ⚠️ {t('beta.credits.criticalLow')}
          </p>
        </div>
      )}
      {isLow && !isCritical && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-yellow-400 font-medium">
            ⚡ {t('beta.credits.runningLow')}
          </p>
        </div>
      )}

      {/* Expiration */}
      {balance.expires_at && (
        <div className="flex items-center gap-2 text-sm text-white/60">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            {t('beta.credits.expiresOn', {
              date: new Date(balance.expires_at).toLocaleDateString(),
            })}
          </span>
        </div>
      )}

      {/* USD Equivalent */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">{t('beta.credits.usdValue')}:</span>
          <span className="text-white font-semibold">
            ${(balance.balance / 100).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Refresh Button */}
      <button
        onClick={fetchBalance}
        className="mt-4 w-full px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/80 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {t('beta.credits.refresh')}
      </button>
    </div>
  );
};

export default BetaCreditBalance;
