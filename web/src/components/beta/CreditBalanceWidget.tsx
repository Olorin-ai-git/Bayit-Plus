/**
 * Credit Balance Widget - Web Platform
 * 
 * Displays beta user's AI credit balance with real-time updates.
 * Uses TailwindCSS + Glass components.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GlassCard, GlassButton } from '@bayit/glass';
import { useNavigate } from 'react-router-dom';

interface CreditBalanceWidgetProps {
  userId: string;
  className?: string;
}

interface CreditBalance {
  remaining_credits: number;
  total_credits: number;
  used_credits: number;
  is_low: boolean;
  is_critical: boolean;
}

export const CreditBalanceWidget: React.FC<CreditBalanceWidgetProps> = ({
  userId,
  className = ''
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch credit balance
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await fetch(`/api/v1/beta/credits/balance/${userId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch balance');
        }

        const data = await response.json();
        setBalance(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  // Calculate usage percentage
  const usagePercentage = useMemo(() => {
    if (!balance) return 0;
    return (balance.used_credits / balance.total_credits) * 100;
  }, [balance]);

  // Determine status color
  const statusColor = useMemo(() => {
    if (!balance) return 'bg-gray-500';
    if (balance.is_critical) return 'bg-red-500';
    if (balance.is_low) return 'bg-amber-500';
    return 'bg-green-500';
  }, [balance]);

  if (loading) {
    return (
      <GlassCard className={`flex items-center justify-center p-6 ${className}`}>
        <div className="animate-pulse text-white/60">
          {t('beta.credits.loading')}
        </div>
      </GlassCard>
    );
  }

  if (error || !balance) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <div className="text-red-400 text-sm">
          {t('beta.credits.error')}
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard 
      className={`flex flex-col gap-4 p-6 ${className}`}
      role="region"
      aria-label={t('beta.credits.label')}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-white text-sm font-medium">
          {t('beta.credits.label')}
        </span>
        <div className={`w-2 h-2 rounded-full ${statusColor}`} />
      </div>

      {/* Credit Display */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <span 
            className="text-white text-3xl font-bold"
            aria-label={`${balance.remaining_credits} ${t('beta.credits.remaining')}`}
          >
            {balance.remaining_credits.toLocaleString()}
          </span>
          <span className="text-white/60 text-sm">
            / {balance.total_credits.toLocaleString()}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full ${statusColor} transition-all duration-300`}
            style={{ width: `${100 - usagePercentage}%` }}
            role="progressbar"
            aria-valuenow={balance.remaining_credits}
            aria-valuemin={0}
            aria-valuemax={balance.total_credits}
          />
        </div>
      </div>

      {/* Warning States */}
      {balance.is_critical && (
        <div 
          className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg"
          role="alert"
          aria-live="assertive"
        >
          <span className="text-red-300 text-sm font-medium">
            🚨 {t('beta.credits.warningCritical')}
          </span>
        </div>
      )}

      {balance.is_low && !balance.is_critical && (
        <div 
          className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 rounded-lg"
          role="alert"
          aria-live="polite"
        >
          <span className="text-amber-300 text-sm">
            ⚠️ {t('beta.credits.warningLow')}
          </span>
        </div>
      )}

      {/* Upgrade Button (when depleted) */}
      {balance.remaining_credits === 0 && (
        <GlassButton
          variant="primary"
          onClick={() => navigate('/upgrade')}
          className="mt-2 w-full"
          aria-label={t('beta.credits.upgradeAction')}
        >
          {t('beta.credits.upgrade')}
        </GlassButton>
      )}
    </GlassCard>
  );
};
